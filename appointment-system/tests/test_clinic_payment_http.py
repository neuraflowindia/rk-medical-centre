"""Real HTTP and SQL admission; providers are forbidden in these local cases."""
from uuid import uuid4
from unittest.mock import Mock
from fastapi.testclient import TestClient
from appointment_system.application import create_application
from appointment_system.secret_configuration import booking_settings
from appointment_system.razorpay import Credentials
from appointment_system.recovery import Accounts
from .test_application import environment, Reader
from .test_resource_booking import ResourceFixture
from .sql_store import IsolatedStore

class ClinicPaymentHTTP(ResourceFixture):
    def app(self):
        self.settings=booking_settings(environment())
        self.adapter=Mock();self.adapter.credentials=Credentials('SyntheticMerchant','live','fixture','rzp_live_synthetic','synthetic-secret')
        self.adapter.create_order.side_effect=AssertionError('No provider call is allowed')
        accounts=Accounts([self.adapter],current_versions={('SyntheticMerchant','live'):'fixture'})
        app=create_application(IsolatedStore(self.db,'appointment_system_web'),self.settings,
            payment_accounts=accounts,projection_reader=Reader(True),verified_client_address=lambda r:'127.0.0.1')
        return TestClient(app,base_url=self.settings.origin)

    def test_missing_webhook_blocks_direct_online_but_clinic_is_usable(self):
        with self.app() as client:
            policy=client.get('/api/booking-policy');self.assertEqual(policy.status_code,200,policy.text)
            self.assertEqual(policy.json()['payment_availability'],{'online':{'available':False,'reason':'temporarily_unavailable'},'at_clinic':{'available':True,'reason':None}})
            headers={'Origin':self.settings.origin,'x-booking-receipt':self.settings.receipt_key.issue()}
            self.assertEqual(client.post('/api/checkout-context',json={},headers=headers).status_code,200)
            payload=self.draft(service_id='first',payment_method='online')['payload']
            payload.update(request_id=str(uuid4()),normalization_version=3,email=None)
            response=client.post('/api/checkout',json=payload,headers=headers)
            self.assertEqual(response.status_code,503,response.text);self.assertEqual(response.json()['code'],'payment_not_configured')
            self.assertEqual(self.db.scalar('SELECT count(*) FROM appointment_system.bookings;'),'0')
            payload.update(request_id=str(uuid4()),payment_method='at_clinic')
            response=client.post('/api/checkout',json=payload,headers=headers)
            self.assertEqual(response.status_code,200,response.text)
            self.assertEqual(response.json()['receipt']['appointment_state'],'confirmed')
            replay=client.post('/api/checkout',json=payload,headers=headers)
            self.assertEqual(replay.status_code,200,replay.text)
            self.assertEqual(replay.json()['receipt']['request_id'],response.json()['receipt']['request_id'])
            self.assertEqual(self.db.scalar('SELECT count(*) FROM appointment_system.bookings;'),'1')
            self.adapter.create_order.assert_not_called()
