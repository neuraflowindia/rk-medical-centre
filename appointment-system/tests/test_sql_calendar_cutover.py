"""The existing owner transaction binds a new release before map/backfill commit."""
from copy import deepcopy
from unittest.mock import patch
from uuid import uuid4
import psycopg
from tools.setup import configure_resource_calendars, SetupError
from tools.checks.sql_target import literal
from appointment_system.settings import Installation
from appointment_system.serialization import fingerprint
from .test_resource_booking import ResourceFixture
from .test_in_person_calendar import CALENDARS

class CalendarCutoverSQL(ResourceFixture):
    def setUp(self):
        super().setUp()
        self.db.sql('TRUNCATE appointment_system.google_workbooks,appointment_system.google_resources,appointment_system.google_resource_grants CASCADE;')
        self.saved=self.clinic()
        before=self.db.value('SELECT specification FROM appointment_system.installation WHERE singleton;')
        before['resource_notifications']=dict(CALENDARS)
        before['database_targets']['migration']={'host':'localhost','port':5432,'database':'postgres','role':'postgres','pooling':False}
        before.pop('resource_calendars',None)
        self.db.sql('UPDATE appointment_system.installation SET specification='+literal(before)+'::jsonb;'
                    'UPDATE appointment_system.control_product_state SET enabled=false,requested_enabled=false;')
        self.before=before;self.target=Installation.parse(before|{'resource_calendars':CALENDARS})
        self.connection=psycopg.connect(host=self.db.native_socket(),dbname='postgres',user='postgres',autocommit=True)
        self.addCleanup(self.connection.close)
    def cutover(self,**changes):
        return configure_resource_calendars(self.connection,changes.get('target',self.target),
            expected_profile=changes.get('expected_profile',fingerprint(self.before)),
            expected_worker=changes.get('expected_worker','a'*64),new_worker=changes.get('new_worker','b'*64))
    def assert_unchanged(self):
        self.assertEqual(self.db.value('SELECT specification FROM appointment_system.installation WHERE singleton;'),self.before)
        self.assertEqual(self.db.scalar('SELECT release_digest FROM appointment_system.worker_release;'),'a'*64)
        self.assertEqual(self.db.scalar("SELECT count(*) FROM appointment_system.delivery_jobs WHERE recipient_role='calendar';"),'0')
    def test_one_commit_binds_new_digest_then_adds_map_and_backfills_without_rewriting_history(self):
        before=self.db.value('SELECT to_jsonb(b) FROM appointment_system.bookings b;')
        result=self.cutover()
        self.assertEqual(result,dict(status='calendars_configured',profile_digest=fingerprint(self.target.document),worker_digest='b'*64,booking_enabled=False))
        self.assertEqual(self.db.scalar('SELECT release_digest FROM appointment_system.worker_release;'),'b'*64)
        self.assertEqual(self.db.value('SELECT specification FROM appointment_system.installation WHERE singleton;'),self.target.document)
        self.assertEqual(self.db.value('SELECT to_jsonb(b) FROM appointment_system.bookings b;'),before)
        self.assertEqual(self.db.scalar("SELECT count(*) FROM appointment_system.delivery_jobs WHERE recipient_role='calendar';"),'1')
        self.assertEqual(self.db.scalar('SELECT enabled OR requested_enabled FROM appointment_system.control_product_state;'),'f')
    def test_wrong_old_identity_or_invalid_target_cannot_change_anything(self):
        for change,code in [({'expected_profile':'f'*64},'setup_installation_changed'),
                             ({'expected_worker':'f'*64},'setup_worker_release_changed'),
                             ({'new_worker':'bad'},'setup_calendar_cutover_invalid')]:
            with self.subTest(change=change),self.assertRaisesRegex(SetupError,code):self.cutover(**change)
            self.assert_unchanged()
        changed=deepcopy(self.target.document);changed['label']='Different identity'
        with self.assertRaisesRegex(SetupError,'setup_installation_mismatch'):self.cutover(target=Installation.parse(changed))
        self.assert_unchanged()
    def test_open_intake_or_active_worker_is_refused_without_clearing_the_lease(self):
        self.db.sql('UPDATE appointment_system.control_product_state SET requested_enabled=true;')
        with self.assertRaisesRegex(SetupError,'setup_booking_must_be_closed'):self.cutover()
        self.db.sql("UPDATE appointment_system.control_product_state SET requested_enabled=false;UPDATE appointment_system.worker_release SET active_run="+literal(str(uuid4()))+",active_until=clock_timestamp()+interval '1 minute';")
        before=self.db.value('SELECT to_jsonb(w) FROM appointment_system.worker_release w;')
        with self.assertRaisesRegex(SetupError,'setup_worker_busy'):self.cutover()
        self.assertEqual(self.db.value('SELECT to_jsonb(w) FROM appointment_system.worker_release w;'),before)
        self.assert_unchanged()
        # Test fixture cleanup only, after the unchanged-lease assertion.
        self.db.sql('UPDATE appointment_system.worker_release SET active_run=NULL,active_until=NULL;')
    def test_live_delivery_or_refresh_lease_is_refused_without_resetting_saved_work(self):
        from .sql_store import IsolatedStore
        self.db.scalar("SELECT appointment_system.provision_login('abs_worker','worker');")
        worker=IsolatedStore(self.db,'abs_worker');job=worker.claim_google_delivery('client_sheet');identifier=job['id']
        before=self.db.value('SELECT to_jsonb(d) FROM appointment_system.delivery_jobs d WHERE id='+literal(identifier)+';')
        with self.assertRaisesRegex(SetupError,'setup_delivery_busy'):self.cutover()
        self.assertEqual(self.db.value('SELECT to_jsonb(d) FROM appointment_system.delivery_jobs d WHERE id='+literal(identifier)+';'),before)
        self.assert_unchanged()
        self.assertTrue(worker.finish_google_delivery(job,'failed',None,None,'synthetic_retry',15))
        from appointment_system.google_oauth import RESOURCE_SCOPES
        self.db.sql("INSERT INTO appointment_system.google_resource_grants(id,owner_role,owner_email,subject,client_id,resources,scopes,encrypted_grant,grant_format,refresh_lease,refresh_lease_until,refresh_revision) VALUES("+
            literal(str(uuid4()))+",'client','practice@example.test','synthetic-subject','123-synthetic.apps.googleusercontent.com',ARRAY['calendar'],"+
            literal(sorted(RESOURCE_SCOPES['calendar']))+'::jsonb,'+literal('synthetic-encrypted'*20)+",'v1',"+literal(str(uuid4()))+",clock_timestamp()+interval '1 minute',1);")
        before=self.db.value('SELECT to_jsonb(g) FROM appointment_system.google_resource_grants g;')
        with self.assertRaisesRegex(SetupError,'setup_delivery_busy'):self.cutover()
        self.assertEqual(self.db.value('SELECT to_jsonb(g) FROM appointment_system.google_resource_grants g;'),before)
        self.assert_unchanged()
        self.db.sql('TRUNCATE appointment_system.google_resource_grants CASCADE;')
    def test_failure_after_both_writes_rolls_back_release_map_and_backfill_together(self):
        with patch('tools.setup.installed',side_effect=SetupError('synthetic_final_check_failure')):
            with self.assertRaisesRegex(SetupError,'synthetic_final_check_failure'):self.cutover()
        self.assert_unchanged()
