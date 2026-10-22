-- Optional, private per-resource Calendars. No existing grant, booking or history is rewritten.
SET LOCAL ROLE appointment_system_owner;

CREATE FUNCTION appointment_system.resource_calendar_map_valid(p_manifest jsonb,p_business jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path TO pg_catalog,appointment_system,pg_temp AS $$
DECLARE item record; calendars jsonb:=coalesce(p_manifest->'resource_calendars','{}'::jsonb);
BEGIN
 IF jsonb_typeof(calendars) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_each(calendars))>100 THEN RETURN false;END IF;
 IF calendars='{}'::jsonb THEN RETURN true;END IF;
 IF p_business->'version' IS DISTINCT FROM '2'::jsonb OR p_business->>'meeting' IS DISTINCT FROM 'in_person'
  OR jsonb_typeof(p_business->'resources') IS DISTINCT FROM 'array' THEN RETURN false;END IF;
 FOR item IN SELECT * FROM jsonb_each(calendars) LOOP
  IF item.key !~ '^[a-z0-9][a-z0-9-]{0,79}$' OR jsonb_typeof(item.value) IS DISTINCT FROM 'string'
   OR length(item.value#>>'{}') NOT BETWEEN 3 AND 254
   OR item.value#>>'{}' IS DISTINCT FROM lower(item.value#>>'{}')
   OR item.value#>>'{}' !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
   OR item.value IS DISTINCT FROM p_manifest#>ARRAY['resource_notifications',item.key]
   OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_business->'resources') r WHERE r->>'id'=item.key)
  THEN RETURN false;END IF;
 END LOOP;
 RETURN (SELECT count(*)=count(DISTINCT value) FROM jsonb_each(calendars));
END $$;

CREATE FUNCTION appointment_system.google_resource_owner(p_resource text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog,appointment_system,pg_temp AS $$
 SELECT CASE WHEN p_resource='agency_sheet' THEN appointment_system.installation_value('owners.agency_email')
  WHEN p_resource IN ('calendar','client_sheet') THEN appointment_system.installation_value('owners.client_email')
  WHEN p_resource ~ '^calendar_[a-z0-9][a-z0-9-]{0,79}$'
   THEN specification#>>ARRAY['resource_calendars',substr(p_resource,10)] END
 FROM appointment_system.installation WHERE singleton
$$;

CREATE FUNCTION appointment_system.google_resource_role(p_resource text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog,appointment_system,pg_temp AS $$
 SELECT CASE WHEN p_resource='agency_sheet' THEN 'agency'
  WHEN p_resource IN ('calendar','client_sheet') THEN 'client'
  WHEN appointment_system.google_resource_owner(p_resource) IS NOT NULL THEN 'doctor-'||substr(p_resource,10) END
$$;

ALTER TABLE appointment_system.google_resources DROP CONSTRAINT google_resources_resource_check;
ALTER TABLE appointment_system.google_resources ADD CONSTRAINT google_resources_resource_check CHECK
 (resource IN ('calendar','client_sheet','agency_sheet') OR resource ~ '^calendar_[a-z0-9][a-z0-9-]{0,79}$');
ALTER TABLE appointment_system.google_resource_grants DROP CONSTRAINT google_resource_grants_owner_role_check;
ALTER TABLE appointment_system.google_resource_grants ADD CONSTRAINT google_resource_grants_owner_role_check CHECK
 (owner_role IN ('client','agency') OR owner_role ~ '^doctor-[a-z0-9][a-z0-9-]{0,79}$');


CREATE OR REPLACE FUNCTION appointment_system.resource_scopes_valid(p_resources text[], p_scopes jsonb) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE normalized text[];cal text[]:=ARRAY['https://www.googleapis.com/auth/calendar.events.owned','https://www.googleapis.com/auth/userinfo.email','openid'];
 sheet text[]:=ARRAY['https://www.googleapis.com/auth/drive.file','https://www.googleapis.com/auth/userinfo.email','openid'];
 combo text[]:=ARRAY['https://www.googleapis.com/auth/calendar.events.owned','https://www.googleapis.com/auth/drive.file','https://www.googleapis.com/auth/userinfo.email','openid'];
 wide_sheet text[]:=ARRAY['https://www.googleapis.com/auth/drive.file','https://www.googleapis.com/auth/spreadsheets','https://www.googleapis.com/auth/userinfo.email','openid'];
 desktop_sheet text[]:=ARRAY['https://www.googleapis.com/auth/drive.file','https://www.googleapis.com/auth/spreadsheets'];
 readonly_cal text[]:=ARRAY['https://www.googleapis.com/auth/calendar.calendars.readonly','https://www.googleapis.com/auth/calendar.events.owned','https://www.googleapis.com/auth/userinfo.email','openid'];
BEGIN
 IF jsonb_typeof(p_scopes) IS DISTINCT FROM 'array' OR jsonb_array_length(p_scopes) NOT BETWEEN 1 AND 8
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_scopes) a WHERE jsonb_typeof(a)<>'string') THEN RETURN false; END IF;
 SELECT array_agg(s ORDER BY s) INTO normalized FROM (SELECT CASE WHEN a#>>'{}'='email' THEN 'https://www.googleapis.com/auth/userinfo.email' ELSE a#>>'{}' END s FROM jsonb_array_elements(p_scopes) a)q;
 IF cardinality(normalized)<>(SELECT count(DISTINCT x) FROM unnest(normalized)x) THEN RETURN false; END IF;
 RETURN CASE WHEN cardinality(p_resources)=1 AND p_resources[1] ~ '^calendar_[a-z0-9][a-z0-9-]{0,79}$' THEN normalized=cal
  WHEN p_resources=ARRAY['calendar'] THEN normalized IN (cal,readonly_cal,combo)
  WHEN p_resources=ARRAY['client_sheet'] THEN normalized IN (sheet,wide_sheet,desktop_sheet,combo)
  WHEN p_resources=ARRAY['agency_sheet'] THEN normalized IN (sheet,wide_sheet,desktop_sheet)
  WHEN p_resources=ARRAY['calendar','client_sheet'] THEN normalized=combo ELSE false END;
END $$;

CREATE OR REPLACE FUNCTION appointment_system.configure_installation(p_manifest jsonb, p_business jsonb, p_enabled boolean) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $_$
DECLARE contact jsonb; labels text[]:=ARRAY[]::text[]; destination record; identifier uuid; old appointment_system.installation%ROWTYPE; digest text;
BEGIN
 IF p_enabled IS NULL OR NOT appointment_system.exact_keys(p_manifest-ARRAY['resource_notifications','schedule_management','public_contacts','resource_calendars'],ARRAY[
  'version','installation_id','project_id','label','environment','origin','aliases','database_targets',
  'owners','sender','providers','worker','surfaces'])
  OR p_manifest->'version' IS DISTINCT FROM '1'::jsonb
  OR coalesce(p_manifest->>'project_id','') !~ '^[a-z0-9][a-z0-9-]{0,79}$'
  OR coalesce(p_manifest->>'environment','') NOT IN ('development','test','production')
  OR coalesce(p_manifest->>'origin','') !~ '^https?://[a-z0-9.-]+(:[0-9]+)?$'
  OR NOT appointment_system.validate_business(p_business)
  OR NOT appointment_system.resource_calendar_map_valid(p_manifest,p_business)
 THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='invalid installation settings'; END IF;
 IF p_manifest ? 'public_contacts' THEN
  IF jsonb_typeof(p_manifest->'public_contacts') IS DISTINCT FROM 'array' OR jsonb_array_length(p_manifest->'public_contacts') NOT BETWEEN 1 AND 10 THEN
   RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='invalid public contacts'; END IF;
  FOR contact IN SELECT value FROM jsonb_array_elements(p_manifest->'public_contacts') LOOP
   IF NOT appointment_system.exact_keys(contact,ARRAY['label','phone']) OR jsonb_typeof(contact->'label') IS DISTINCT FROM 'string'
    OR length(btrim(contact->>'label')) NOT BETWEEN 1 AND 100 OR contact->>'label' ~ '[[:cntrl:]]' OR contact->>'label'=ANY(labels)
    OR jsonb_typeof(contact->'phone') IS DISTINCT FROM 'string' OR contact->>'phone' !~ '^\+[1-9][0-9]{6,14}$' THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='invalid public contacts'; END IF;
   labels:=array_append(labels,contact->>'label');
  END LOOP;
 END IF;
 IF p_manifest ? 'resource_notifications' THEN
  IF jsonb_typeof(p_manifest->'resource_notifications') IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_each(p_manifest->'resource_notifications'))>100 THEN
   RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='invalid resource notifications'; END IF;
  FOR destination IN SELECT key,value FROM jsonb_each(p_manifest->'resource_notifications') LOOP
   IF destination.key !~ '^[a-z0-9][a-z0-9-]{0,79}$' OR jsonb_typeof(destination.value) IS DISTINCT FROM 'string'
    OR length(destination.value#>>'{}') NOT BETWEEN 3 AND 254
    OR destination.value#>>'{}' IS DISTINCT FROM lower(destination.value#>>'{}')
    OR destination.value#>>'{}' !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$' THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='invalid resource notifications'; END IF;
  END LOOP;
 END IF;
 IF p_manifest ? 'schedule_management' AND p_manifest->'schedule_management' NOT IN ('["agency"]'::jsonb,'["client"]'::jsonb,'["client","agency"]'::jsonb,'["agency","client"]'::jsonb) THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='invalid schedule management'; END IF;
 BEGIN identifier:=(p_manifest->>'installation_id')::uuid;
 EXCEPTION WHEN invalid_text_representation THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='invalid installation identity';
 END;
 IF identifier IS NULL OR identifier::text IS DISTINCT FROM p_manifest->>'installation_id'
  OR identifier='00000000-0000-0000-0000-000000000000'::uuid
 THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='invalid installation identity'; END IF;
 PERFORM pg_advisory_xact_lock(83124,4);
 SELECT * INTO old FROM appointment_system.installation WHERE singleton FOR UPDATE;
 IF FOUND AND (old.installation_id IS DISTINCT FROM identifier
  OR old.specification IS DISTINCT FROM p_manifest)
 THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='installation identity cannot be replaced'; END IF;
 INSERT INTO appointment_system.installation(installation_id,project_id,environment,specification)
 VALUES(identifier,p_manifest->>'project_id',p_manifest->>'environment',p_manifest)
 ON CONFLICT(singleton) DO NOTHING;
 digest:=appointment_system.settings_digest(p_business);
 INSERT INTO appointment_system.booking_policies(version,specification) VALUES(digest,p_business)
 ON CONFLICT(version) DO NOTHING;
 INSERT INTO appointment_system.intake_settings(policy_version,public_open,schedule_browsing_open)
 VALUES(digest,false,true) ON CONFLICT(singleton) DO NOTHING;
 -- Bootstrap respects a pre-existing switch and never reactivates a restored installation.
 INSERT INTO appointment_system.control_product_state
  (singleton,project,environment,origin,enabled,requested_enabled,restore_generation,generation_sequence,revision,activation_epoch,updated_at,provenance)
 VALUES(true,p_manifest->>'project_id',p_manifest->>'environment',p_manifest->>'origin',
  p_enabled,p_enabled,gen_random_uuid(),1,1,gen_random_uuid(),clock_timestamp(),'existing_service') ON CONFLICT(singleton) DO NOTHING;
 RETURN jsonb_build_object('installation_id',identifier,'policy_version',digest);
END $_$;

CREATE OR REPLACE FUNCTION appointment_system.configure_google_resources(p_resources jsonb) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $_$
DECLARE item record;expected text;previous appointment_system.google_resources%ROWTYPE;clients text[];
BEGIN
 PERFORM appointment_system.require_registered_caller(ARRAY[]::text[]);
 IF jsonb_typeof(p_resources) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(p_resources)) NOT BETWEEN 1 AND 103
 THEN RETURN false; END IF;
 FOR item IN SELECT * FROM jsonb_each(p_resources) ORDER BY key LOOP
  expected:=appointment_system.google_resource_owner(item.key);
  IF expected IS NULL
   OR NOT appointment_system.exact_keys(item.value,ARRAY['owner_email','active_client','retained_clients'])
   OR item.value->>'owner_email' IS DISTINCT FROM expected
   OR jsonb_typeof(item.value->'retained_clients') IS DISTINCT FROM 'array'
   OR jsonb_array_length(item.value->'retained_clients') NOT BETWEEN 1 AND 8
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(item.value->'retained_clients') k WHERE jsonb_typeof(k)<>'string' OR k#>>'{}' !~ '^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$')
  THEN RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='resource configuration invalid'; END IF;
  SELECT array_agg(k#>>'{}') INTO clients FROM jsonb_array_elements(item.value->'retained_clients') k;
  IF cardinality(clients)<>(SELECT count(DISTINCT c) FROM unnest(clients)c) OR NOT (item.value->>'active_client'=ANY(clients))
  THEN RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='resource clients invalid'; END IF;
  SELECT * INTO previous FROM appointment_system.google_resources WHERE resource=item.key FOR UPDATE;
  IF FOUND AND (previous.owner_email<>expected OR previous.grant_id IS NOT NULL AND EXISTS(
    SELECT 1 FROM appointment_system.google_resource_grants g WHERE g.id=previous.grant_id AND NOT g.client_id=ANY(clients)) OR EXISTS(SELECT 1 FROM appointment_system.google_workbook_volumes v WHERE v.role=CASE WHEN item.key='client_sheet' THEN 'client' WHEN item.key='agency_sheet' THEN 'agency' ELSE '' END AND NOT v.client_id=ANY(clients)))
  THEN RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='saved resource connection must be retained'; END IF;
  INSERT INTO appointment_system.google_resources(resource,owner_email,active_client,retained_clients)
   VALUES(item.key,expected,item.value->>'active_client',clients) ON CONFLICT(resource) DO UPDATE
   SET active_client=excluded.active_client,retained_clients=excluded.retained_clients,updated_at=clock_timestamp();
 END LOOP;RETURN true;
END $_$;

CREATE OR REPLACE FUNCTION appointment_system.install_resource_grant(p_resource text, p_expected bigint, p_id uuid, p_subject text, p_email text, p_client text, p_resources text[], p_scopes jsonb, p_encrypted text, p_expires timestamp with time zone, p_format text) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $_$
DECLARE target appointment_system.google_resources%ROWTYPE;candidate record;connection_role text;
BEGIN
 IF p_resource IS NULL OR p_expected IS NULL OR p_id IS NULL OR p_id='00000000-0000-0000-0000-000000000000'
  OR p_subject IS NULL OR length(p_subject) NOT BETWEEN 1 AND 255 OR p_subject ~ '[[:cntrl:]]'
  OR p_encrypted IS NULL OR length(p_encrypted) NOT BETWEEN 100 AND 32768
  OR p_format IS NULL OR p_format !~ '^[a-z0-9][a-z0-9-]{0,63}$'
  OR (p_expires IS NOT NULL AND (NOT isfinite(p_expires) OR p_expires<=clock_timestamp()))
  OR NOT coalesce(appointment_system.resource_scopes_valid(p_resources,p_scopes),false)
  OR NOT p_resource=ANY(p_resources) THEN RETURN false; END IF;
 PERFORM 1 FROM appointment_system.google_resources WHERE resource=ANY(p_resources) ORDER BY resource FOR UPDATE;
 SELECT * INTO target FROM appointment_system.google_resources WHERE resource=p_resource;
 IF NOT FOUND OR target.revision<>p_expected OR target.owner_email IS DISTINCT FROM p_email OR NOT p_client=ANY(target.retained_clients)
  OR (SELECT count(*) FROM appointment_system.google_resources WHERE resource=ANY(p_resources))<>cardinality(p_resources)
  OR EXISTS(SELECT 1 FROM appointment_system.google_resources WHERE resource=ANY(p_resources)
   AND (owner_email<>p_email OR NOT p_client=ANY(retained_clients) OR resource<>p_resource AND revision<>0))
 THEN RETURN false; END IF;
 connection_role:=appointment_system.google_resource_role(p_resource);
 IF connection_role IS NULL OR appointment_system.google_resource_owner(p_resource) IS DISTINCT FROM p_email THEN RETURN false;END IF;
 INSERT INTO appointment_system.google_resource_grants(id,owner_role,owner_email,subject,client_id,resources,scopes,encrypted_grant,grant_format,grant_expires_at)
 VALUES(p_id,connection_role,p_email,p_subject,p_client,p_resources,p_scopes,p_encrypted,p_format,p_expires);
 UPDATE appointment_system.google_resources SET grant_id=p_id,revision=revision+1,updated_at=clock_timestamp() WHERE resource=ANY(p_resources);

 RETURN true;
END $_$;

CREATE OR REPLACE FUNCTION appointment_system.claim_google_resource_refresh(p_resource text, p_grant uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE target appointment_system.google_resources%ROWTYPE;g appointment_system.google_resource_grants%ROWTYPE;token uuid:=gen_random_uuid();
BEGIN
 PERFORM appointment_system.require_registered_caller(ARRAY['worker','staff','company']);
 IF EXISTS(SELECT 1 FROM appointment_system.caller_logins WHERE login_role=session_user AND purpose='staff')
  AND p_resource NOT IN ('calendar','client_sheet') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='resource access denied'; END IF;
 SELECT * INTO target FROM appointment_system.google_resources WHERE resource=p_resource FOR SHARE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO g FROM appointment_system.google_resource_grants WHERE id=CASE WHEN p_grant IS NOT NULL AND EXISTS(SELECT 1 FROM appointment_system.google_resource_grants old JOIN appointment_system.google_resource_grants current ON current.id=target.grant_id WHERE old.id=p_grant AND old.client_id=current.client_id AND old.subject=current.subject AND old.owner_email=current.owner_email) THEN target.grant_id ELSE coalesce(p_grant,target.grant_id) END FOR UPDATE;
 IF NOT FOUND OR (g.id<>target.grant_id AND NOT EXISTS(SELECT 1 FROM appointment_system.google_workbook_volumes v WHERE v.grant_id=g.id AND v.subject=g.subject AND v.client_id=g.client_id AND v.role=CASE WHEN p_resource='client_sheet' THEN 'client' WHEN p_resource='agency_sheet' THEN 'agency' ELSE '' END)) OR g.revoked_at IS NOT NULL OR g.owner_email<>target.owner_email OR NOT p_resource=ANY(g.resources)
  OR NOT g.client_id=ANY(target.retained_clients) OR (g.grant_expires_at IS NOT NULL AND g.grant_expires_at<=clock_timestamp()) THEN RETURN NULL; END IF;
 IF g.last_error_code='google_reconnect_required' THEN RETURN jsonb_build_object('code','google_reconnect_required'); END IF;
 IF g.refresh_lease_until>clock_timestamp() THEN RETURN NULL; END IF;
 UPDATE appointment_system.google_resource_grants SET refresh_lease=token,refresh_lease_until=clock_timestamp()+interval '90 seconds',refresh_revision=revision WHERE id=g.id;
 RETURN jsonb_build_object('grant_id',g.id,'resource',p_resource,'resource_revision',target.revision,'owner_email',g.owner_email,
  'subject',g.subject,'client_id',g.client_id,'resources',g.resources,'scopes',g.scopes,'revision',g.revision,
  'lease',token,'encrypted_grant',g.encrypted_grant,'grant_format',g.grant_format,'grant_expires_at',g.grant_expires_at,'server_now',clock_timestamp());
END $$;

CREATE OR REPLACE FUNCTION appointment_system.finish_google_resource_refresh(p_resource text, p_id uuid, p_revision bigint, p_resource_revision bigint, p_lease uuid, p_encrypted text, p_expires timestamp with time zone, p_scopes jsonb, p_error text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE target appointment_system.google_resources%ROWTYPE;g appointment_system.google_resource_grants%ROWTYPE;
BEGIN
 PERFORM appointment_system.require_registered_caller(ARRAY['worker','staff','company']);
 IF EXISTS(SELECT 1 FROM appointment_system.caller_logins WHERE login_role=session_user AND purpose='staff')
  AND p_resource NOT IN ('calendar','client_sheet') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='resource access denied'; END IF;
 SELECT * INTO target FROM appointment_system.google_resources WHERE resource=p_resource AND revision=p_resource_revision AND (grant_id=p_id OR EXISTS(SELECT 1 FROM appointment_system.google_workbook_volumes v WHERE v.grant_id=p_id AND v.role=CASE WHEN p_resource='client_sheet' THEN 'client' WHEN p_resource='agency_sheet' THEN 'agency' ELSE '' END)) FOR SHARE;
 IF NOT FOUND THEN RETURN false; END IF;
 SELECT * INTO g FROM appointment_system.google_resource_grants WHERE id=p_id AND revision=p_revision
  AND refresh_revision=p_revision AND refresh_lease=p_lease AND refresh_lease_until>clock_timestamp() AND revoked_at IS NULL FOR UPDATE;
 IF NOT FOUND OR g.owner_email<>target.owner_email OR NOT p_resource=ANY(g.resources) OR NOT g.client_id=ANY(target.retained_clients) THEN RETURN false; END IF;
 IF p_error IS NOT NULL THEN
  IF p_error NOT IN ('google_reconnect_required','google_request_failed','google_account_mismatch','google_permissions_mismatch','google_token_invalid','google_saved_grant_invalid') THEN RETURN false; END IF;
  UPDATE appointment_system.google_resource_grants SET refresh_lease=NULL,refresh_lease_until=NULL,refresh_revision=NULL,last_error_code=p_error WHERE id=p_id;
  RETURN true;
 END IF;
 IF p_encrypted IS NULL OR length(p_encrypted) NOT BETWEEN 100 AND 32768
  OR NOT coalesce(appointment_system.resource_scopes_valid(g.resources,p_scopes),false)
  OR (SELECT array_agg(CASE WHEN s#>>'{}'='email' THEN 'https://www.googleapis.com/auth/userinfo.email' ELSE s#>>'{}' END ORDER BY CASE WHEN s#>>'{}'='email' THEN 'https://www.googleapis.com/auth/userinfo.email' ELSE s#>>'{}' END) FROM jsonb_array_elements(g.scopes)s)
     IS DISTINCT FROM (SELECT array_agg(s#>>'{}' ORDER BY s#>>'{}') FROM jsonb_array_elements(p_scopes)s)
  OR (p_expires IS NOT NULL AND (NOT isfinite(p_expires) OR p_expires<=clock_timestamp())) THEN RETURN false; END IF;
 UPDATE appointment_system.google_resource_grants SET encrypted_grant=p_encrypted,grant_format='v1',scopes=p_scopes,
  grant_expires_at=p_expires,revision=revision+1,refresh_lease=NULL,refresh_lease_until=NULL,refresh_revision=NULL,last_error_code=NULL WHERE id=p_id;
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION appointment_system.company_save_business_settings(p_session text, p_csrf text, p_operation uuid, p_expected bigint, p_spec jsonb, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE actor text;old appointment_system.company_configuration_actions%ROWTYPE;
 config appointment_system.intake_settings%ROWTYPE;digest text;result jsonb;
BEGIN
 PERFORM appointment_system.require_registered_caller(ARRAY['company']);
 IF p_operation IS NULL OR p_expected IS NULL OR p_expected<1 OR p_expected>=9223372036854775807
 OR coalesce(length(btrim(p_reason)),0) NOT BETWEEN 5 AND 300 OR p_reason ~ '[[:cntrl:]]'
 OR appointment_system.validate_business(p_spec) IS DISTINCT FROM true THEN
  RAISE EXCEPTION USING ERRCODE='P0422',MESSAGE='invalid business settings'; END IF;
 PERFORM pg_advisory_xact_lock_shared(83124,4);
 IF NOT appointment_system.resource_calendar_map_valid((SELECT specification FROM appointment_system.installation WHERE singleton),p_spec) THEN
  RAISE EXCEPTION USING ERRCODE='P0422',MESSAGE='calendar resources must remain declared';END IF;
 actor:=appointment_system.control_authorize(p_session,'service_controller',p_csrf,false);
 SELECT * INTO config FROM appointment_system.intake_settings WHERE singleton FOR UPDATE;
 SELECT * INTO old FROM appointment_system.company_configuration_actions WHERE operation_id=p_operation;
 IF FOUND THEN
  IF old.actor IS DISTINCT FROM actor OR old.expected_revision IS DISTINCT FROM p_expected
   OR old.specification IS DISTINCT FROM p_spec OR old.reason IS DISTINCT FROM p_reason THEN
   RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='configuration operation changed'; END IF;
  RETURN old.result;
 END IF;
 PERFORM appointment_system.control_authorize(p_session,'service_controller',p_csrf,true);
 IF config.configuration_revision<>p_expected THEN
  RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='business settings changed'; END IF;
 IF EXISTS(SELECT 1 FROM appointment_system.booking_policies WHERE version=config.policy_version AND specification->'version'='1'::jsonb)
 AND p_spec->'version'='2'::jsonb AND EXISTS(SELECT 1 FROM appointment_system.slot_claims WHERE resource_id='default' AND released_at IS NULL AND ends_at>clock_timestamp()) THEN
 RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='capacity cutover requires resolving existing default claims';END IF;
 IF p_spec->'version'='1'::jsonb AND EXISTS(SELECT 1 FROM appointment_system.slot_claims WHERE resource_id<>'default' AND released_at IS NULL AND ends_at>clock_timestamp()) THEN
 RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='capacity downgrade requires resolving existing resource claims';END IF;
 IF p_spec->'version'='2'::jsonb AND EXISTS(SELECT 1 FROM appointment_system.slot_claims c WHERE c.resource_id<>'default' AND c.released_at IS NULL AND c.ends_at>clock_timestamp()
  AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_spec->'resources') r WHERE r->>'id'=c.resource_id)) THEN
 RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='resource with active claims cannot be removed';END IF;
 digest:=appointment_system.settings_digest(p_spec);
 INSERT INTO appointment_system.booking_policies(version,specification) VALUES(digest,p_spec)
 ON CONFLICT(version) DO NOTHING;
 UPDATE appointment_system.intake_settings SET policy_version=digest,configuration_revision=configuration_revision+1 WHERE singleton;
 result:=jsonb_build_object('saved',true,'revision',(config.configuration_revision+1)::text,'quote_version',digest);
 INSERT INTO appointment_system.company_configuration_actions(operation_id,actor,expected_revision,
  configuration_revision,settings_digest,specification,reason,result)
 VALUES(p_operation,actor,p_expected,config.configuration_revision+1,digest,p_spec,p_reason,result);
 RETURN result;
END $$;

-- Only the schema owner can append mappings during a closed, expected-profile cutover.
-- Existing mappings are immutable: old remote events and outstanding cleanup retain their owner.
CREATE FUNCTION appointment_system.configure_resource_calendars(p_expected text,p_calendars jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path TO pg_catalog,appointment_system,pg_temp AS $$
DECLARE saved appointment_system.installation%ROWTYPE; product appointment_system.control_product_state%ROWTYPE;
 next_spec jsonb; old_calendars jsonb; digest text;
BEGIN
 IF NOT pg_has_role(session_user,'appointment_system_owner','MEMBER') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='owner setup required';END IF;
 IF p_expected IS NULL OR p_expected !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION USING ERRCODE='P0422',MESSAGE='expected installation digest required';END IF;
 PERFORM pg_advisory_xact_lock(83124,4);
 SELECT * INTO saved FROM appointment_system.installation WHERE singleton FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='installation is missing';END IF;
 SELECT * INTO product FROM appointment_system.control_product_state WHERE singleton FOR UPDATE;
 IF NOT FOUND OR product.enabled OR product.requested_enabled THEN RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='booking must be closed';END IF;
 IF appointment_system.settings_digest(saved.specification) IS DISTINCT FROM p_expected THEN
  RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='installation changed';END IF;
 next_spec:=saved.specification||jsonb_build_object('resource_calendars',p_calendars);
 old_calendars:=coalesce(saved.specification->'resource_calendars','{}'::jsonb);
 IF NOT appointment_system.resource_calendar_map_valid(next_spec,appointment_system.current_business())
  OR EXISTS(SELECT 1 FROM jsonb_each(old_calendars) old WHERE old.value IS DISTINCT FROM p_calendars->old.key) THEN
  RAISE EXCEPTION USING ERRCODE='P0422',MESSAGE='calendar mappings must match existing resources and preserve saved owners';END IF;
 UPDATE appointment_system.installation SET specification=next_spec WHERE singleton;
 -- Seed the existing durable lane for confirmed records when a map is first added.
 INSERT INTO appointment_system.delivery_jobs(id,booking_id,kind,recipient_role,booking_revision,payload)
 SELECT gen_random_uuid(),b.id,'booking_calendar','calendar',b.revision,appointment_system.booking_snapshot(b.id)
 FROM appointment_system.bookings b WHERE b.state='confirmed' AND b.service_snapshot->>'meeting'='in_person'
  AND p_calendars ? b.resource_id
 ON CONFLICT(kind,booking_id,recipient_role,booking_revision,event_key) DO NOTHING;
 digest:=appointment_system.settings_digest(next_spec);
 RETURN jsonb_build_object('installation_id',saved.installation_id,'profile_digest',digest,'resource_calendars',p_calendars);
END $$;

CREATE FUNCTION appointment_system.capture_in_person_calendar_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog,appointment_system,pg_temp AS $$
DECLARE snapshot jsonb;
BEGIN
 IF OLD.state='confirmed' AND OLD.service_snapshot->>'meeting'='in_person'
  AND appointment_system.google_resource_owner('calendar_'||OLD.resource_id) IS NOT NULL
  AND (NEW.state IS DISTINCT FROM OLD.state OR NEW.revision IS DISTINCT FROM OLD.revision) THEN
  snapshot:=appointment_system.booking_snapshot(OLD.id);
  -- Never replace an attempted snapshot; only fill a not-yet-captured old revision.
  UPDATE appointment_system.delivery_jobs SET payload=snapshot WHERE booking_id=OLD.id AND booking_revision=OLD.revision
   AND kind='booking_calendar' AND recipient_role='calendar' AND payload IS NULL;
  INSERT INTO appointment_system.delivery_jobs(id,booking_id,kind,recipient_role,booking_revision,payload)
   VALUES(gen_random_uuid(),OLD.id,'booking_cancelled','calendar',OLD.revision,snapshot)
   ON CONFLICT(kind,booking_id,recipient_role,booking_revision,event_key) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION appointment_system.enqueue_in_person_calendar_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog,appointment_system,pg_temp AS $$
BEGIN
 IF NEW.state='confirmed' AND NEW.service_snapshot->>'meeting'='in_person'
  AND appointment_system.google_resource_owner('calendar_'||NEW.resource_id) IS NOT NULL
  AND (TG_OP='INSERT' OR OLD.state IS DISTINCT FROM NEW.state OR OLD.revision IS DISTINCT FROM NEW.revision) THEN
  INSERT INTO appointment_system.delivery_jobs(id,booking_id,kind,recipient_role,booking_revision,payload)
   VALUES(gen_random_uuid(),NEW.id,'booking_calendar','calendar',NEW.revision,appointment_system.booking_snapshot(NEW.id))
   ON CONFLICT(kind,booking_id,recipient_role,booking_revision,event_key) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER capture_in_person_calendar_revision BEFORE UPDATE ON appointment_system.bookings
 FOR EACH ROW EXECUTE FUNCTION appointment_system.capture_in_person_calendar_revision();
CREATE TRIGGER enqueue_in_person_calendar_revision AFTER INSERT OR UPDATE ON appointment_system.bookings
 FOR EACH ROW EXECUTE FUNCTION appointment_system.enqueue_in_person_calendar_revision();


CREATE OR REPLACE FUNCTION appointment_system.entry_finish_google_delivery(p_job uuid, p_lease uuid, p_state text, p_provider text, p_meet text, p_error text, p_delay integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $_$
DECLARE j appointment_system.delivery_jobs%ROWTYPE; b appointment_system.bookings%ROWTYPE; booking uuid; stale boolean; expected_event text;in_person boolean;
BEGIN
 PERFORM pg_advisory_xact_lock_shared(83124,5);
 PERFORM pg_advisory_xact_lock_shared(83124,4);
    IF p_state IS NULL OR p_state NOT IN ('done','waiting','failed','attention','obsolete') OR p_delay IS NULL OR p_delay NOT BETWEEN 15 AND 3600
       OR (p_error IS NOT NULL AND p_error !~ '^[a-z_]{1,80}$') THEN RETURN false; END IF;
    SELECT booking_id INTO booking FROM appointment_system.delivery_jobs WHERE id=p_job;
    SELECT * INTO b FROM appointment_system.bookings WHERE id=booking FOR SHARE;
    IF NOT FOUND THEN RETURN false; END IF;
    SELECT * INTO j FROM appointment_system.delivery_jobs WHERE id=p_job FOR UPDATE;
    IF NOT FOUND OR j.lease_token IS DISTINCT FROM p_lease OR p_lease IS NULL OR j.state<>'processing'
       OR j.lease_expires_at<=clock_timestamp() OR NOT appointment_system.transport_claim_current(to_jsonb(j)) THEN RETURN false; END IF;
    IF j.kind NOT IN ('booking_calendar','sheet_booking') AND NOT(j.kind='booking_cancelled' AND j.recipient_role='calendar') THEN RETURN false; END IF;
    in_person:=j.kind<>'sheet_booking' AND coalesce(j.payload#>>'{service_snapshot,meeting}'='in_person',false);
    IF in_person AND (p_meet IS NOT NULL OR p_state='waiting'
      OR j.payload->>'resource_id' IS DISTINCT FROM j.payload#>>'{service_snapshot,resource_id}'
      OR appointment_system.google_resource_owner('calendar_'||(j.payload->>'resource_id')) IS NULL) THEN RETURN false;END IF;
    stale:=b.state<>'confirmed' OR b.revision<>j.booking_revision;
    IF p_state='obsolete' THEN
      IF j.kind<>'booking_calendar' OR NOT stale THEN RETURN false; END IF;
      IF NOT in_person THEN UPDATE appointment_system.meeting_events SET state='cancelled',meet_url=NULL WHERE booking_id=b.id AND booking_revision=j.booking_revision;END IF;
    ELSIF j.kind='booking_calendar' AND p_state IN ('done','waiting') THEN
      expected_event:=appointment_system.calendar_event_identity(b.id,j.booking_revision,b.calendar_protocol);
      IF p_provider IS DISTINCT FROM expected_event THEN RETURN false; END IF;
      IF NOT in_person THEN
      INSERT INTO appointment_system.meeting_events(booking_id,booking_revision,event_id,state,meet_url)
        VALUES(b.id,j.booking_revision,p_provider,CASE WHEN p_state='done' THEN 'ready' ELSE 'waiting' END,p_meet)
        ON CONFLICT(booking_id,booking_revision) DO UPDATE SET state=excluded.state,meet_url=excluded.meet_url;
      END IF;
      IF stale THEN
        INSERT INTO appointment_system.delivery_jobs(id,booking_id,kind,recipient_role,booking_revision,payload)
          VALUES(gen_random_uuid(),b.id,'booking_cancelled','calendar',j.booking_revision,j.payload)
          ON CONFLICT(kind,booking_id,recipient_role,booking_revision,event_key) DO UPDATE
          SET state='pending',next_attempt_at=clock_timestamp(),lease_token=NULL,lease_expires_at=NULL;
      ELSIF p_state='done' AND NOT in_person THEN
        INSERT INTO appointment_system.delivery_jobs(id,booking_id,kind,recipient_role,booking_revision,event_key,payload) SELECT gen_random_uuid(),b.id,'sheet_booking',destination,j.booking_revision,'meeting-ready',appointment_system.booking_snapshot(b.id) FROM unnest(ARRAY['client_sheet','agency_sheet'])destination ON CONFLICT(kind,booking_id,recipient_role,booking_revision,event_key) DO NOTHING;
        IF b.email IS NOT NULL THEN
         INSERT INTO appointment_system.delivery_jobs(id,booking_id,kind,recipient_role,booking_revision)
          VALUES(gen_random_uuid(),b.id,'booking_details','customer',j.booking_revision)
          ON CONFLICT(kind,booking_id,recipient_role,booking_revision,event_key) DO NOTHING;
        END IF;
      END IF;
    ELSIF j.kind='booking_cancelled' AND p_state='done' AND NOT in_person THEN
      UPDATE appointment_system.meeting_events SET state='cancelled',meet_url=NULL
        WHERE booking_id=b.id AND booking_revision=j.booking_revision;
    END IF;
    UPDATE appointment_system.delivery_jobs SET state=CASE WHEN p_state='obsolete' THEN 'suppressed' WHEN stale AND j.kind='booking_calendar' AND p_state IN ('done','waiting') THEN 'suppressed'
      WHEN p_state='done' THEN 'completed' WHEN p_state='attention' THEN 'needs_review' WHEN p_state='waiting' THEN 'retry_wait' ELSE 'retry_wait' END,
      provider_id=coalesce(p_provider,provider_id),last_error_code=p_error,
      next_attempt_at=clock_timestamp()+make_interval(secs=>p_delay),lease_token=NULL,lease_expires_at=NULL WHERE id=p_job;
    RETURN true;
END
$_$;

DO $block$ DECLARE p regprocedure; BEGIN
 FOR p IN SELECT oid::regprocedure FROM pg_proc WHERE pronamespace='appointment_system'::regnamespace AND proname IN
 ('resource_calendar_map_valid','google_resource_owner','google_resource_role','configure_resource_calendars',
  'capture_in_person_calendar_revision','enqueue_in_person_calendar_revision') LOOP
  EXECUTE 'REVOKE ALL ON FUNCTION '||p||' FROM PUBLIC';
 END LOOP;
END $block$;
RESET ROLE;
