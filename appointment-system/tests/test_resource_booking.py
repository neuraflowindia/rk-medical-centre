"""Neutral v2 contracts and isolated PostgreSQL capacity/payment behavior."""
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import datetime
from uuid import uuid4
import unittest
from appointment_system.settings import BusinessSettings,Installation
from appointment_system.errors import Rejected
from tools.checks.sql_target import literal
from .fixtures import business,installation
from .test_sql_staff import StaffFixture,CLIENT,ORIGIN

def resource_business():
    spec=business();spec.update(version=2,slot_step_minutes=20,meeting='in_person',payment_methods=['online','at_clinic'],
        location={'name':'Test Clinic','address':'Synthetic test address','maps_url':'https://maps.example.test/clinic'},display_duration=False)
    del spec['weekly_windows']
    windows=[{'weekday':day,'start':start,'end':end,'start_grace_minutes':30,'extra_starts':[extra]}
        for day in range(7) for start,end,extra in [('10:00','13:00','13:30'),('18:00','20:00','20:30')] if not(day==6 and start=='18:00')]
    spec['resources']=[{'id':name,'name':'Doctor '+name.title(),'weekly_windows':deepcopy(windows)} for name in ('first','second')]
    base=spec['services'][0];base['duration_minutes']=20;base['pricing']['amount_paise']=80000
    spec['services']=[{**deepcopy(base),'id':name,'resource_id':name} for name in ('first','second')]
    return spec

class ResourceSettings(unittest.TestCase):
    def test_strict_version_and_private_notifications(self):
        spec=resource_business();self.assertEqual(BusinessSettings.parse(spec).document,spec)
        private=installation();private.update(resource_notifications={'first':'one@example.test'},schedule_management=['agency'])
        self.assertEqual(Installation.parse(private).document['schedule_management'],['agency'])
        for key,value in [('payment_methods',[]),('display_duration',0),('location',None),('weekly_windows',[])]:
            bad=deepcopy(spec);bad[key]=value
            with self.subTest(key=key),self.assertRaises(Rejected):BusinessSettings.parse(bad)
        for field,value in [('resource_id','missing'),('extra','wrong')]:
            bad=deepcopy(spec);bad['services'][0][field]=value
            with self.assertRaises(Rejected):BusinessSettings.parse(bad)
    def test_resource_window_boundaries(self):
        for field,value in [('start_grace_minutes',True),('start_grace_minutes',121),('extra_starts',['13:31']),('extra_starts',['13:30','13:30']),('extra_starts',['25:00'])]:
            bad=resource_business();bad['resources'][0]['weekly_windows'][0][field]=value
            with self.subTest(field=field,value=value),self.assertRaises(Rejected):BusinessSettings.parse(bad)
        bad=resource_business();bad['resources'][0]['weekly_windows'].append(deepcopy(bad['resources'][0]['weekly_windows'][0]))
        with self.assertRaises(Rejected):BusinessSettings.parse(bad)

class ResourceFixture(StaffFixture):
    def setUp(self):
        super().setUp();initial=self.db.value('SELECT specification FROM appointment_system.installation WHERE singleton;')
        self.addCleanup(lambda:self.db.sql('UPDATE appointment_system.installation SET specification='+literal(initial)+'::jsonb WHERE singleton;'))
        self.spec=BusinessSettings.parse(resource_business()).document;self.set_policy(self.spec)
        self.starts=self.db.value("SELECT to_jsonb(ARRAY(SELECT s.starts_at::text FROM generate_series(1,9)n CROSS JOIN LATERAL appointment_system.resource_schedule_starts(appointment_system.current_business(),'first',20,(clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date+n,clock_timestamp())s ORDER BY s.starts_at LIMIT 40));")
        self.starts=[datetime.fromisoformat(s).isoformat() for s in self.starts]
    def clinic(self,**changes):
        return self.booking(service_id='first',payment_method='at_clinic',**changes)

class ResourceSQL(ResourceFixture):
    def test_same_doctor_overlap_rejected_different_doctor_concurrent_accepted(self):
        drafts=[self.draft(service_id=resource,payment_method='at_clinic') for resource in ('first','second')]
        with ThreadPoolExecutor(2) as pool:results=list(pool.map(self.reserve,drafts))
        self.assertEqual([r['code'] for r in results],['reserved','reserved'])
        self.assertEqual(self.reserve(self.draft(service_id='first',payment_method='at_clinic'))['code'],'time_unavailable')
        self.assertEqual(self.db.scalar('SELECT count(*) FROM appointment_system.payment_orders;'),'0')
        self.assertEqual(self.db.scalar("SELECT count(*) FROM appointment_system.bookings WHERE state='confirmed' AND hold_expires_at IS NULL;"),'2')
        from appointment_system.backup.database import INVARIANTS
        self.assertTrue(all(v==0 for v in self.db.value(INVARIANTS).values()))
    def test_same_doctor_race_one_winner(self):
        drafts=[self.draft(service_id='first',payment_method='at_clinic') for _ in range(2)]
        with ThreadPoolExecutor(2) as pool:results=list(pool.map(self.reserve,drafts))
        self.assertEqual(sorted(r['code'] for r in results),['reserved','time_unavailable'])
    def test_at_clinic_idempotency_and_receipt_no_order(self):
        draft=self.draft(service_id='first',payment_method='at_clinic');result=self.reserve(draft,account=False)
        self.assertEqual(result['code'],'reserved');self.assertEqual(self.reserve(draft,account=False)['booking_id'],result['booking_id'])
        facts=self.db.value('SELECT appointment_system.booking_receipt_facts(b,clock_timestamp()) FROM appointment_system.bookings b;')
        self.assertEqual((facts['facts_version'],facts['order_state'],facts['payment_state'],facts['amount_due_paise']),(2,'not_required','due_at_clinic',80000))
        self.assertEqual(facts['meeting_state'],'not_created');self.assertIsNone(facts['hold_expires_at'])
        self.assertEqual(self.db.scalar("SELECT count(*) FROM appointment_system.delivery_jobs WHERE recipient_role IN ('resource','agency');"),'2')
        self.assertEqual(self.db.scalar("SELECT count(*) FROM appointment_system.delivery_jobs WHERE recipient_role IN ('calendar','client');"),'0')
    def test_v2_requires_explicit_payment_method(self):
        result=self.reserve(self.draft(service_id='first'));self.assertEqual(result['code'],'upgrade_required')
        self.assertEqual(self.db.scalar('SELECT count(*) FROM appointment_system.bookings;'),'0')
        self.assertEqual(self.reserve(self.draft(service_id='first',payment_method=None))['code'],'invalid_details')
    def test_extra_starts_and_sunday_evening(self):
        day=datetime.fromisoformat(self.starts[0]).astimezone(__import__('zoneinfo').ZoneInfo('Asia/Kolkata')).date().isoformat()
        local=self.db.value("SELECT jsonb_agg(to_char(starts_at AT TIME ZONE 'Asia/Kolkata','HH24:MI')) FROM appointment_system.resource_schedule_starts(appointment_system.current_business(),'first',20,"+literal(day)+"::date,clock_timestamp());")
        self.assertIn('13:20',local);self.assertIn('13:30',local)
        sunday=self.db.value("SELECT to_jsonb(ARRAY(SELECT to_char(s.starts_at AT TIME ZONE 'Asia/Kolkata','HH24:MI') FROM generate_series(1,7)n CROSS JOIN LATERAL appointment_system.resource_schedule_starts(appointment_system.current_business(),'first',20,(clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date+n,clock_timestamp())s WHERE extract(isodow FROM s.starts_at AT TIME ZONE 'Asia/Kolkata')=7));")
        self.assertTrue(sunday);self.assertTrue(all(v<'14:00' for v in sunday))
        first=self.db.scalar("SELECT starts_at::text FROM appointment_system.resource_schedule_starts(appointment_system.current_business(),'first',20,"+literal(day)+"::date,clock_timestamp()) WHERE to_char(starts_at AT TIME ZONE 'Asia/Kolkata','HH24:MI')='13:20';")
        second=self.db.scalar("SELECT starts_at::text FROM appointment_system.resource_schedule_starts(appointment_system.current_business(),'first',20,"+literal(day)+"::date,clock_timestamp()) WHERE to_char(starts_at AT TIME ZONE 'Asia/Kolkata','HH24:MI')='13:30';")
        first=datetime.fromisoformat(first).isoformat();second=datetime.fromisoformat(second).isoformat()
        self.clinic(start=first);self.assertEqual(self.reserve(self.draft(start=second,service_id='first',payment_method='at_clinic'))['code'],'time_unavailable')
    def test_closure_resource_isolation_and_explicit_all(self):
        start=datetime.fromisoformat(self.starts[0]);end=start+__import__('datetime').timedelta(minutes=20)
        def close(resource,operation=None):
            args=[self.session,CLIENT,ORIGIN,str(operation or uuid4()),'Synthetic closure',start.isoformat(),end.isoformat(),resource]
            return self.db.value('SELECT appointment_system.studio_calendar_close_resource('+','.join(literal(x) for x in args)+');',role='abs_staff')
        op=uuid4();self.assertEqual(close('first',op)['code'],'closed');self.assertTrue(close('first',op)['active'])
        closed=close('first',op);self.assertEqual(closed['code'],'existing')
        self.assertTrue(closed['active'])
        self.assertEqual(self.reserve(self.draft(service_id='first',payment_method='at_clinic'))['code'],'time_unavailable')
        self.assertEqual(self.reserve(self.draft(service_id='second',payment_method='at_clinic'))['code'],'reserved')
        self.assertEqual(close('*')['code'],'time_already_reserved')
        self.assertEqual(self.db.scalar('SELECT count(*) FROM appointment_system.slot_claims WHERE released_at IS NULL;'),'2')
        reopened=self.staff.studio_calendar_reopen(self.session,CLIENT,ORIGIN,uuid4(),__import__('uuid').UUID(closed['claim_ids'][0]),'Synthetic reopening')
        self.assertEqual(reopened['code'],'reopened');self.assertFalse(close('first',op)['active'])
    def test_cancel_and_reschedule_keep_resource_unpaid(self):
        booking=self.clinic();booking['claim']=self.db.scalar('SELECT id::text FROM appointment_system.slot_claims WHERE booking_id='+literal(booking['booking'])+';')
        result=self.move(booking,self.starts[2]);self.assertEqual(result['code'],'rescheduled')
        result=self.staff.studio_appointment_cancel(self.session,CLIENT,ORIGIN,uuid4(),booking['claim'],2,'Synthetic cancellation')
        self.assertEqual(result['code'],'cancelled');self.assertEqual(result['policy_guidance'],'no_payment_received')
        facts=self.db.value('SELECT appointment_system.booking_receipt_facts(b,clock_timestamp()) FROM appointment_system.bookings b;')
        self.assertEqual(facts['resource_id'],'first');self.assertEqual(facts['amount_due_paise'],0)
        rows=self.db.value("SELECT jsonb_agg(payload) FROM appointment_system.delivery_jobs WHERE kind='sheet_booking' AND booking_revision=3;")
        self.assertEqual(len(rows),2);self.assertTrue(all(r['amount_due_paise']==0 and r['location']==self.spec['location'] for r in rows))
        self.assertEqual(self.db.scalar('SELECT count(*) FROM appointment_system.payment_cases;'),'0')
    def test_online_capture_retained_without_meet(self):
        booking=self.booking(service_id='first',payment_method='online')
        self.assertEqual(self.start_order(booking),'t');self.assertEqual(self.record_order(booking),'ready')
        self.assertEqual(self.capture(booking,amount=80000),'confirmed')
        self.assertEqual(self.db.scalar("SELECT count(*) FROM appointment_system.delivery_jobs WHERE kind='booking_calendar';"),'0')
    def test_at_clinic_does_not_require_online_merchant_readiness(self):
        self.db.sql("UPDATE appointment_system.intake_settings SET public_open=false,merchant_id=NULL,payment_mode=NULL,credential_version=NULL;")
        self.assertEqual(self.reserve(self.draft(service_id='first',payment_method='at_clinic'),account=False)['code'],'reserved')
        self.assertEqual(self.reserve(self.draft(service_id='second',payment_method='online'),account=False)['code'],'payment_not_configured')
    def test_database_validator_matches_resource_settings(self):
        self.assertEqual(self.db.scalar('SELECT appointment_system.validate_business('+literal(self.spec)+'::jsonb);'),'t')
        for field,value in [('extra_starts',['13:31']),('start_grace_minutes',True)]:
            bad=deepcopy(self.spec);bad['resources'][0]['weekly_windows'][0][field]=value
            self.assertEqual(self.db.scalar('SELECT appointment_system.validate_business('+literal(bad)+'::jsonb);'),'f')
        bad=deepcopy(self.spec);del bad['services'][0]['resource_id']
        self.assertEqual(self.db.scalar('SELECT appointment_system.validate_business('+literal(bad)+'::jsonb);'),'f')
    def test_v2_lookup_summary_and_details_omit_no_duration_metadata(self):
        saved=self.clinic();epoch=self.db.scalar('SELECT activation_epoch::text FROM appointment_system.checkout_contexts LIMIT 1;')
        args=['Synthetic Customer','+919876543210',epoch,None,None,None,None,None]
        result=self.db.value('SELECT appointment_system.booking_details('+','.join(literal(x) for x in args)+');',role='appointment_system_web')
        item=result['items'][0];self.assertEqual(item['facts_version'],2);self.assertFalse(item['display_duration']);self.assertEqual(item['resource_id'],'first')
        args[3]=saved['request'];result=self.db.value('SELECT appointment_system.booking_details('+','.join(literal(x) for x in args)+');',role='appointment_system_web')
        self.assertEqual(result['booking']['payment_method'],'at_clinic')
    def test_notification_destinations_are_private_and_role_scoped(self):
        self.db.sql("UPDATE appointment_system.installation SET specification=specification||"+literal({'resource_notifications':{'first':'doctor-one@example.test','second':'doctor-two@example.test'}})+'::jsonb;')
        self.clinic()
        jobs=[self.db.value('SELECT appointment_system.entry_claim_email_delivery();') for _ in range(3)]
        byrole={j['recipient_role']:j for j in jobs};self.assertEqual(set(byrole),{'customer','resource','agency'})
        self.assertEqual(byrole['resource']['destination'],'doctor-one@example.test');self.assertEqual(byrole['agency']['destination'],installation()['owners']['agency_email'])
        for job in jobs:
            self.assertEqual(job['payload']['facts_version'],2);self.assertEqual(job['payload']['amount_due_paise'],80000)
            self.assertFalse(job['payload']['display_duration']);self.assertEqual(job['payload']['meeting'],'in_person')
        public=self.db.value('SELECT appointment_system.entry_public_policy();')
        self.assertNotIn('resource_notifications',public['policy'])
    def test_agency_calendar_permission_is_explicit_and_correction_stays_denied(self):
        session=uuid4().hex*2
        self.db.sql("INSERT INTO appointment_system.studio_identities(role,subject) VALUES('agency','987654321') ON CONFLICT(role) DO UPDATE SET subject=excluded.subject; INSERT INTO appointment_system.studio_sessions(digest,role,subject,client_id,origin,expires_at) VALUES("+literal(session)+",'agency','987654321',"+literal(CLIENT)+','+literal(ORIGIN)+",clock_timestamp()+interval '1 hour');")
        args=','.join(literal(x) for x in (session,CLIENT,ORIGIN))
        self.db.sql("UPDATE appointment_system.installation SET specification=specification-'schedule_management';")
        self.assertIsNone(self.db.value('SELECT to_jsonb(appointment_system.studio_calendar_actor('+args+'));'))
        self.db.sql("UPDATE appointment_system.installation SET specification=specification||'{\"schedule_management\":[\"agency\"]}'::jsonb;")
        self.assertTrue(self.db.scalar('SELECT appointment_system.studio_calendar_actor('+args+');').startswith('agency:'))
        self.clinic()
        result=self.staff.studio_support_change(session,CLIENT,ORIGIN,uuid4(),uuid4(),1,'contact_correction','Synthetic correction',None,None,'+919123456789')
        self.assertEqual(result['code'],'access_unavailable')
    def test_client_contact_correction_needs_no_fabricated_payment(self):
        booking=self.clinic()
        result=self.staff.studio_support_change(self.session,CLIENT,ORIGIN,uuid4(),__import__('uuid').UUID(booking['request']),1,'contact_correction','Synthetic correction',None,'corrected@example.test','+919123456789')
        self.assertEqual(result['code'],'contact_corrected')
        self.assertEqual(self.db.scalar("SELECT verification_method FROM appointment_system.receipt_recoveries WHERE request_id="+literal(booking['request'])+';'),'staff_confirmed_clinic_booking')


    def test_private_v2_installation_fields_are_accepted_by_database(self):
        declared=installation();declared['database_targets']['web']['role']='appointment_system_web'
        declared.update(resource_notifications={'first':'first@example.test','second':'second@example.test'},schedule_management=['agency'])
        result=self.db.value('BEGIN;TRUNCATE appointment_system.installation CASCADE;SELECT appointment_system.configure_installation('+literal(declared)+'::jsonb,'+literal(self.spec)+'::jsonb,false);ROLLBACK;')
        self.assertEqual(result['installation_id'],declared['installation_id'])
    def test_client_lookup_declares_offline_payment_and_agency_cannot_use_lookup(self):
        saved=self.clinic();result=self.staff.studio_booking_lookup(self.session,CLIENT,ORIGIN,__import__('uuid').UUID(saved['request']))
        self.assertEqual(result['payment_method'],'at_clinic');self.assertEqual(result['resource_id'],'first')



    def test_staff_time_context_declares_resources_only_for_v2(self):
        result=self.staff.studio_time_context(self.session,CLIENT,ORIGIN)
        self.assertEqual(result['policy_version'],2)
        self.assertEqual(result['resources'],[{'id':'first','name':'Doctor First'},{'id':'second','name':'Doctor Second'}])
        self.set_policy(BusinessSettings.parse(business()).document)
        result=self.staff.studio_time_context(self.session,CLIENT,ORIGIN)
        self.assertEqual(set(result),{'code','timezone','today'})


class ResourceSettingsBoundaries(unittest.TestCase):
    def test_rejects_each_resource_and_location_boundary(self):
        changes=[('resources',[]),('resources',{}),('payment_methods',['cash']),('payment_methods',['online','online']),
            ('meeting','video'),('location',{'name':'A','address':'B','maps_url':'http://example.test'}),
            ('location',{'name':'A','address':'B','maps_url':'https://example.test:444'}),
            ('location',{'name':'A','address':'B','maps_url':'https://user@example.test'}),
            ('location',{'name':'A','address':'B','maps_url':'https://example.test:bad'}),
            ('location',{'name':'A','address':'B','maps_url':'https://['}),('services',{}),('services',[])]
        for field,value in changes:
            data=resource_business();data[field]=value
            with self.subTest(field=field,value=value),self.assertRaises(Rejected):BusinessSettings.parse(data)
        for field,value in [('id','default'),('id','invalid_id'),('name',''),('weekly_windows',[]),('weekly_windows',{})]:
            data=resource_business();data['resources'][0][field]=value
            with self.subTest(field=field,value=value),self.assertRaises(Rejected):BusinessSettings.parse(data)
        data=resource_business();data['resources'][1]['id']='first'
        with self.assertRaises(Rejected):BusinessSettings.parse(data)
        data=resource_business();data['meeting']='internal'
        with self.assertRaises(Rejected):BusinessSettings.parse(data)
        data['payment_methods']=['online']
        with self.assertRaises(Rejected):BusinessSettings.parse(data)
        data['location']=None;self.assertIsNone(BusinessSettings.parse(data).document['location'])
        for field,value in [('start','14:00'),('end','24:00')]:
            data=resource_business();data['resources'][0]['weekly_windows'][0][field]=value
            with self.assertRaises(Rejected):BusinessSettings.parse(data)
    def test_private_map_and_management_are_exact_and_optional(self):
        for field,value in [('resource_notifications',[]),('resource_notifications',{'first':'UPPER@example.test'}),('resource_notifications',{'invalid_id':'a@example.test'}),('schedule_management',[]),('schedule_management',['doctor']),('schedule_management',['agency','agency'])]:
            data=installation();data[field]=value
            with self.subTest(field=field,value=value),self.assertRaises(Rejected):Installation.parse(data)

from .test_sql_company import CompanyFixture
from .test_sql_booking import BookingFixture
from .test_sql_business_settings import BusinessSettingsSQL

class ResourceCutoverSQL(CompanyFixture,BookingFixture):
    settings=BusinessSettingsSQL.settings
    save=BusinessSettingsSQL.save
    def setUp(self):
        BookingFixture.setUp(self);CompanyFixture.setUp(self)
        self.db.scalar("SELECT appointment_system.provision_login('appointment_system_web','web');")
    def enable_resources(self):
        self.spec=BusinessSettings.parse(resource_business()).document
        result=self.save(self.spec);self.version=result['quote_version']
    def test_existing_default_claim_blocks_resource_cutover(self):
        self.booking()
        with self.assertRaisesRegex(AssertionError,'existing default claims'):self.save(resource_business())
    def test_existing_resource_claim_blocks_downgrade(self):
        self.enable_resources();self.booking(service_id='first',payment_method='at_clinic')
        with self.assertRaisesRegex(AssertionError,'existing resource claims'):self.save(business())
    def test_existing_resource_claim_blocks_removing_doctor(self):
        self.enable_resources();self.booking(service_id='first',payment_method='at_clinic')
        changed=deepcopy(self.spec);changed['resources']=changed['resources'][1:];changed['services']=changed['services'][1:]
        with self.assertRaisesRegex(AssertionError,'active claims cannot be removed'):self.save(changed)
    def test_renaming_or_adding_resource_does_not_change_existing_booking(self):
        self.enable_resources();self.booking(service_id='first',payment_method='at_clinic')
        changed=deepcopy(self.spec);changed['resources'][0]['name']='New display name'
        third=deepcopy(changed['resources'][0]);third.update(id='third',name='Third resource');changed['resources'].append(third)
        self.save(changed)
        self.assertEqual(self.db.scalar("SELECT service_snapshot->>'resource_name' FROM appointment_system.bookings;"),'Doctor First')
    def test_empty_capacity_allows_explicit_version_change(self):
        self.enable_resources();self.assertTrue(self.save(business())['saved'])
