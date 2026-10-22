"""Committed isolated two-doctor calendars: journal, authority and recovery."""
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from uuid import uuid4
from datetime import datetime
from appointment_system.google_oauth import RESOURCE_SCOPES, FILE_SCOPE
from appointment_system.google_workspace import event_id
from appointment_system.company_auth import password_hash
from appointment_system.serialization import fingerprint
from tools.checks.sql_target import literal
from .test_resource_booking import ResourceFixture, resource_business
from .test_sql_staff import CLIENT, ORIGIN
from .test_sql_company import CompanyFixture
from .sql_store import IsolatedStore
from .test_google_resources import WEB
from .test_in_person_calendar import CALENDARS

class PrivateCalendarSQL(ResourceFixture):
    def setUp(self):
        super().setUp()
        self.spec['appointment_changes']='staff_discretion';self.set_policy(self.spec)
        self.db.sql('TRUNCATE appointment_system.google_workbooks,appointment_system.google_resources,appointment_system.google_resource_grants CASCADE;')
        self.db.scalar("SELECT appointment_system.provision_login('abs_worker','worker');")
        # Fixture bootstrap supplies previously approved doctor notification facts.
        self.db.sql('UPDATE appointment_system.installation SET specification=specification||'+literal({'resource_notifications':CALENDARS})+'::jsonb;')
        self.before=self.db.value('SELECT specification FROM appointment_system.installation WHERE singleton;')
        self.db.sql('UPDATE appointment_system.control_product_state SET enabled=false,requested_enabled=false;')
        self.apply_map(CALENDARS)
        self.db.sql('UPDATE appointment_system.control_product_state SET enabled=true,requested_enabled=true;')
        self.worker=IsolatedStore(self.db,'abs_worker')
    def apply_map(self,mapping,expected=None,role='postgres'):
        expected=expected or self.db.scalar('SELECT appointment_system.settings_digest(specification) FROM appointment_system.installation WHERE singleton;')
        return self.db.value('SELECT appointment_system.configure_resource_calendars('+literal(expected)+','+literal(mapping)+'::jsonb);',role=role)
    def calendar_jobs(self):
        return self.db.value("SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY booking_revision,kind),'[]'::jsonb) FROM appointment_system.delivery_jobs d WHERE recipient_role='calendar';")
    def config(self):
        metadata={'calendar_'+r:dict(owner_email=e,active_client=WEB,retained_clients=[WEB]) for r,e in CALENDARS.items()}
        self.assertEqual(self.db.scalar('SELECT appointment_system.configure_google_resources('+literal(metadata)+'::jsonb);'),'t')
        return metadata
    def grant(self,resource='calendar_first',owner=None,scopes=None,expected=0):
        owner=owner or CALENDARS[resource[9:]];identifier=str(uuid4())
        args=[resource,expected,identifier,'synthetic-'+resource,owner,WEB]
        value=self.db.scalar('SELECT appointment_system.install_resource_grant('+','.join(literal(a) for a in args)+
            ',ARRAY['+literal(resource)+']::text[],'+literal(scopes or sorted(RESOURCE_SCOPES['calendar']))+'::jsonb,'+
            literal('synthetic-encrypted-grant'*10)+",NULL,'v1');")
        return identifier,value=='t'
    def claim(self):return self.worker.claim_google_delivery('calendar')
    def finish_calendar(self,job,state='done',meet=None):
        return self.worker.finish_google_delivery(job,state,event_id(job['booking_id'],job['booking_revision']) if state=='done' and job['kind']=='booking_calendar' else None,meet,None,15)
    def claimed_clinic(self):
        saved=self.clinic();saved['claim']=self.db.scalar('SELECT id::text FROM appointment_system.slot_claims WHERE booking_id='+literal(saved['booking'])+';')
        return saved
    def test_private_map_cutover_is_owner_only_closed_and_expected_profile_bound(self):
        for flags in ('enabled=true,requested_enabled=false','enabled=false,requested_enabled=true'):
            self.db.sql('UPDATE appointment_system.control_product_state SET '+flags+';')
            with self.assertRaisesRegex(AssertionError,'booking must be closed'):self.apply_map(CALENDARS)
        self.db.sql('UPDATE appointment_system.control_product_state SET enabled=false,requested_enabled=false;')
        with self.assertRaisesRegex(AssertionError,'installation changed'):self.apply_map(CALENDARS,expected='f'*64)
        for role in ('appointment_system_web','abs_worker','abs_staff','abs_company'):
            with self.assertRaisesRegex(AssertionError,'permission denied'):self.apply_map(CALENDARS,role=role)
        result=self.apply_map(CALENDARS);self.assertEqual(result['profile_digest'],fingerprint(self.before|{'resource_calendars':CALENDARS}))
        self.assertEqual(self.db.value('SELECT specification-\'resource_calendars\' FROM appointment_system.installation WHERE singleton;'),self.before)
    def test_mapping_cannot_change_remove_misroute_or_downgrade_current_business(self):
        self.db.sql('UPDATE appointment_system.control_product_state SET enabled=false,requested_enabled=false;')
        for mapping in ({},None,{'first':CALENDARS['second']},{'unknown':CALENDARS['first']}, {'first':CALENDARS['first']}):
            with self.subTest(mapping=mapping),self.assertRaisesRegex(AssertionError,'calendar mappings'):self.apply_map(mapping)
        for spec in (self.spec|{'meeting':'google_meet'},self.spec|{'resources':self.spec['resources'][:1]}):
            self.assertEqual(self.db.scalar('SELECT appointment_system.resource_calendar_map_valid('+literal(self.before|{'resource_calendars':CALENDARS})+'::jsonb,'+literal(spec)+'::jsonb);'),'f')
        with self.assertRaisesRegex(AssertionError,'identity cannot be replaced'):
            self.db.value('SELECT appointment_system.configure_installation('+literal(self.before)+'::jsonb,'+literal(self.spec)+'::jsonb,false);')
    def test_first_map_backfills_confirmed_visits_and_append_preserves_existing_grant_and_job(self):
        # Reconstruct only the synthetic pre-040 installation state.
        self.db.sql("UPDATE appointment_system.installation SET specification=specification-'resource_calendars';")
        saved=self.clinic();self.assertEqual(self.calendar_jobs(),[])
        self.db.sql('UPDATE appointment_system.control_product_state SET enabled=false,requested_enabled=false;')
        first={'first':CALENDARS['first']};self.apply_map(first)
        jobs=self.calendar_jobs();self.assertEqual(len(jobs),1);self.assertEqual(jobs[0]['booking_id'],saved['booking'])
        metadata={'calendar_first':dict(owner_email=CALENDARS['first'],active_client=WEB,retained_clients=[WEB])}
        self.db.scalar('SELECT appointment_system.configure_google_resources('+literal(metadata)+'::jsonb);')
        identifier,ok=self.grant();self.assertTrue(ok)
        grant=self.db.value('SELECT to_jsonb(g) FROM appointment_system.google_resource_grants g WHERE id='+literal(identifier)+';')
        self.apply_map(CALENDARS);self.apply_map(CALENDARS)
        self.assertEqual([row['id'] for row in self.calendar_jobs()],[jobs[0]['id']])
        self.assertEqual(self.db.value('SELECT to_jsonb(g) FROM appointment_system.google_resource_grants g WHERE id='+literal(identifier)+';'),grant)
        self.assertEqual(self.db.scalar("SELECT grant_id::text FROM appointment_system.google_resources WHERE resource='calendar_first';"),identifier)

    def test_in_person_records_copy_can_complete_when_optional_calendar_map_is_absent(self):
        self.db.sql("UPDATE appointment_system.installation SET specification=specification-'resource_calendars';")
        self.clinic();self.assertEqual(self.calendar_jobs(),[])
        job=self.worker.claim_google_delivery('client_sheet');self.assertEqual(job['kind'],'sheet_booking')
        self.assertTrue(self.worker.finish_google_delivery(job,'done','synthetic-sheet',None,None,15))
        self.assertEqual(self.db.scalar('SELECT count(*) FROM appointment_system.meeting_events;'),'0')

    def test_calendar_owners_scopes_and_staff_refresh_are_separate(self):
        metadata=self.config();one,ok=self.grant();self.assertTrue(ok);two,ok=self.grant('calendar_second');self.assertTrue(ok)
        self.assertEqual(self.db.scalar('SELECT count(*) FROM appointment_system.google_resource_grants;'),'2')
        for resource in ('first','second'):
            row=self.db.value('SELECT to_jsonb(g) FROM appointment_system.google_resource_grants g WHERE id='+literal(one if resource=='first' else two)+';')
            self.assertEqual(row['owner_role'],'doctor-'+resource)
            self.assertEqual(row['resources'],['calendar_'+resource]);self.assertEqual(row['owner_email'],CALENDARS[resource])
            with self.assertRaisesRegex(AssertionError,'resource access denied'):self.staff.claim_google_resource_refresh('calendar_'+resource)
        saved=self.worker.claim_google_resource_refresh('calendar_first');self.assertEqual(saved['grant_id'],one)
        self.assertTrue(self.worker.finish_google_resource_refresh(saved,'synthetic-new-encrypted-grant'*10,None,saved['scopes'],None))
        self.assertIsNotNone(self.worker.claim_google_resource_refresh('calendar_second'))
        changed=deepcopy(metadata);changed['calendar_first']['owner_email']=CALENDARS['second']
        with self.assertRaisesRegex(AssertionError,'resource configuration invalid'):self.db.value('SELECT appointment_system.configure_google_resources('+literal(changed)+'::jsonb);')
        self.assertEqual(self.db.scalar('SELECT count(*) FROM appointment_system.studio_identities WHERE role NOT IN (\'client\',\'agency\');'),'0')
    def test_wrong_owner_widened_scopes_and_expired_refresh_do_not_install(self):
        self.config()
        for change in ({'owner':CALENDARS['second']},{'scopes':sorted(RESOURCE_SCOPES['calendar']|{FILE_SCOPE})}):
            self.assertFalse(self.grant(**change)[1])
        identifier,ok=self.grant();self.assertTrue(ok)
        saved=self.worker.claim_google_resource_refresh('calendar_first')
        self.assertFalse(self.worker.finish_google_resource_refresh(saved,'replacement'*20,None,sorted(RESOURCE_SCOPES['calendar']|{FILE_SCOPE}),None))
        self.assertTrue(self.worker.finish_google_resource_refresh(saved,None,None,None,'google_reconnect_required'))
        self.assertEqual(self.worker.claim_google_resource_refresh('calendar_first'),{'code':'google_reconnect_required'})
        self.assertEqual(self.db.scalar('SELECT id::text FROM appointment_system.google_resource_grants;'),identifier)
    def test_same_time_two_doctors_create_two_frozen_jobs_without_meet_or_extra_mail(self):
        drafts=[self.draft(service_id=r,payment_method='at_clinic') for r in ('first','second')]
        with ThreadPoolExecutor(2) as pool:results=list(pool.map(self.reserve,drafts))
        self.assertEqual([r['code'] for r in results],['reserved','reserved'])
        jobs=self.calendar_jobs();self.assertEqual(len(jobs),2)
        self.assertEqual({j['payload']['resource_id'] for j in jobs},{'first','second'})
        self.assertTrue(all(j['payload']['id']==j['booking_id'] and j['payload']['revision']==1 for j in jobs))
        for _ in jobs:
            job=self.claim();self.assertEqual(job['kind'],'booking_calendar');self.assertTrue(self.finish_calendar(job))
        self.assertEqual(self.db.scalar('SELECT count(*) FROM appointment_system.meeting_events;'),'0')
        self.assertEqual(self.db.scalar("SELECT count(*) FROM appointment_system.delivery_jobs WHERE kind='booking_details' OR event_key='meeting-ready';"),'0')
        from appointment_system.backup.database import INVARIANTS
        self.assertTrue(all(n==0 for n in self.db.value(INVARIANTS).values()))
    def test_online_payment_confirmation_also_enqueues_calendar_only_after_capture(self):
        saved=self.booking(service_id='first',payment_method='online');self.assertEqual(self.calendar_jobs(),[])
        self.assertEqual(self.start_order(saved),'t');self.assertEqual(self.record_order(saved),'ready')
        self.assertEqual(self.capture(saved,amount=80000),'confirmed');self.assertEqual(len(self.calendar_jobs()),1)
        self.assertTrue(self.finish_calendar(self.claim()));self.assertEqual(self.db.scalar('SELECT count(*) FROM appointment_system.meeting_events;'),'0')
    def test_move_keeps_old_snapshot_and_cancel_cleans_the_matching_revisions(self):
        saved=self.claimed_clinic();old=deepcopy(self.calendar_jobs()[0]['payload'])
        self.assertTrue(self.finish_calendar(self.claim()))
        result=self.move(saved,self.starts[2]);self.assertEqual(result['code'],'rescheduled')
        jobs=self.calendar_jobs();self.assertEqual([(j['booking_revision'],j['kind']) for j in jobs],[(1,'booking_calendar'),(1,'booking_cancelled'),(2,'booking_calendar')])
        self.assertEqual(jobs[1]['payload'],old);self.assertEqual(jobs[2]['payload']['starts_at'],self.db.value('SELECT to_jsonb(starts_at) FROM appointment_system.bookings;'))
        for _ in range(2):self.assertTrue(self.finish_calendar(self.claim()))
        result=self.staff.studio_appointment_cancel(self.session,CLIENT,ORIGIN,uuid4(),saved['claim'],2,'Synthetic doctor cancellation')
        self.assertEqual(result['code'],'cancelled');self.assertEqual(self.calendar_jobs()[-1]['kind'],'booking_cancelled')
        self.assertTrue(self.finish_calendar(self.claim()))
        self.assertEqual(self.db.scalar('SELECT count(*) FROM appointment_system.meeting_events;'),'0')
    def test_past_appointment_staff_correction_keeps_required_reason_and_history(self):
        saved=self.claimed_clinic();self.assertTrue(self.finish_calendar(self.claim()))
        self.db.sql("UPDATE appointment_system.bookings SET starts_at=clock_timestamp()-interval '2 days',ends_at=clock_timestamp()-interval '2 days'+interval '20 minutes' WHERE id="+literal(saved['booking'])+';')
        self.db.sql('UPDATE appointment_system.slot_claims SET starts_at=(SELECT starts_at FROM appointment_system.bookings),ends_at=(SELECT ends_at FROM appointment_system.bookings);')
        result=self.staff.studio_appointment_cancel(self.session,CLIENT,ORIGIN,uuid4(),saved['claim'],1,'Synthetic past correction')
        self.assertEqual(result['code'],'cancelled');self.assertEqual(len(self.calendar_jobs()),2)
        self.assertEqual(self.db.scalar('SELECT reason FROM appointment_system.staff_appointment_actions;'),'Synthetic past correction')
    def test_late_create_after_cleanup_requeues_durable_delete_and_stale_finish_cannot_win(self):
        saved=self.claimed_clinic();create=self.claim()
        result=self.staff.studio_appointment_cancel(self.session,CLIENT,ORIGIN,uuid4(),saved['claim'],1,'Synthetic late writer')
        self.assertEqual(result['code'],'cancelled')
        cleanup=self.claim();self.assertEqual(cleanup['kind'],'booking_cancelled');self.assertTrue(self.finish_calendar(cleanup))
        self.assertTrue(self.finish_calendar(create))
        with self.assertRaisesRegex(AssertionError,'job claim changed'):self.finish_calendar(create)
        again=self.claim();self.assertEqual(again['id'],cleanup['id']);self.assertTrue(self.finish_calendar(again))
        self.assertEqual(self.db.scalar('SELECT count(*) FROM appointment_system.meeting_events;'),'0')
        self.assertEqual(self.db.scalar("SELECT state FROM appointment_system.delivery_jobs WHERE id="+literal(create['id'])+';'),'suppressed')
    def test_in_person_finish_refuses_video_url_and_waiting_without_consuming_lease(self):
        self.clinic();job=self.claim()
        self.assertFalse(self.finish_calendar(job,meet='https://meet.google.com/abc-defg-hij'))
        self.assertFalse(self.worker.finish_google_delivery(job,'waiting',event_id(job['booking_id'],1),None,None,15))
        changed=job|{'lease_token':str(uuid4())}
        with self.assertRaisesRegex(AssertionError,'job claim changed'):self.finish_calendar(changed)
        self.assertTrue(self.finish_calendar(job))
    def test_reconnect_stays_company_only_and_owner_link_repair_is_closed_for_doctors(self):
        self.config()
        # Company credentials are synthetic and prepared before the map-bearing fixture;
        # the actual start/consume/stage/finish functions remain the production functions.
        declared=self.db.value('SELECT specification FROM appointment_system.installation WHERE singleton;')
        company=CompanyFixture();company.db=self.db;company.declared=declared
        company.hash=password_hash('Synthetic company password for tests')
        self.db.sql('TRUNCATE appointment_system.company_login_attempts CASCADE;TRUNCATE appointment_system.control_company_sessions;')
        self.db.scalar("SELECT appointment_system.provision_company_password('company.owner',"+literal(company.hash)+');')
        company.token=uuid4().hex*2;company.csrf=uuid4().hex*2
        self.assertTrue(company.finish(company.begin(),True))
        actor=IsolatedStore(self.db,'abs_company');attempt,grant=uuid4(),uuid4();state,browser=uuid4().hex*2,uuid4().hex*2
        context=actor._call('SELECT appointment_system.start_resource_consent(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)',
            ('company',company.token,company.csrf,WEB,attempt,'calendar_first',state,browser,'encrypted-attempt'*20,grant,WEB))
        self.assertIsNotNone(context)
        consumed=actor._call('SELECT appointment_system.consume_resource_consent(%s,%s,%s)',('company',state,browser));self.assertEqual(consumed['resource'],'calendar_first')
        from psycopg.types.json import Jsonb
        self.assertTrue(actor._call('SELECT appointment_system.stage_resource_consent(%s,%s,%s,%s,%s,%s,%s,%s)',
            ('company',attempt,state,'synthetic-doctor',CALENDARS['first'],'encrypted-grant'*20,Jsonb(sorted(RESOURCE_SCOPES['calendar'])),None)))
        self.assertEqual(self.db.scalar('SELECT count(*) FROM appointment_system.google_resource_grants;'),'0')
        self.assertEqual(actor._call('SELECT appointment_system.finish_resource_consent(%s,%s,%s,%s)',('company',company.token,company.csrf,attempt))['code'],'saved')
        saved=actor._call('SELECT appointment_system.resource_connection_status(%s,%s,%s)',('company',company.token,WEB))
        self.assertEqual({item['resource'] for item in saved},{'calendar_first','calendar_second'})
        self.assertIsNone(actor._call('SELECT appointment_system.issue_resource_owner_link(%s,%s,%s,%s,%s,%s,%s,%s)',
            (company.token,company.csrf,uuid4(),'calendar_first',uuid4(),'Synthetic unsupported repair',uuid4().hex*2,uuid4().hex*2)))
        with self.assertRaisesRegex(AssertionError,'resource authority denied'):
            self.staff._call('SELECT appointment_system.start_resource_consent(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)',
                ('staff',self.session,None,WEB,uuid4(),'calendar_first',state,browser,'encrypted-attempt'*20,uuid4(),WEB))
