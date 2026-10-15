"""Explicit scheduling permission; never grants company or contact-edit access."""
from .configuration import installation, business


def agency_schedule_enabled():
    return business().get('version') == 2 and 'agency' in installation().get('schedule_management', [])


def can_manage_schedule(role):
    return role == 'client' or role == 'agency' and agency_schedule_enabled()


AGENCY_SCHEDULE_PATHS = frozenset({
    '/api/studio/status', '/api/studio/logout',
    '/api/studio/calendar/time-context', '/api/studio/calendar/resolve-time',
    '/api/studio/calendar/action-result', '/api/studio/calendar/list',
    '/api/studio/calendar/month', '/api/studio/calendar/close', '/api/studio/calendar/reopen',
    '/api/studio/appointments/action-result', '/api/studio/appointments/detail',
    '/api/studio/appointments/cancel', '/api/studio/appointments/reschedule',
})
