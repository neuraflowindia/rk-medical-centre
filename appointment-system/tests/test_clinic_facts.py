"""Clinic facts are explicit, unpaid and separate from provider payment evidence."""
from copy import deepcopy
from datetime import datetime, timezone
from unittest import TestCase
from unittest.mock import patch
from uuid import uuid4

from appointment_system.appointment_facts import appointment_facts, location_facts, FIELDS
from appointment_system.receipt_view import receipt_facts
from appointment_system.payment_policy import Appointment, Order, Payment, CheckoutEvidence, customer_actions
from appointment_system.email_messages import render_message
from appointment_system.resend_email import EmailFailure
from appointment_system.models import BookingRequest


def saved():
    return dict(facts_version=2,resource_id='doctor-a',resource_name='Doctor A',payment_method='at_clinic',
        amount_due_paise=80000,location={'name':'Test clinic','address':'Test address','maps_url':'https://maps.example.test/clinic'},
        display_duration=False,state='confirmed',order_state='not_required',payment_state='due_at_clinic',
        amount_paise=80000,captured_paise=0,refunded_paise=0,meeting_mode='in_person',
        request_id=str(uuid4()),hold_expires_at=None,starts_at='2026-10-20T11:00:00Z',
        ends_at='2026-10-20T11:20:00Z',service_name='Doctor A visit',currency='INR',practice_timezone='Asia/Kolkata',
        meeting_state='not_created',acknowledgement_state='pending',meeting_email_state='not_created',booking_revision=1)


class ClinicFacts(TestCase):
    def test_saved_facts_reach_receipt_without_money_or_video_link(self):
        row=saved();result=receipt_facts({'server_now':'2026-10-15T00:00:00Z','booking':row},row['request_id'])
        self.assertEqual(result['payment_state'],'due_at_clinic')
        self.assertEqual(result['amount_due_paise'],80000)
        self.assertEqual(result['captured_paise'],0)
        self.assertIsNone(result['meet_url'])
        self.assertIsNone(result['hold_expires_at'])
        self.assertFalse(result['display_duration'])
        self.assertEqual(result['ends_at'],'2026-10-20T11:20:00+00:00')  # Internal reservation stays20minutes.
        row.update(state='cancelled',amount_due_paise=0)
        self.assertEqual(appointment_facts(row)['amount_due_paise'],0)

    def test_incomplete_unknown_or_contradictory_facts_fail_closed(self):
        for key in FIELDS:
            row=saved();row.pop(key)
            with self.subTest(missing=key),self.assertRaises(ValueError):appointment_facts(row)
        for change in ({'facts_version':True},{'facts_version':3},{'resource_id':'bad id'},{'resource_id':False},
            {'resource_name':'bad\x00name'},{'resource_name':''},{'display_duration':0},{'amount_due_paise':True},
            {'amount_due_paise':-1},{'amount_due_paise':80001},{'amount_paise':'80000'},
            {'payment_method':'cash'},{'captured_paise':1},{'refunded_paise':1},{'state':'held'},
            {'provider_order_id':'order_false'},{'attempted_at':'2026-10-10T00:00:00Z'},
            {'order_state':'ready'},{'payment_state':'captured'},{'location':None},
            {'meeting_mode':'internal'},{'state':'cancelled'},{'payment_method':'online'}):
            with self.subTest(change=change),self.assertRaises(ValueError):appointment_facts(saved()|change)
        self.assertEqual(appointment_facts({'meeting_mode':'internal'}),{})
        for row in ({'meeting_mode':'in_person'},{'payment_state':'due_at_clinic'}):
            with self.assertRaises(ValueError):appointment_facts(row)

    def test_online_v2_has_online_evidence(self):
        row=saved()|dict(payment_method='online',amount_due_paise=0,order_state='ready',payment_state='captured',
            captured_paise=80000,provider_order_id='order_example',attempted_at='2026-10-14T00:00:00Z')
        self.assertEqual(appointment_facts(row)['payment_method'],'online')

    def test_location_cannot_embed_executable_or_private_urls(self):
        self.assertIsNone(location_facts(None))
        for value in ({},[],{'name':'A','address':'B','maps_url':'javascript:alert(1)'},
            {'name':'A','address':'B','maps_url':'https://user:pass@example.test'},
            {'name':'A','address':'B','maps_url':'https://example.test:999999'},
            {'name':'A','address':'B','maps_url':'https://example.test:444'},
            {'name':'A','address':'\x00','maps_url':'https://example.test'},
            {'name':'A','address':'B','maps_url':'https://example.test','extra':1}):
            with self.subTest(value=value),self.assertRaises(ValueError):location_facts(value)

    def test_unpaid_confirmation_never_offers_payment_retry(self):
        now=datetime(2026,10,14,tzinfo=timezone.utc)
        evidence=CheckoutEvidence(Appointment.CONFIRMED,Order.NOT_REQUIRED,Payment.DUE_AT_CLINIC,now)
        self.assertEqual(customer_actions(evidence,now),{'customer_message_code':'appointment_confirmed','next_actions':['check_status','choose_new_time']})
        for appointment,order,payment in ((Appointment.HELD,Order.NOT_REQUIRED,Payment.DUE_AT_CLINIC),
                (Appointment.CONFIRMED,Order.NOT_REQUIRED,Payment.CAPTURED),
                (Appointment.CONFIRMED,Order.NOT_ATTEMPTED,Payment.DUE_AT_CLINIC)):
            with self.assertRaises(ValueError):CheckoutEvidence(appointment,order,payment,now)

    def test_request_compatibility_and_explicit_payment_choice(self):
        body=dict(request_id=str(uuid4()),full_name='Test Patient',email='test@example.com',phone='',
            service_id='visit-a',quote_version='a'*64,starts_at='2026-10-20T10:00:00Z')
        self.assertIsNone(BookingRequest.model_validate(body).payment_method)
        self.assertEqual(BookingRequest.model_validate(body|{'payment_method':'at_clinic'}).payment_method,'at_clinic')
        with self.assertRaises(ValueError):BookingRequest.model_validate(body|{'payment_method':'free'})


class ClinicMail(TestCase):
    def test_doctor_payment_review_uses_only_its_declared_resource_destination(self):
        job=self.job(role='resource',kind='payment_review');job['destination']='doctor@example.test'
        job['payload'].update(payment_method='online',amount_due_paise=0)
        declared={'resource_notifications':{'doctor-a':'doctor@example.test'},'owners':{'agency_email':'manager@example.test'}}
        with patch('appointment_system.email_messages.installation',return_value=declared):
            message=render_message(job)
            self.assertIn('not an appointment confirmation',message['text'])
            self.assertIn('private studio',message['text'])
            self.assertNotIn('20 minutes',message['text'])
            job['destination']='another-doctor@example.test'
            with self.assertRaises(EmailFailure):render_message(job)
            job['destination']='doctor@example.test';job['payload']['facts_version']=1
            with self.assertRaises(EmailFailure):render_message(job)

    def test_private_payment_review_is_not_an_appointment_confirmation(self):
        job=self.job(role='agency',kind='payment_review');job['destination']='manager@example.test'
        job['payload'].update(payment_method='online',amount_due_paise=0)
        with patch('appointment_system.email_messages.installation',return_value={'owners':{'agency_email':'manager@example.test'}}):
            text=render_message(job)['text']
        self.assertIn('not an appointment confirmation',text)
        self.assertIn('private studio',text)

    def test_moved_and_contact_corrected_notices_describe_only_the_saved_change(self):
        for kind,text in (('rescheduled','Your appointment has been moved'),('contact_corrected','has updated the contact details')):
            job=self.job();job['payload'].update(change_kind=kind,payment_method='online',amount_due_paise=0)
            result=render_message(job)['text']
            self.assertIn(text,result)
            self.assertNotIn('A paid appointment is confirmed',result)
        job=self.job();job['id']='not-a-uuid'
        with self.assertRaises(EmailFailure):render_message(job)

    def test_customer_changes_use_only_public_contact_instruction(self):
        with patch('appointment_system.email_messages.installation',return_value={'public_contacts':[{'label':'Doctor A','phone':'+919876543210'}]}):
            for kind in ('booking_ack','booking_cancelled'):
                job=self.job(kind=kind);job['payload']['payment_method']='online';job['payload']['amount_due_paise']=0
                result=render_message(job)['text']
                self.assertIn('For cancellations or changes, contact the clinic.',result)
                self.assertIn('Doctor A: +919876543210',result)
                for forbidden in ('24 hours','12 hours','14 days','staff decides','refund due'):
                    self.assertNotIn(forbidden,result)

    def job(self,role='customer',kind='booking_ack'):
        row=saved();return dict(id=str(uuid4()),kind=kind,recipient_role=role,destination='customer@example.test',payload={
            **{key:row[key] for key in FIELDS},'reference':row['request_id'],'practice_timezone':'Asia/Kolkata',
            'starts_at':row['starts_at'],'meeting':'in_person','amount_paise':80000,'currency':'INR','service':'Doctor A visit'})

    def test_confirmation_has_place_and_due_payment_without_claiming_paid(self):
        result=render_message(self.job())
        self.assertIn('Pay at the clinic',result['text']);self.assertIn('Test address',result['text'])
        self.assertIn('Doctor: Doctor A',result['text']);self.assertNotIn('paid appointment',result['text'])
        self.assertNotIn('20 minutes',result['text']);self.assertNotIn('11:20',result['text'])
        self.assertNotIn('meeting details will follow',result['text'])
        self.assertIn('No online payment was taken',render_message(self.job(kind='booking_cancelled'))['text'])

    def test_notifications_are_bound_to_declared_resource_or_manager(self):
        declared={'resource_notifications':{'doctor-a':'doctor@example.test'},'owners':{'agency_email':'manager@example.test'}}
        with patch('appointment_system.email_messages.installation',return_value=declared):
            for role,destination in (('resource','doctor@example.test'),('agency','manager@example.test')):
                job=self.job(role);job['destination']=destination
                self.assertIn('payment due at the clinic',render_message(job)['text'])
                job['destination']='foreign@example.test'
                with self.assertRaises(EmailFailure):render_message(job)
            job=self.job('resource');job['payload']['resource_id']='doctor-b'
            with self.assertRaises(EmailFailure):render_message(job)

    def test_malformed_version_or_clinic_metadata_cannot_be_sent(self):
        for change in ({'facts_version':True},{'facts_version':3},{'display_duration':1},
                {'resource_name':'\x00'}, {'location':None},{'payment_method':'free'},{'amount_due_paise':-1}):
            job=self.job();job['payload'].update(change)
            with self.subTest(change=change),self.assertRaises(EmailFailure):render_message(job)
