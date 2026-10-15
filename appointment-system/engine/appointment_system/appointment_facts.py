"""Validate frozen resource, visit and payment facts; never infer them from labels."""
import re
from urllib.parse import urlsplit

FIELDS = ('facts_version', 'resource_id', 'resource_name', 'payment_method',
          'amount_due_paise', 'location', 'display_duration')


def location_facts(value):
    if value is None:
        return None
    if type(value) is not dict or set(value) != {'name', 'address', 'maps_url'}:
        raise ValueError('Invalid saved visit location.')
    for key, maximum in (('name', 150), ('address', 500), ('maps_url', 2048)):
        field = value[key]
        if (type(field) is not str or not 1 <= len(field) <= maximum
                or not field.strip() or any(ord(c) < 32 or ord(c) == 127 for c in field)):
            raise ValueError('Invalid saved visit location.')
    try:
        parsed = urlsplit(value['maps_url'])
        if (parsed.scheme != 'https' or not parsed.hostname or parsed.username
                or parsed.password or parsed.port not in (None, 443)):
            raise ValueError()
    except ValueError:
        raise ValueError('Invalid saved visit location.') from None
    return dict(value)


def appointment_facts(row):
    """V1 emits no new fields. V2 is complete or rejected, never partly guessed."""
    if 'facts_version' not in row:
        if any(key in row for key in FIELDS[1:]):
            raise ValueError('Unversioned appointment facts.')
        if row.get('meeting_mode') == 'in_person' or row.get('payment_state') == 'due_at_clinic':
            raise ValueError('Missing appointment facts version.')
        return {}
    if (type(row['facts_version']) is not int or row['facts_version'] != 2
            or any(key not in row for key in FIELDS)
            or type(row['resource_id']) is not str
            or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,79}', row['resource_id'])
            or type(row['resource_name']) is not str or not 1 <= len(row['resource_name']) <= 150
            or not row['resource_name'].strip()
            or any(ord(c) < 32 or ord(c) == 127 for c in row['resource_name'])
            or row['payment_method'] not in ('online', 'at_clinic')
            or type(row['display_duration']) is not bool
            or type(row['amount_due_paise']) is not int
            or type(row.get('amount_paise')) is not int
            or not 0 <= row['amount_due_paise'] <= row['amount_paise']):
        raise ValueError('Invalid saved appointment facts.')
    location = location_facts(row['location'])
    if (row.get('meeting_mode') == 'in_person') != (location is not None):
        raise ValueError('Contradictory visit location.')
    if row['payment_method'] == 'at_clinic':
        if (row.get('order_state') != 'not_required' or row.get('payment_state') != 'due_at_clinic'
                or row.get('captured_paise') != 0 or row.get('refunded_paise') != 0
                or row.get('state') not in ('confirmed', 'cancelled')
                or row['amount_due_paise'] != (0 if row['state'] == 'cancelled' else row['amount_paise'])
                or row.get('provider_order_id') is not None or row.get('attempted_at') is not None):
            raise ValueError('Contradictory at-clinic payment facts.')
    elif row.get('order_state') == 'not_required' or row.get('payment_state') == 'due_at_clinic':
        raise ValueError('Contradictory online payment facts.')
    return {key: location if key == 'location' else row[key] for key in FIELDS}
