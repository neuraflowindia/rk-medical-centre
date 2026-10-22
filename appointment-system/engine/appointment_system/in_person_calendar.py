"""Private in-person calendar copies, confined to one declared doctor account.

The booking journal is authoritative. This adapter never sends invitations,
creates conferencing, reads other calendars, or retries a create blindly.
"""
from datetime import datetime, timezone
import re
from urllib.parse import quote, urlsplit
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx

from .configuration import installation, label, project_id
from .google_oauth import Access, resource_roles, resource_owners
from .google_workspace import WorkspaceFailure, event_id, response_document
from .receipt_view import timestamp
from .request_budget import BudgetExpired, chunks, observe_provider, provider_timeout


def calendar_resource(booking):
    """Only the immutable booking's configured resource selects a destination."""
    try:
        resource = booking['resource_id']
        if (type(resource) is not str or resource not in installation().get('resource_calendars', {})
                or booking['service_snapshot']['resource_id'] != resource
                or booking['service_snapshot']['meeting'] != 'in_person'
                or booking.get('calendar_protocol', 'v1') != 'v1'):
            raise ValueError()
        return 'calendar_' + resource
    except (KeyError, TypeError, ValueError):
        raise WorkspaceFailure('google_calendar_binding_invalid') from None


class InPersonCalendar:
    def __init__(self, access, resource, *, transport=None):
        if type(resource) is not str:
            raise WorkspaceFailure('google_calendar_binding_invalid')
        role = resource_roles().get(resource)
        owner = resource_owners().get(role)
        if (not resource.startswith('calendar_') or role is None or owner is None
                or not isinstance(access, Access) or access.grant.role != role
                or access.grant.email != owner or access.grant.resources != (resource,)
                or access.expires_at <= datetime.now(timezone.utc)):
            raise WorkspaceFailure('google_calendar_binding_invalid')
        self.access, self.resource, self.owner, self.transport = access, resource, owner, transport
        self.events = 'https://www.googleapis.com/calendar/v3/calendars/' + quote(owner, safe='') + '/events'

    @observe_provider('google')
    def request(self, method, url, *, body=None, headers=None, statuses=(200,)):
        parsed = urlsplit(url)
        event_url = re.fullmatch(re.escape(self.events) + r'/ab[a-f0-9]{64}', url)
        if (parsed.scheme != 'https' or parsed.netloc != 'www.googleapis.com' or parsed.query or parsed.fragment
                or method == 'POST' and (url != self.events or body is None or headers is not None)
                or method in ('GET', 'DELETE') and (event_url is None or body is not None)
                or method not in ('GET', 'POST', 'DELETE')
                or method != 'DELETE' and headers is not None
                or headers is not None and (set(headers) != {'If-Match'} or not isinstance(headers['If-Match'], str)
                    or not 1 <= len(headers['If-Match']) <= 1024 or any(ord(c) < 32 for c in headers['If-Match']))):
            raise WorkspaceFailure('google_endpoint_invalid')
        if self.access.expires_at <= datetime.now(timezone.utc):
            raise WorkspaceFailure('google_access_unavailable')
        request_headers = dict(headers or {}, Authorization='Bearer ' + self.access.token, Accept='application/json')
        try:
            with httpx.Client(transport=self.transport, timeout=provider_timeout(8), trust_env=False,
                              follow_redirects=False) as client:
                with client.stream(method, url, params=None if method == 'GET' else {'sendUpdates': 'none'},
                                   json=body, headers=request_headers) as response:
                    if response.status_code not in statuses:
                        raise WorkspaceFailure('google_service_unavailable', uncertain=method != 'GET')
                    if response.status_code in (204, 404, 409, 410, 412):
                        return response.status_code, None
                    if response.headers.get('content-type', '').split(';')[0].strip() != 'application/json':
                        raise WorkspaceFailure('google_response_invalid', uncertain=method != 'GET')
                    data = bytearray()
                    for chunk in chunks(response):
                        data.extend(chunk)
                        if len(data) > 262144:
                            raise WorkspaceFailure('google_response_invalid', uncertain=method != 'GET')
                    document = response_document(data)
                    if not isinstance(document, dict):
                        raise WorkspaceFailure('google_response_invalid', uncertain=method != 'GET')
                    return response.status_code, document
        except (BudgetExpired, httpx.HTTPError, ValueError, UnicodeError, RecursionError):
            raise WorkspaceFailure('google_service_unavailable', uncertain=method != 'GET') from None

    def body(self, booking):
        if calendar_resource(booking) != self.resource:
            raise WorkspaceFailure('google_calendar_binding_invalid')
        try:
            reference_id = UUID(str(booking['request_id']))
            if reference_id.int == 0 or UUID(str(booking['id'])).int == 0:
                raise ValueError()
            reference = str(reference_id)
            start, end = timestamp(booking['starts_at']), timestamp(booking['ends_at'])
            if end <= start or type(booking['practice_timezone']) is not str:
                raise ValueError()
            ZoneInfo(booking['practice_timezone'])
            identifier = event_id(booking['id'], booking['revision'])
        except (KeyError, TypeError, ValueError, OverflowError, ZoneInfoNotFoundError):
            raise WorkspaceFailure('google_calendar_binding_invalid') from None
        return {
            'id': identifier,
            'summary': label() + ' · Clinic appointment',
            'description': 'Appointment reference: ' + reference + '\nDetails stay in the clinic’s private appointment record.',
            'start': {'dateTime': start.isoformat(), 'timeZone': booking['practice_timezone']},
            'end': {'dateTime': end.isoformat(), 'timeZone': booking['practice_timezone']},
            'visibility': 'private', 'reminders': {'useDefault': False},
            'guestsCanInviteOthers': False, 'guestsCanModify': False, 'guestsCanSeeOtherGuests': False,
            'extendedProperties': {'private': {
                'installation': installation()['installation_id'], 'project': project_id(),
                'booking': str(UUID(str(booking['id']))), 'revision': str(booking['revision']),
                'resource': booking['resource_id']
            }}
        }

    def validate(self, event, booking):
        expected = self.body(booking)
        try:
            if (event['id'] != expected['id'] or event.get('status') == 'cancelled'
                    or event['organizer']['email'].lower() != self.owner
                    or event['extendedProperties']['private'] != expected['extendedProperties']['private']
                    or timestamp(event['start']['dateTime']) != timestamp(booking['starts_at'])
                    or timestamp(event['end']['dateTime']) != timestamp(booking['ends_at'])
                    or event.get('visibility') != 'private' or event.get('attendees', []) != []
                    or event.get('attendeesOmitted') is True or event.get('conferenceData') or event.get('hangoutLink')):
                raise ValueError()
        except (KeyError, TypeError, ValueError, AttributeError):
            raise WorkspaceFailure('google_event_mismatch') from None

    def ensure_visit(self, booking):
        body = self.body(booking)
        url = self.events + '/' + body['id']
        status, event = self.request('GET', url, statuses=(200, 404))
        if status == 404:
            status, event = self.request('POST', self.events, body=body, statuses=(200, 201, 409))
            if status == 409:
                _, event = self.request('GET', url)
        self.validate(event, booking)
        return {'state': 'ready', 'event_id': body['id']}

    def cancel_visit(self, booking):
        expected = self.body(booking)
        url = self.events + '/' + expected['id']
        status, event = self.request('GET', url, statuses=(200, 404, 410))
        if status in (404, 410):
            return
        if event.get('status') == 'cancelled':
            if event.get('id') != expected['id']:
                raise WorkspaceFailure('google_event_mismatch')
            return
        self.validate(event, booking)
        if not isinstance(event.get('etag'), str):
            raise WorkspaceFailure('google_event_mismatch')
        status, _ = self.request('DELETE', url, headers={'If-Match': event['etag']}, statuses=(204, 404, 410, 412))
        if status == 412:
            raise WorkspaceFailure('google_event_mismatch')
