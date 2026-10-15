"""Schedule authority is explicit and never borrows broader company powers."""
from unittest import TestCase
from unittest.mock import patch
from appointment_system.schedule_access import agency_schedule_enabled, can_manage_schedule, AGENCY_SCHEDULE_PATHS
from appointment_system.studio_calendar import CloseTime


class ScheduleAccess(TestCase):
    def test_only_explicit_v2_agency_permission_adds_schedule_access(self):
        for version,permissions,expected in [(1,[],False),(1,['agency'],False),(2,[],False),
                (2,['client'],False),(2,['agency'],True),(2,['client','agency'],True)]:
            with self.subTest(version=version,permissions=permissions), \
                    patch('appointment_system.schedule_access.business',return_value={'version':version}), \
                    patch('appointment_system.schedule_access.installation',return_value={'schedule_management':permissions}):
                self.assertEqual(agency_schedule_enabled(),expected)
                self.assertEqual(can_manage_schedule('agency'),expected)
                self.assertTrue(can_manage_schedule('client'))
                self.assertFalse(can_manage_schedule('unknown'))
        for forbidden in ['/api/studio/appointments/lookup','/api/studio/inbox/refund',
                '/api/studio/contact-correction','/api/studio/connect','/api/company/records']:
            self.assertNotIn(forbidden,AGENCY_SCHEDULE_PATHS)
        for action in ('detail','cancel','reschedule','action-result'):
            self.assertIn('/api/studio/appointments/'+action,AGENCY_SCHEDULE_PATHS)

    def test_closure_uses_explicit_resource_field_and_retains_old_v1_shape(self):
        body={'operation_id':'ce401de9-e465-49bd-b995-588fdac1bdb1','reason':'Planned absence',
            'starts_at':'2026-10-20T10:00:00+05:30','ends_at':'2026-10-20T11:00:00+05:30'}
        self.assertIsNone(CloseTime.model_validate(body).resource_id)
        for resource in ('*','dr-sanjay-gupta','dr-parul-gupta'):
            self.assertEqual(CloseTime.model_validate(body|{'resource_id':resource}).resource_id,resource)
        for change in ({'resource':'dr-sanjay-gupta'},{'resource_id':''},{'resource_id':'../doctor'},
                {'ends_at':'2026-10-20T09:00:00+05:30'}):
            with self.assertRaises(ValueError):CloseTime.model_validate(body|change)
