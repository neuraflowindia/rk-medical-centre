"""Minimal version-one appointment emails from a saved delivery snapshot.

No notes, birth details, customer telephone or bearer receipt credentials enter
these messages. Frozen messages are reused by the dispatcher without rendering.
"""
import hashlib
import html
import json
import re
from uuid import UUID
from zoneinfo import ZoneInfo
from .configuration import label, installation
from .appointment_facts import location_facts
from .mail_identity import tags_for

from .email_events import SENDER, PROJECT_TAG
from .resend_email import REPLY_TO, EmailFailure
from .receipt_view import timestamp


def message_hash(payload):
    return hashlib.sha256(json.dumps(payload,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()


def render_message(job):
    try:
        job_id=str(UUID(job['id']))
        reference=str(UUID(job['payload']['reference']))
        data=job['payload']
        brand=label()
        kind,role=job['kind'],job['recipient_role']
        destination=job['destination']
        v2=data.get('facts_version')==2 and type(data.get('facts_version')) is int
        if 'facts_version' in data and not v2:raise ValueError()
        allowed=role=='customer' or role=='client' and destination==REPLY_TO
        if v2 and role in ('resource','agency'):
            declared=installation()
            expected=(declared.get('resource_notifications',{}).get(data.get('resource_id'))
                if role=='resource' else declared['owners']['agency_email'])
            allowed=bool(expected) and destination==expected
        if not allowed:
            raise ValueError()
        payment=data.get('payment_method','online')
        place=None
        if v2:
            if (any(key not in data for key in ('payment_method','location','amount_due_paise'))
                    or payment not in ('online','at_clinic') or type(data.get('display_duration')) is not bool
                    or type(data.get('amount_due_paise')) is not int or data['amount_due_paise']<0
                    or type(data.get('resource_id')) is not str
                    or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,79}',data['resource_id'])
                    or type(data.get('resource_name')) is not str or not 1<=len(data['resource_name'])<=150
                    or any(ord(c)<32 or ord(c)==127 for c in data['resource_name'])):
                raise ValueError()
            place=location_facts(data.get('location'))
            if (data.get('meeting')=='in_person')!=(place is not None):raise ValueError()
        elif payment!='online' or data.get('meeting')=='in_person':raise ValueError()
        if kind=='payment_review' and role in ('client','agency','resource') and payment=='online':
            subject='A payment needs review — '+brand
            lines=['A payment needs your attention. This is not an appointment confirmation.',
                   'Booking reference: '+reference,'Open the private studio to review the payment.']
        elif kind=='booking_cancelled':
            subject='Appointment cancelled — '+brand
            lines=['This appointment has been cancelled.','Booking reference: '+reference,
                   'No online payment was taken for this appointment.' if payment=='at_clinic' else
                   ('For cancellations or changes, contact the clinic.' if v2 else
                    'Cancellation does not confirm a refund. Please contact us about any refund due.')]
        elif kind in ('booking_ack','booking_details','booking_receipt') and (kind=='booking_ack' or role=='customer'):
            zone=ZoneInfo(data['practice_timezone'])
            start=timestamp(data['starts_at']).astimezone(zone)
            time_label='India time' if zone.key=='Asia/Kolkata' else zone.key.rsplit('/',1)[-1].replace('_',' ')+' time ('+start.strftime('%Z')+')'
            meeting=data['meeting']
            if meeting not in ('internal','google_meet','in_person'):raise ValueError()
            amount=data['amount_paise']
            if type(amount) is not int or amount<=0 or data['currency']!='INR':raise ValueError()
            service=data['service']
            if not isinstance(service,str) or not 1<=len(service)<=200 or any(ord(c)<32 for c in service):raise ValueError()
            subject=('Your appointment details' if kind in ('booking_details','booking_receipt') else 'Appointment confirmed')+' — '+brand
            lines=['Your appointment is confirmed.' if role=='customer' else
                   ('An appointment with payment due at the clinic is confirmed.' if payment=='at_clinic' else 'A paid appointment is confirmed.'),
                   service,start.strftime('%d %B %Y at %I:%M %p')+' ('+time_label+')',
                   f'Amount: INR {amount//100:,}.{amount%100:02d}', 'Booking reference: '+reference]
            if v2:
                lines.insert(2,'Doctor: '+data['resource_name'])
            if payment=='at_clinic':
                lines+=['Pay at the clinic. No online payment has been taken.']
            if kind=='booking_ack' and data.get('change_kind')=='rescheduled':
                subject='Appointment rescheduled — '+brand
                lines[0]='Your appointment has been moved to the time below.' if role=='customer' else 'An appointment has been rescheduled.'
                lines+=['This change does not request another payment.']
            if kind=='booking_ack' and data.get('change_kind')=='contact_corrected':
                subject='Appointment contact details updated — '+brand
                lines[0]=brand+' has updated the contact details for this appointment.'
                lines+=['Your appointment time and fee have not changed.']
            if kind=='booking_details' or kind=='booking_receipt' and meeting=='google_meet':
                link=data['meet_url']
                if meeting!='google_meet' or not isinstance(link,str) or not re.fullmatch(r'https://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}',link):raise ValueError()
                lines+=['Join your online appointment: '+link]
            elif role=='customer' and meeting=='google_meet':
                lines+=['Your meeting details will follow in a separate email.']
            elif meeting=='in_person':
                lines+=['Visit the clinic: '+place['name'],place['address'],'Directions: '+place['maps_url']]
            elif role=='customer':lines+=['For meeting arrangements, reply to this email.']
            elif meeting=='internal':lines+=['Arrange this meeting directly with the customer. Open the private studio for the record.']
            else:lines+=['Open the private studio for the appointment record.']
        else:raise ValueError()
        if v2 and role=='customer':
            instruction='For cancellations or changes, contact the clinic.'
            if instruction not in lines:lines.append(instruction)
            lines.extend(contact['label']+': '+contact['phone'] for contact in installation().get('public_contacts',[]))
        lines+=['For help, reply to this email.',brand]
        return {'from':SENDER,'to':[destination],'reply_to':REPLY_TO,'subject':subject,
                'text':'\n\n'.join(lines),'html':'<!doctype html><html lang="en"><body>'+''.join('<p>'+html.escape(line)+'</p>' for line in lines)+'</body></html>',
                'tags':tags_for(job_id,job.get('template_version',1))}
    except (KeyError,TypeError,ValueError,AttributeError):
        raise EmailFailure('email_message_invalid',definitely_rejected=True) from None
