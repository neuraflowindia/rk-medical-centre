"""Clinic change policy exercised through real transactional staff entries."""
from copy import deepcopy
from datetime import datetime, timedelta
from uuid import uuid4
from appointment_system.settings import BusinessSettings
from appointment_system.errors import Rejected
from tools.checks.sql_target import literal
from .test_resource_booking import ResourceFixture, resource_business
from .test_sql_staff import CLIENT, ORIGIN
from .fixtures import installation


class StaffDiscretionSQL(ResourceFixture):
    def setUp(self):
        super().setUp()
        self.spec['appointment_changes'] = 'staff_discretion'
        self.set_policy(self.spec)

    def saved(self, past=False):
        b = self.clinic()
        b['claim'] = self.db.scalar('SELECT id::text FROM appointment_system.slot_claims WHERE booking_id='+literal(b['booking'])+';')
        if past:
            self.db.sql("UPDATE appointment_system.bookings SET created_at=clock_timestamp()-interval '3 days',hold_expires_at=CASE WHEN payment_method='online' THEN clock_timestamp()-interval '3 days'+interval '10 minutes' ELSE NULL END,starts_at=clock_timestamp()-interval '2 days',ends_at=clock_timestamp()-interval '2 days'+interval '20 minutes',original_starts_at=clock_timestamp()-interval '2 days' WHERE id="+literal(b['booking'])+';'
                'UPDATE appointment_system.slot_claims s SET starts_at=b.starts_at,ends_at=b.ends_at FROM appointment_system.bookings b WHERE s.booking_id=b.id;')
        return b

    def cancel(self, b, operation=None, revision=1, reason='Patient called the clinic'):
        return self.staff.studio_appointment_cancel(self.session,CLIENT,ORIGIN,operation or uuid4(),b['claim'],revision,reason)

    def test_past_cancel_audit_replay_and_no_new_money(self):
        b=self.saved(True);op=uuid4()
        detail=self.staff.studio_appointment_detail(self.session,CLIENT,ORIGIN,b['claim'])
        self.assertTrue(detail['can_cancel']);self.assertTrue(detail['can_reschedule'])
        first=self.cancel(b,op);self.assertEqual(first['code'],'cancelled');self.assertEqual(self.cancel(b,op),first)
        self.assertEqual(self.cancel(b,revision=2)['code'],'appointment_unavailable')
        audit=self.db.value('SELECT to_jsonb(a) FROM appointment_system.staff_appointment_actions a WHERE operation_id='+literal(str(op))+';')
        self.assertEqual(audit['change_policy_mode'],'staff_discretion')
        self.assertEqual(audit['change_policy_version'],self.db.scalar('SELECT policy_version FROM appointment_system.intake_settings;'))
        self.assertEqual(audit['before_state']['state'],'confirmed');self.assertEqual(audit['after_state']['state'],'cancelled')
        self.assertEqual(audit['before_state']['starts_at'],audit['after_state']['starts_at'])
        self.assertEqual(self.db.scalar('SELECT count(*) FROM appointment_system.payment_orders;'),'0')
        self.assertEqual(self.db.scalar('SELECT count(*) FROM appointment_system.staff_appointment_actions;'),'1')
        self.spec.pop('appointment_changes');self.set_policy(self.spec)
        self.assertEqual(self.cancel(b,op),first)
        for role in ('appointment_system_web','abs_staff'):
            self.assertNotEqual(self.db.sql("DELETE FROM appointment_system.staff_appointment_actions;",role=role,check=False).returncode,0)

    def test_past_move_preserves_old_evidence_and_can_move_repeatedly(self):
        b=self.saved(True)
        self.db.sql("UPDATE appointment_system.bookings SET reschedule_deadline_at=clock_timestamp()-interval '1 day',preparation=preparation||'{\"_legacy_late_reschedule_used\":true}'::jsonb WHERE id="+literal(b['booking'])+';')
        before=self.db.value('SELECT to_jsonb(b) FROM appointment_system.bookings b WHERE id='+literal(b['booking'])+';')
        result=self.move(b,self.starts[3]);self.assertEqual(result['code'],'rescheduled')
        result=self.move(b,self.starts[5],revision=2);self.assertEqual(result['code'],'rescheduled')
        after=self.db.value('SELECT to_jsonb(b) FROM appointment_system.bookings b WHERE id='+literal(b['booking'])+';')
        for key in ('original_starts_at','reschedule_deadline_at','resource_id','payment_method','amount_paise','request_id','preparation'):
            self.assertEqual(after[key],before[key],key)
        history=self.db.value('SELECT jsonb_agg(to_jsonb(a) ORDER BY revision) FROM appointment_system.staff_appointment_actions a;')
        self.assertEqual(len(history),2);self.assertFalse(any(a['late_exception'] for a in history))
        self.assertEqual(history[0]['after_state'],history[1]['before_state'])
        self.assertGreaterEqual(datetime.fromisoformat(after['receipt_expires_at']),datetime.fromisoformat(after['ends_at'])+timedelta(hours=24))
        jobs=self.db.value("SELECT jsonb_agg(booking_revision) FROM appointment_system.delivery_jobs WHERE kind='booking_ack';")
        self.assertIn(3,jobs)

    def test_occupied_target_and_past_target_leave_past_visit_unchanged(self):
        b=self.saved(True);self.clinic(start=self.starts[3])
        self.assertEqual(self.move(b,self.starts[3])['code'],'time_already_reserved')
        self.assertEqual(self.move(b,'2020-01-01T10:00:00+05:30')['code'],'time_unavailable')
        self.assertEqual(self.db.scalar('SELECT revision FROM appointment_system.bookings WHERE id='+literal(b['booking'])+';'),'1')
        self.assertEqual(self.db.scalar('SELECT count(*) FROM appointment_system.staff_appointment_actions;'),'0')

    def test_absent_mode_keeps_legacy_past_restriction(self):
        b=self.saved(True);self.spec.pop('appointment_changes');self.set_policy(self.spec)
        self.assertFalse(self.staff.studio_appointment_detail(self.session,CLIENT,ORIGIN,b['claim'])['can_cancel'])
        self.assertEqual(self.cancel(b)['code'],'appointment_unavailable')
        self.assertEqual(self.move(b,self.starts[3])['code'],'appointment_unavailable')

    def test_retired_doctor_can_cancel_but_not_move(self):
        b=self.saved(True);self.spec['resources']=self.spec['resources'][1:];self.spec['services']=self.spec['services'][1:];self.set_policy(self.spec)
        detail=self.staff.studio_appointment_detail(self.session,CLIENT,ORIGIN,b['claim'])
        self.assertTrue(detail['can_cancel']);self.assertFalse(detail['can_reschedule'])
        self.assertEqual(self.move(b,self.starts[3])['code'],'resource_unavailable')
        self.assertEqual(self.cancel(b)['code'],'cancelled')

    def test_reason_revision_identity_and_operation_are_still_required(self):
        b=self.saved(True)
        self.assertEqual(self.cancel(b,reason='')['code'],'invalid_change')
        self.assertEqual(self.cancel(b,revision=2)['code'],'revision_changed')
        self.assertEqual(self.move(b,self.starts[3],origin='https://wrong.example.test')['code'],'access_unavailable')
        op=uuid4();self.assertEqual(self.cancel(b,op)['code'],'cancelled')
        self.assertEqual(self.cancel(b,op,reason='Different reason')['code'],'request_conflict')

    def test_policy_mode_python_and_database_agree(self):
        for mode in ('staff_discretion','legacy_notice'):
            spec=resource_business();spec['appointment_changes']=mode
            self.assertEqual(BusinessSettings.parse(spec).document,spec)
            self.assertEqual(self.db.scalar('SELECT appointment_system.validate_business('+literal(spec)+'::jsonb);'),'t')
        for mode in ('unknown',None,True,{},[]):
            spec=resource_business();spec['appointment_changes']=mode
            with self.assertRaises(Rejected):BusinessSettings.parse(spec)
            self.assertEqual(self.db.scalar('SELECT appointment_system.validate_business('+literal(spec)+'::jsonb);'),'f')

    def test_online_past_change_retains_payment_evidence_and_does_not_refund(self):
        b=self.booking(service_id='first',payment_method='online')
        self.assertEqual(self.start_order(b),'t');self.record_order(b);self.assertEqual(self.capture(b,amount=80000),'confirmed')
        self.assertEqual(self.reserve(b,account=False)['code'],'existing')
        b['claim']=self.db.scalar('SELECT id::text FROM appointment_system.slot_claims WHERE booking_id='+literal(b['booking'])+';')
        self.db.sql("UPDATE appointment_system.bookings SET created_at=clock_timestamp()-interval '3 days',hold_expires_at=CASE WHEN payment_method='online' THEN clock_timestamp()-interval '3 days'+interval '10 minutes' ELSE NULL END,starts_at=clock_timestamp()-interval '2 days',ends_at=clock_timestamp()-interval '2 days'+interval '20 minutes',original_starts_at=clock_timestamp()-interval '2 days' WHERE id="+literal(b['booking'])+';'
            'UPDATE appointment_system.slot_claims s SET starts_at=b.starts_at,ends_at=b.ends_at FROM appointment_system.bookings b WHERE s.booking_id=b.id;')
        tables=('payment_orders','accepted_payments','payment_observations')
        before={t:self.db.value('SELECT jsonb_agg(to_jsonb(r)) FROM appointment_system.'+t+' r;') for t in tables}
        self.assertEqual(self.staff.studio_appointment_detail(self.session,CLIENT,ORIGIN,b['claim'])['policy_guidance'],'staff_decision')
        self.assertEqual(self.move(b,self.starts[3])['code'],'rescheduled')
        self.assertEqual(self.cancel(b,revision=2)['policy_guidance'],'staff_decision')
        for t in tables:self.assertEqual(self.db.value('SELECT jsonb_agg(to_jsonb(r)) FROM appointment_system.'+t+' r;'),before[t],t)

    def test_public_contacts_match_database_and_python_validation(self):
        spec=installation();spec['database_targets']['web']['role']='appointment_system_web'
        for contacts,valid in (([{'label':'Doctor A','phone':'+919876543210'}],True),([],False),([{'label':'A','phone':'123'}],False),([{'label':'A','phone':'+919876543210'}]*2,False)):
            spec['public_contacts']=contacts
            result=self.db.sql('BEGIN;TRUNCATE appointment_system.installation CASCADE;SELECT appointment_system.configure_installation('+literal(spec)+'::jsonb,'+literal(self.spec)+'::jsonb,false);ROLLBACK;',check=False)
            self.assertEqual(result.returncode==0,valid,result.stderr)
