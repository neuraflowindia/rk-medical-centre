from copy import deepcopy
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import Mock
from appointment_system.payment_readiness import expected_merchant,payment_availability
from appointment_system.webhook import WebhookAccount,WebhookRegistry
from appointment_system.storage import UnavailableStore
from appointment_system.razorpay import RazorpayFailure
from appointment_system.settings import Installation
from appointment_system.errors import Rejected
from .fixtures import installation

class PaymentReadiness(TestCase):
    def setUp(self):
        self.store=Mock();self.store.payment_intake.return_value={'merchant_id':'SyntheticMerchant','mode':'test','credential_version':'v1','public_open':True}
        self.accounts=Mock();self.accounts.current.return_value=SimpleNamespace(credentials=SimpleNamespace(version='v1'))
        self.webhook=WebhookRegistry((WebhookAccount('SyntheticMerchant','test',('synthetic-webhook-secret',)),))
        self.args=dict(webhook=self.webhook,ingress=self.store,strict=True)
    def test_exact_local_writer_hook_and_ingress_required(self):
        self.assertEqual(expected_merchant(self.store,self.accounts,**self.args),{k:self.store.payment_intake.return_value[k] for k in ('merchant_id','mode','credential_version')})
        for change in ({'webhook':None},{'ingress':None},{'ingress':UnavailableStore()},{'webhook':WebhookAccount('DifferentMerchant','test',('other-synthetic-secret',))}):
            self.assertIsNone(expected_merchant(self.store,self.accounts,**(self.args|change)))
        self.accounts.current.return_value.credentials.version='old'
        self.assertIsNone(expected_merchant(self.store,self.accounts,**self.args))
    def test_missing_accounts_or_bad_declaration_close_online_only(self):
        self.assertIsNone(expected_merchant(self.store,None,**self.args))
        for configured in (None,{}, {'merchant_id':'SyntheticMerchant','mode':'test','credential_version':'v1','public_open':False}):
            self.store.payment_intake.return_value=configured
            self.assertIsNone(expected_merchant(self.store,self.accounts,**self.args))
        policy={'policy':{'payment_methods':['online','at_clinic']},'schedule_browsing_open':True}
        self.assertEqual(payment_availability(policy,None),{'online':{'available':False,'reason':'temporarily_unavailable'},'at_clinic':{'available':True,'reason':None}})
        policy['schedule_browsing_open']=False
        self.assertTrue(all(not m['available'] for m in payment_availability(policy,{'ready':True}).values()))
    def test_legacy_resolver_omits_internal_readiness_fields(self):
        self.assertEqual(set(expected_merchant(self.store,self.accounts)),{'merchant_id','mode','credential_version'})
    def test_invalid_and_mismatched_account_is_unavailable_without_provider_calls(self):
        for failure in (KeyError('missing'),ValueError('invalid'),RazorpayFailure('unavailable')):
            self.accounts.current.side_effect=failure
            self.assertIsNone(expected_merchant(self.store,self.accounts,**self.args))
    def test_public_contacts_are_optional_exact_bounded_and_safe(self):
        spec=installation();self.assertNotIn('public_contacts',Installation.parse(spec).document)
        spec['public_contacts']=[{'label':'Doctor A','phone':'+919876543210'}]
        self.assertEqual(Installation.parse(spec).document['public_contacts'],spec['public_contacts'])
        for value in ([],None,{},[{'label':'Doctor A','phone':'javascript:bad'}],[{'label':'A\nB','phone':'+919876543210'}],spec['public_contacts']*2,[{'label':'A','phone':'+919876543210','extra':True}]):
            invalid=deepcopy(spec);invalid['public_contacts']=value
            with self.subTest(value=value),self.assertRaises(Rejected):Installation.parse(invalid)
