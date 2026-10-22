"""Private doctor copies use the existing contracts; no provider is contacted."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit
from unittest import TestCase
from unittest.mock import Mock, patch
from uuid import uuid4
import json

import httpx
from appointment_system import configuration
from appointment_system.configuration import Profile
from appointment_system.errors import Rejected
from appointment_system.settings import Installation, BusinessSettings
from appointment_system.google_oauth import (Access, Attempt, Grant, GoogleFailure, GoogleOAuth,
    OAuthSettings, GrantCipher, RESOURCE_SCOPES, FILE_SCOPE, TOKEN, USERINFO, OWNERS,
    resource_roles, resource_owners, resource_scopes_valid)
from appointment_system.google_resources import Resources
from appointment_system.google_workspace import Workspace, WorkspaceFailure, event_id
from appointment_system.in_person_calendar import InPersonCalendar, calendar_resource
from appointment_system.google_delivery import run_google_delivery_once
from appointment_system.company_control import calendar_connection_buttons
from appointment_system.resource_consent import Start
from .fixtures import installation
from .test_resource_booking import resource_business
from .test_google_resources import cipher, spec, WEB
from .test_keys import ring

CALENDARS={'first':'doctor-one@example.test','second':'doctor-two@example.test'}

def calendar_installation():
    return installation()|{'resource_notifications':dict(CALENDARS),'resource_calendars':dict(CALENDARS)}

class CalendarFixture(TestCase):
    def setUp(self):
        self.profile=Profile(Installation.parse(calendar_installation()),BusinessSettings.parse(resource_business()))
        bound=patch.object(configuration,'_profile',self.profile);bound.start();self.addCleanup(bound.stop)
        self.resource='calendar_first';self.role='doctor-first';self.owner=CALENDARS['first']
        self.grant=Grant(self.role,'synthetic-doctor-one',self.owner,'synthetic-refresh',RESOURCE_SCOPES['calendar'],None,(self.resource,))
        self.access=Access('synthetic-access',datetime.now(timezone.utc)+timedelta(hours=1),self.grant,WEB)
        starts=datetime.now(timezone.utc)+timedelta(days=2)
        self.booking=dict(id=str(uuid4()),request_id=str(uuid4()),revision=1,state='confirmed',resource_id='first',
            service_snapshot={'resource_id':'first','meeting':'in_person','name':'Doctor First'},
            starts_at=starts.isoformat(),ends_at=(starts+timedelta(minutes=20)).isoformat(),practice_timezone='Asia/Kolkata',
            full_name='Synthetic private name',email='patient@example.test',phone='+919876543210',
            preparation={'notes':'Synthetic private medical notes'})
        self.requests=[]
    def adapter(self,responses):
        def provider(request):
            self.requests.append(request)
            result=responses.pop(0)
            if isinstance(result,Exception):raise result
            if isinstance(result,httpx.Response):return result
            status,document=result
            return httpx.Response(status,json=document) if document is not None else httpx.Response(status)
        return InPersonCalendar(self.access,self.resource,transport=httpx.MockTransport(provider))
    def event(self):
        return InPersonCalendar(self.access,self.resource).body(self.booking)|{'organizer':{'email':self.owner},'etag':'"synthetic-etag"'}

class CalendarSettings(CalendarFixture):
    def test_calendar_map_is_optional_and_exactly_bound_to_notification_owner(self):
        self.assertEqual(Installation.parse(calendar_installation()).document['resource_calendars'],CALENDARS)
        for mapping in ([],None,{'first':'wrong@example.test'},{'unknown':'doctor-one@example.test'},
                        {'first':'DOCTOR-ONE@example.test'},{'first':'doctor-one@example.test','second':'doctor-one@example.test'}):
            value=calendar_installation();value['resource_calendars']=mapping
            with self.subTest(mapping=mapping),self.assertRaises(Rejected):Installation.parse(value)
    def test_bootstrap_requires_actual_in_person_resources(self):
        for mapping,policy in [({'unknown':'doctor-one@example.test'},resource_business()),(CALENDARS,configuration.business()|{'meeting':'google_meet'})]:
            value=calendar_installation();value.update(resource_calendars=mapping,resource_notifications=mapping)
            with patch.object(configuration,'_profile',None),self.assertRaises((ValueError,Rejected)):
                configuration.configure(value,policy)
        with patch.object(configuration,'_profile',None):
            self.assertEqual(configuration.configure(calendar_installation(),resource_business()).facts()['resource_calendars'],CALENDARS)
    def test_doctor_permissions_never_join_staff_principals(self):
        self.assertNotIn(self.role,OWNERS);self.assertEqual(resource_owners()[self.role],self.owner)
        self.assertEqual(resource_roles()[self.resource],self.role)
        self.assertTrue(resource_scopes_valid((self.resource,),RESOURCE_SCOPES['calendar']))
        for resource,scopes in [(('calendar_first','calendar_second'),RESOURCE_SCOPES['calendar']),
                ((self.resource,),RESOURCE_SCOPES['calendar']|{FILE_SCOPE}),(('calendar_unknown',),RESOURCE_SCOPES['calendar'])]:
            self.assertFalse(resource_scopes_valid(resource,scopes))
        with self.assertRaises(GoogleFailure):Grant(self.role,'subject',self.owner,'refresh',RESOURCE_SCOPES['calendar'])
        with self.assertRaises(GoogleFailure):Grant(self.role,'subject',CALENDARS['second'],'refresh',RESOURCE_SCOPES['calendar'],None,(self.resource,))
    def test_resource_attempts_and_grants_are_separate_and_cannot_be_swapped(self):
        encrypted=cipher();identifier=str(uuid4());attempt=Attempt.new(self.role)
        row={'id':identifier,'resource':self.resource,'client_id':WEB,
            'encrypted_attempt':encrypted.seal_attempt(identifier,self.resource,WEB,attempt)}
        self.assertEqual(encrypted.open_attempt(row,attempt.state),attempt)
        for change in ({'resource':'calendar_second'},{'id':str(uuid4())},{'client_id':'987-foreign.apps.googleusercontent.com'}):
            with self.assertRaises(GoogleFailure):encrypted.open_attempt(row|change,attempt.state)
        saved=dict(grant_id=identifier,client_id=WEB,resources=[self.resource],owner_email=self.owner,
            subject=self.grant.subject,scopes=sorted(self.grant.scopes),grant_format='v1',
            encrypted_grant=encrypted.seal(identifier,WEB,self.grant))
        self.assertEqual(encrypted.open(saved,self.resource,now=datetime.now(timezone.utc)),self.grant)
        with self.assertRaises(GoogleFailure):encrypted.open(saved,'calendar_second',now=datetime.now(timezone.utc))
        with self.assertRaises(GoogleFailure):encrypted.open(saved|{'grant_format':'legacy'},self.resource,now=datetime.now(timezone.utc))
        with self.assertRaises(GoogleFailure):GrantCipher(WEB,ring(purpose='google-grant')).seal_attempt(attempt,'connect')
    def test_company_controls_name_both_calendars_but_public_html_omits_owner_addresses(self):
        buttons=calendar_connection_buttons()
        for resource in ('first','second'):
            self.assertIn('data-google-resource="calendar_'+resource+'"',buttons)
            self.assertIn('Doctor '+resource.title(),buttons)
            self.assertNotIn(CALENDARS[resource],buttons)
        self.assertNotIn('data-google-resource="calendar"',buttons)
        self.assertEqual(Start(resource=self.resource).resource,self.resource)
        with self.assertRaises(ValueError):Start(resource='calendar_unknown')
        with patch.object(configuration,'_profile',Profile(Installation.parse(installation()),self.profile.initial_business)):
            self.assertIn('data-google-resource="calendar"',calendar_connection_buttons())
    def test_oauth_asks_only_calendar_owned_and_resource_consent_cannot_sign_in(self):
        provider=GoogleOAuth(OAuthSettings(WEB,'synthetic-secret',configuration.origin()),resource=self.resource)
        attempt=Attempt.new(self.role);query=parse_qs(urlsplit(provider.authorization_url(attempt)).query)
        self.assertEqual(query['login_hint'],[self.owner]);self.assertEqual(set(query['scope'][0].split()),RESOURCE_SCOPES['calendar'])
        for method,args in [(provider.authorization_url,{'signin':True}),(provider.authorization_url,{'repair':True})]:
            with self.assertRaises(GoogleFailure):method(attempt,**args)
        with self.assertRaises(GoogleFailure):provider.sign_in(attempt,'synthetic-code')
        with self.assertRaises(WorkspaceFailure):Workspace(self.access)
    def test_actual_company_html_contains_both_named_controls_without_private_owners(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        from appointment_system.company_control import router
        application=FastAPI();application.include_router(router(None))
        response=TestClient(application).get('/company/booking-control')
        self.assertEqual(response.status_code,200)
        self.assertNotIn('CALENDAR_RESOURCE_BUTTONS',response.text)
        self.assertEqual(response.text.count('data-google-resource="calendar_'),2)
        self.assertNotIn(CALENDARS['first'],response.text)
        self.assertEqual(response.headers['x-robots-tag'],'noindex, nofollow')

    def test_signed_doctor_exchange_checks_owner_nonce_subject_and_keeps_minimal_scope(self):
        import time
        from .test_google_oauth import GoogleOAuthTests
        from appointment_system.google_oauth import CERTS
        GoogleOAuthTests.setUpClass();helper=GoogleOAuthTests()
        attempt=Attempt.new(self.role)
        claims=dict(iss='https://accounts.google.com',aud=WEB,sub=self.grant.subject,email=self.owner,
            email_verified=True,nonce=attempt.nonce,iat=int(time.time())-1,exp=int(time.time())+3600)
        current=dict(claims)
        def provider(request):
            if str(request.url)==CERTS:return httpx.Response(200,json={'synthetic':helper.cert})
            self.assertEqual(str(request.url),TOKEN)
            return httpx.Response(200,json=dict(id_token=helper.signed(current),access_token='access',
                token_type='Bearer',expires_in=3600,refresh_token='refresh',scope=' '.join(sorted(RESOURCE_SCOPES['calendar']))))
        provider=GoogleOAuth(OAuthSettings(WEB,'synthetic-secret',configuration.origin()),
            resource=self.resource,transport=httpx.MockTransport(provider))
        access=provider.exchange(attempt,'synthetic-code',now=datetime.now(timezone.utc),previous_subject=self.grant.subject)
        self.assertEqual((access.grant.role,access.grant.email,access.grant.resources),(self.role,self.owner,(self.resource,)))
        for change in ({'email':CALENDARS['second']},{'sub':'unexpected-subject'},{'nonce':Attempt.new(self.role).nonce}):
            current=claims|change
            with self.assertRaises(GoogleFailure):
                provider.exchange(attempt,'synthetic-code',now=datetime.now(timezone.utc),previous_subject=self.grant.subject)

    def test_resource_registry_owner_and_refresh_are_exact(self):
        value=spec();value['resources']={self.resource:dict(owner_email=self.owner,active_client=WEB,retained_clients=[WEB])}
        calls=[]
        def provider(request):
            calls.append(str(request.url))
            if str(request.url)==TOKEN:return httpx.Response(200,json={'access_token':'synthetic-access','token_type':'Bearer','expires_in':3600})
            self.assertEqual(str(request.url),USERINFO)
            return httpx.Response(200,json={'sub':self.grant.subject,'email':self.owner,'email_verified':True})
        registry=Resources(value,cipher(),transport=httpx.MockTransport(provider))
        refreshed=registry.provider(self.resource).refresh(self.grant,now=datetime.now(timezone.utc))
        self.assertEqual(refreshed.grant,self.grant);self.assertEqual(calls,[TOKEN,USERINFO])
        value['resources'][self.resource]['owner_email']=CALENDARS['second']
        with self.assertRaises((Rejected,GoogleFailure)):Resources(value,cipher())

class PrivateCalendarTransport(CalendarFixture):
    def test_create_reuses_identity_and_never_sends_patient_information_or_invites(self):
        adapter=self.adapter([(404,None),(201,self.event()),(200,self.event())])
        self.assertEqual(adapter.ensure_visit(self.booking)['state'],'ready')
        self.assertEqual(adapter.ensure_visit(self.booking)['event_id'],event_id(self.booking['id'],1))
        self.assertEqual([request.method for request in self.requests],['GET','POST','GET'])
        request=self.requests[1];body=json.loads(request.content)
        self.assertEqual(dict(request.url.params),{'sendUpdates':'none'})
        self.assertEqual(body['visibility'],'private');self.assertEqual(body['reminders'],{'useDefault':False})
        self.assertNotIn('attendees',body);self.assertNotIn('conferenceData',body)
        self.assertNotIn('hangoutLink',body);self.assertNotIn('20 minutes',json.dumps(body))
        for private in (self.booking['full_name'],self.booking['email'],self.booking['phone'],self.booking['preparation']['notes']):
            self.assertNotIn(private,json.dumps(body))
        self.assertEqual(body['extendedProperties']['private']['resource'],'first')
        self.assertEqual(request.url.path,'/calendar/v3/calendars/'+self.owner+'/events')
    def test_conflict_reconciles_the_same_remote_identity(self):
        self.adapter([(404,None),(409,None),(200,self.event())]).ensure_visit(self.booking)
        self.assertEqual([r.method for r in self.requests],['GET','POST','GET'])
        self.assertEqual(self.requests[0].url.path,self.requests[2].url.path)
    def test_uncertain_create_does_not_retry_until_next_journal_attempt(self):
        adapter=self.adapter([(404,None),httpx.ReadTimeout('synthetic-secret')])
        with self.assertRaises(WorkspaceFailure) as error:adapter.ensure_visit(self.booking)
        self.assertEqual(str(error.exception),'google_service_unavailable');self.assertTrue(error.exception.uncertain)
        self.assertEqual(len(self.requests),2)
        retry=self.adapter([(200,self.event())]);retry.ensure_visit(self.booking)
        self.assertEqual(self.requests[-1].method,'GET')
    def test_foreign_owner_identity_revision_timing_and_conferencing_are_never_overwritten(self):
        for field in ('owner','id','resource','revision','start','end','private','attendees','omitted','conference','meet','cancelled','malformed'):
            event=self.event()
            if field=='owner':event['organizer']['email']=CALENDARS['second']
            elif field=='id':event['id']=event_id(str(uuid4()),1)
            elif field in ('resource','revision'):event['extendedProperties']['private'][field]='wrong'
            elif field in ('start','end'):event[field]['dateTime']=(datetime.now(timezone.utc)+timedelta(days=10)).isoformat()
            elif field=='private':event['visibility']='public'
            elif field=='attendees':event['attendees']=[{'email':'patient@example.test'}]
            elif field=='omitted':event['attendeesOmitted']=True
            elif field=='conference':event['conferenceData']={'solution':'unexpected'}
            elif field=='meet':event['hangoutLink']='https://meet.google.com/abc-defg-hij'
            elif field=='cancelled':event['status']='cancelled'
            else:event['start']=None
            with self.subTest(field=field),self.assertRaisesRegex(WorkspaceFailure,'event_mismatch'):
                self.adapter([(200,event)]).ensure_visit(self.booking)
            self.assertEqual(self.requests[-1].method,'GET')
    def test_cancellation_is_etag_guarded_and_repeat_absence_is_successful(self):
        adapter=self.adapter([(200,self.event()),(204,None),(404,None),(410,None)])
        for _ in range(3):adapter.cancel_visit(self.booking)
        self.assertEqual([r.method for r in self.requests],['GET','DELETE','GET','GET'])
        delete=self.requests[1];self.assertEqual(delete.headers['if-match'],'"synthetic-etag"')
        self.assertEqual(dict(delete.url.params),{'sendUpdates':'none'})
    def test_changed_remote_event_and_missing_etag_require_attention(self):
        with self.assertRaisesRegex(WorkspaceFailure,'event_mismatch'):
            self.adapter([(200,self.event()),(412,None)]).cancel_visit(self.booking)
        event=self.event();del event['etag']
        with self.assertRaisesRegex(WorkspaceFailure,'event_mismatch'):self.adapter([(200,event)]).cancel_visit(self.booking)
        for identifier in (event_id(self.booking['id'],1),event_id(str(uuid4()),1)):
            adapter=self.adapter([(200,{'id':identifier,'status':'cancelled'})])
            if identifier==event_id(self.booking['id'],1):adapter.cancel_visit(self.booking)
            else:
                with self.assertRaises(WorkspaceFailure):adapter.cancel_visit(self.booking)
    def test_past_appointment_copies_remain_possible_for_authorized_staff_corrections(self):
        start=datetime.now(timezone.utc)-timedelta(days=2)
        self.booking.update(starts_at=start.isoformat(),ends_at=(start+timedelta(minutes=20)).isoformat())
        self.adapter([(404,None),(201,self.event())]).ensure_visit(self.booking)
    def test_corrupt_snapshot_wrong_resource_expired_or_foreign_access_is_closed(self):
        for change in ({'resource_id':'second'},{'calendar_protocol':'legacy-sarsa004'},{'service_snapshot':{}},
                       {'practice_timezone':'invalid/zone'},{'request_id':str(uuid4()).replace('-','x')},
                       {'ends_at':self.booking['starts_at']},{'starts_at':None},{'request_id':'00000000-0000-0000-0000-000000000000'}):
            with self.subTest(change=change),self.assertRaises(WorkspaceFailure):
                InPersonCalendar(self.access,self.resource).body(self.booking|change)
        for resource,access in [(None,self.access),([],self.access),('calendar_unknown',self.access),('calendar_second',self.access),
             (self.resource,None),(self.resource,Access('access',datetime.now(timezone.utc)-timedelta(seconds=1),self.grant))]:
            with self.subTest(resource=resource),self.assertRaises(WorkspaceFailure):InPersonCalendar(access,resource)
        with self.assertRaises(WorkspaceFailure):calendar_resource(None)
    def test_endpoint_allowlist_redirects_and_malformed_responses_are_bounded(self):
        adapter=self.adapter([]);url=adapter.events+'/'+event_id(self.booking['id'],1)
        for method,target,kwargs in [('PATCH',url,{}),('GET','https://evil.example.test/',{}),('POST',url,{'body':{}}),
            ('GET',url+'?x=1',{}),('GET',url,{'headers':{'If-Match':'valid'}}),('DELETE',url,{'headers':{'If-Match':'bad\n'}})]:
            with self.assertRaisesRegex(WorkspaceFailure,'endpoint_invalid'):adapter.request(method,target,**kwargs)
        for response in (httpx.Response(302,headers={'location':'https://evil.example.test'}),
              httpx.Response(200,text='unexpected secret'),httpx.Response(200,json=[]),
              httpx.Response(200,content=b'{"x":'+b'['*40+b'0'+b']'*40+b'}',headers={'content-type':'application/json'}),
              httpx.Response(200,content=b' '*262145,headers={'content-type':'application/json'})):
            with self.assertRaises(WorkspaceFailure):self.adapter([response]).ensure_visit(self.booking)

class PrivateCalendarWorker(CalendarFixture):
    def test_existing_calendar_lane_routes_doctor_and_never_requests_video_or_waits(self):
        store=Mock();store.finish_google_delivery.return_value=True
        job=dict(kind='booking_calendar',recipient_role='calendar',attempts=1,payload=self.booking)
        store.claim_google_delivery.return_value=job
        service=SimpleNamespace(resources=object());adapter=Mock();adapter.ensure_visit.return_value={'event_id':'synthetic-event'}
        with patch('appointment_system.google_delivery.refresh_resource_connection',return_value=self.access) as refresh, \
             patch('appointment_system.google_delivery.InPersonCalendar',return_value=adapter), \
             patch('appointment_system.google_delivery.Workspace') as video:
            self.assertEqual(run_google_delivery_once(store,service),{'processed':1,'state':'done'})
            refresh.assert_called_once_with(store,service.resources,self.resource)
            self.assertEqual(store.finish_google_delivery.call_args.args[1:5],('done','synthetic-event',None,None))
            video.assert_not_called()
            for change,state in [({'obsolete':True},'obsolete'),({'kind':'booking_cancelled'},'done')]:
                store.claim_google_delivery.return_value=job|change
                self.assertEqual(run_google_delivery_once(store,service)['state'],state)
            self.assertEqual(adapter.cancel_visit.call_count,2)
    def test_missing_connection_conflict_revocation_and_lost_database_finish_keep_journal(self):
        store=Mock();store.finish_google_delivery.return_value=True
        job=dict(kind='booking_calendar',recipient_role='calendar',attempts=1,payload=self.booking)
        store.claim_google_delivery.return_value=job
        self.assertEqual(run_google_delivery_once(store,SimpleNamespace(resources=None))['state'],'failed')
        for error,state in [(GoogleFailure('google_reconnect_required'),'failed'),(WorkspaceFailure('google_event_mismatch'),'attention')]:
            with patch('appointment_system.google_delivery.refresh_resource_connection',side_effect=error):
                self.assertEqual(run_google_delivery_once(store,SimpleNamespace(resources=object()))['state'],state)
        job['payload']=self.booking|{'resource_id':'unknown'}
        self.assertEqual(run_google_delivery_once(store,SimpleNamespace(resources=object()))['state'],'attention')
        store.finish_google_delivery.return_value=False
        self.assertEqual(run_google_delivery_once(store,SimpleNamespace(resources=object())),{'processed':0,'retry':True})
