"""First installation and company enrolment; never invoked by the web host."""
import argparse
from contextlib import contextmanager
import getpass
import json
import os
import re
import sys
import warnings
from pathlib import Path

# Direct invocation is supported on Windows and Linux without global imports.
# The installed script is always tools/setup.py inside its complete copy.
_entry=Path(__file__).absolute()
if any(path.is_symlink() for path in (_entry,*_entry.parents)):
    raise SystemExit('Contained setup links are forbidden.')
_root=_entry.parents[1]
sys.path[:0]=[str(_root),str(_root/'engine')]

from psycopg.types.json import Jsonb
from appointment_system.company_auth import password_hash,username
from appointment_system.settings import Installation,BusinessSettings


class SetupError(Exception):
    pass


@contextmanager
def owner(connection,installation):
    if not isinstance(installation,Installation) or not connection.autocommit:
        raise SetupError('setup_target_invalid')
    target=installation.document['database_targets'].get('migration')
    if target is None:raise SetupError('setup_target_invalid')
    with connection.transaction():
        connection.execute("SET LOCAL lock_timeout='2s'; SET LOCAL statement_timeout='10s'")
        connection.execute('SELECT pg_advisory_xact_lock(83124,5)')
        connection.execute('SELECT pg_advisory_xact_lock(83124,4)')
        actual=connection.execute("SELECT current_database(),session_user,pg_has_role(session_user,'appointment_system_owner','MEMBER')").fetchone()
        if actual!=(target['database'],target['role'],True):raise SetupError('setup_owner_required')
        yield


def installed(connection,installation):
    row=connection.execute('SELECT specification FROM appointment_system.installation WHERE singleton').fetchone()
    if row is None or row[0]!=installation.document:raise SetupError('setup_installation_mismatch')


def initialize(connection,installation,business):
    if not isinstance(business,BusinessSettings):raise SetupError('setup_business_invalid')
    with owner(connection,installation):
        previous=connection.execute('SELECT specification FROM appointment_system.installation WHERE singleton').fetchone()
        if previous is not None:
            installed(connection,installation)
            return {'status':'existing','changed':False}
        connection.execute('SELECT appointment_system.configure_installation(%s,%s,false)',
            (Jsonb(installation.document),Jsonb(business.document)))
        return {'status':'initialized','booking_enabled':False,'changed':True}



def configure_resource_calendars(connection,installation,*,expected_profile,expected_worker,new_worker):
    """Atomically fence an idle old release before adding private calendar work.

    The caller prepares and verifies the complete new app/worker first. This is
    an owner setup operation, never a web endpoint or a reset of live work.
    """
    from appointment_system.serialization import fingerprint
    if (not isinstance(installation,Installation) or not installation.document.get('resource_calendars')
        or any(type(value) is not str or not re.fullmatch(r'[a-f0-9]{64}',value)
               for value in (expected_profile,expected_worker,new_worker))):
        raise SetupError('setup_calendar_cutover_invalid')
    with owner(connection,installation):
        saved=connection.execute('SELECT specification FROM appointment_system.installation WHERE singleton FOR UPDATE').fetchone()
        state=connection.execute('SELECT enabled,requested_enabled FROM appointment_system.control_product_state WHERE singleton FOR UPDATE').fetchone()
        worker=connection.execute('SELECT release_digest,active_run,active_until FROM appointment_system.worker_release WHERE singleton FOR UPDATE').fetchone()
        if saved is None or fingerprint(saved[0])!=expected_profile:
            raise SetupError('setup_installation_changed')
        target=installation.document
        if {k:v for k,v in saved[0].items() if k!='resource_calendars'}!={k:v for k,v in target.items() if k!='resource_calendars'}:
            raise SetupError('setup_installation_mismatch')
        if state!=(False,False):raise SetupError('setup_booking_must_be_closed')
        if worker is None or worker[0]!=expected_worker:raise SetupError('setup_worker_release_changed')
        if worker[1:]!=(None,None):raise SetupError('setup_worker_busy')
        busy=connection.execute("""SELECT
         EXISTS(SELECT 1 FROM appointment_system.delivery_jobs WHERE lease_expires_at>clock_timestamp()) OR
         EXISTS(SELECT 1 FROM appointment_system.enquiry_delivery_jobs WHERE lease_expires_at>clock_timestamp()) OR
         EXISTS(SELECT 1 FROM appointment_system.booking_verification_mail WHERE lease_expires_at>clock_timestamp()) OR
         EXISTS(SELECT 1 FROM appointment_system.provider_inbox WHERE lease_expires_at>clock_timestamp()) OR
         EXISTS(SELECT 1 FROM appointment_system.payment_orders WHERE lease_expires_at>clock_timestamp()) OR
         EXISTS(SELECT 1 FROM appointment_system.payment_cases WHERE financial_lease_until>clock_timestamp()) OR
         EXISTS(SELECT 1 FROM appointment_system.google_resource_grants WHERE refresh_lease_until>clock_timestamp()) OR
         EXISTS(SELECT 1 FROM appointment_system.google_connections WHERE refresh_lease_until>clock_timestamp()) OR
         EXISTS(SELECT 1 FROM appointment_system.google_workbooks WHERE lease_until>clock_timestamp()) OR
         EXISTS(SELECT 1 FROM appointment_system.control_publications WHERE lease_until>clock_timestamp())""").fetchone()[0]
        if busy:raise SetupError('setup_delivery_busy')
        connection.execute('SELECT appointment_system.configure_worker_release(%s)',(new_worker,))
        result=connection.execute('SELECT appointment_system.configure_resource_calendars(%s,%s)',
            (expected_profile,Jsonb(target['resource_calendars']))).fetchone()[0]
        if result.get('profile_digest')!=fingerprint(target):raise SetupError('setup_installation_mismatch')
        installed(connection,installation)
        return {'status':'calendars_configured','profile_digest':result['profile_digest'],'worker_digest':new_worker,'booking_enabled':False}


def register(connection,installation):
    """Register declared existing provider-created logins without rotating passwords."""
    with owner(connection,installation):
        installed(connection,installation)
        targets=installation.document['database_targets']
        purposes=tuple(name for name in ('web','staff','worker','company','backup','maintenance','journal') if name in targets)
        if not purposes:raise SetupError('setup_database_login_missing')
        for purpose in purposes:
            declared=targets[purpose]
            row=connection.execute('SELECT rolcanlogin FROM pg_roles WHERE rolname=%s',(declared['role'],)).fetchone()
            if row!=(True,):raise SetupError('setup_database_login_missing')
            previous=connection.execute('SELECT purpose,installation_id::text,environment,writer_contract,enabled FROM appointment_system.caller_logins WHERE login_role=%s',(declared['role'],)).fetchone()
            expected=(purpose,installation.installation_id,installation.document['environment'],1,True)
            if previous is not None and previous!=expected:raise SetupError('setup_database_login_requires_review')
        for purpose in purposes:
            accepted=connection.execute('SELECT appointment_system.provision_login(%s,%s)',
                (targets[purpose]['role'],purpose)).fetchone()
            if accepted!=(True,):raise SetupError('setup_database_login_rejected')
        return {'status':'registered','purposes':list(purposes),'passwords_changed':False}


def enroll(connection,installation,name,secret):
    name=username(name);encoded=password_hash(secret)
    with owner(connection,installation):
        installed(connection,installation)
        # First enrolment only. Re-running setup must not reset a working
        # password or create another company identity after a lost response.
        if connection.execute('SELECT EXISTS(SELECT 1 FROM appointment_system.company_credentials)').fetchone()[0]:
            raise SetupError('setup_company_already_enrolled')
        connection.execute('SELECT appointment_system.provision_company_password(%s,%s)',(name,encoded)).fetchone()
        return {'status':'enrolled','changed':True}


def main(argv=None,environment=None):
    parser=argparse.ArgumentParser(description='Configure this contained booking installation; secrets are never command arguments or printed.')
    parser.add_argument('action',choices=('install-schema','initialize','register-logins','enroll-company'))
    args=parser.parse_args(argv)
    source=dict(os.environ if environment is None else environment)
    try:
        from appointment_system.runtime import contained_release
        from appointment_system.configuration import load
        root,_=contained_release();profile=load(root.parent/'appointment-settings/project.json')
        from tools.conversion.handover import migration_connection
        name=secret=None
        if args.action=='enroll-company':
            if not sys.stdin.isatty():raise SetupError('setup_private_terminal_required')
            name=input('Company username: ')
            # A nominal terminal can still lack hidden input. Never allow
            # getpass to fall back to displaying the company password.
            with warnings.catch_warnings():
                warnings.simplefilter('error',getpass.GetPassWarning)
                try:
                    secret=getpass.getpass('Company password (15–128 characters): ')
                    repeated=getpass.getpass('Repeat company password: ')
                except getpass.GetPassWarning:
                    raise SetupError('setup_private_terminal_required') from None
            if secret!=repeated:raise SetupError('setup_password_mismatch')
        with migration_connection(source.get('BOOKING_MIGRATION_DATABASE_URL',''),profile.installation) as connection:
            if args.action=='install-schema':
                target=profile.installation.document['database_targets']['migration']
                actual=connection.execute('SELECT current_database(),session_user').fetchone()
                if actual!=(target['database'],target['role']):raise SetupError('setup_target_invalid')
                from appointment_system.migrate import apply
                apply(connection);result={'status':'schema_verified'}
            elif args.action=='initialize':result=initialize(connection,profile.installation,profile.initial_business)
            elif args.action=='register-logins':result=register(connection,profile.installation)
            else:result=enroll(connection,profile.installation,name,secret)
        print(json.dumps({'project':profile.installation.document['project_id'],'action':args.action,**result},sort_keys=True))
        return 0
    except (KeyboardInterrupt,EOFError):
        print('Setup cancelled.',file=sys.stderr);return 1
    except Exception as error:
        code=str(error) if isinstance(error,SetupError) else 'setup_failed'
        print(json.dumps({'status':'failed','code':code}),file=sys.stderr);return 1


if __name__=='__main__':raise SystemExit(main())
