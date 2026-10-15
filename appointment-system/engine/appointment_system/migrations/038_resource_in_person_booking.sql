-- Neutral resource schedules and in-person, pay-at-clinic appointments.
-- Applied history001-037 is unchanged. Defaults preserve legacy appointment facts.
CREATE EXTENSION IF NOT EXISTS btree_gist;
SET LOCAL ROLE appointment_system_owner;
SELECT pg_advisory_xact_lock(83124,5);
SELECT pg_advisory_xact_lock(83124,4);
ALTER TABLE appointment_system.bookings ADD COLUMN resource_id text NOT NULL DEFAULT 'default';
ALTER TABLE appointment_system.bookings ADD COLUMN payment_method text NOT NULL DEFAULT 'online' CHECK(payment_method IN ('online','at_clinic'));
ALTER TABLE appointment_system.slot_claims ADD COLUMN resource_id text NOT NULL DEFAULT 'default';
ALTER TABLE appointment_system.slot_claims DROP CONSTRAINT slot_claims_tstzrange_excl;
ALTER TABLE appointment_system.slot_claims ADD CONSTRAINT slot_claims_resource_overlap
 EXCLUDE USING gist(resource_id WITH =,tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE(released_at IS NULL);
ALTER TABLE appointment_system.bookings ALTER COLUMN hold_expires_at DROP NOT NULL;
ALTER TABLE appointment_system.bookings ADD CONSTRAINT bookings_payment_hold CHECK
 ((payment_method='online' AND hold_expires_at IS NOT NULL) OR
  (payment_method='at_clinic' AND hold_expires_at IS NULL AND state IN ('confirmed','cancelled')));

CREATE FUNCTION appointment_system.protect_booking_resource() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,appointment_system,pg_temp AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.resource_id IS DISTINCT FROM OLD.resource_id OR NEW.payment_method IS DISTINCT FROM OLD.payment_method)
 THEN RAISE EXCEPTION 'immutable booking capacity and payment method' USING ERRCODE='23514'; END IF;
 IF NEW.resource_id IS DISTINCT FROM coalesce(NEW.service_snapshot->>'resource_id','default')
 THEN RAISE EXCEPTION 'booking resource mismatch' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_booking_resource BEFORE INSERT OR UPDATE ON appointment_system.bookings
 FOR EACH ROW EXECUTE FUNCTION appointment_system.protect_booking_resource();
CREATE FUNCTION appointment_system.protect_claim_resource() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,appointment_system,pg_temp AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.resource_id IS DISTINCT FROM OLD.resource_id THEN
  RAISE EXCEPTION 'immutable claim resource' USING ERRCODE='23514'; END IF;
 IF NEW.booking_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM appointment_system.bookings
  WHERE id=NEW.booking_id AND resource_id=NEW.resource_id) THEN
  RAISE EXCEPTION 'claim resource mismatch' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_claim_resource BEFORE INSERT OR UPDATE ON appointment_system.slot_claims
 FOR EACH ROW EXECUTE FUNCTION appointment_system.protect_claim_resource();


CREATE OR REPLACE FUNCTION appointment_system.validate_business_v1(p_spec jsonb) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $_$
DECLARE item jsonb; other jsonb; windows jsonb; ids text[]:=ARRAY[]::text[];
 quantity integer; opening time; closing time;
BEGIN
 IF octet_length(p_spec::text)>131072 OR NOT appointment_system.exact_keys(p_spec,ARRAY[
  'version','timezone','services','weekly_windows','slot_step_minutes','notice_minutes',
  'horizon_days','buffer_before_minutes','buffer_after_minutes','booking_verification',
  'required_contacts','meeting','email_budget']) THEN RETURN false; END IF;
 IF p_spec->'version' IS DISTINCT FROM '1'::jsonb
  OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=p_spec->>'timezone')
  OR NOT appointment_system.bounded_integer(p_spec->'slot_step_minutes',5,120)
  OR (p_spec->>'slot_step_minutes')::integer%5<>0
  OR NOT appointment_system.bounded_integer(p_spec->'notice_minutes',0,10080)
  OR NOT appointment_system.bounded_integer(p_spec->'horizon_days',1,365)
  OR NOT appointment_system.bounded_integer(p_spec->'buffer_before_minutes',0,120)
  OR NOT appointment_system.bounded_integer(p_spec->'buffer_after_minutes',0,120)
  OR jsonb_typeof(p_spec->'meeting') IS DISTINCT FROM 'string'
  OR p_spec->>'meeting' NOT IN ('internal','google_meet')
  OR NOT appointment_system.exact_keys(p_spec->'booking_verification',ARRAY['email','sms'])
  OR jsonb_typeof(p_spec#>'{booking_verification,email}') IS DISTINCT FROM 'boolean'
  OR p_spec#>'{booking_verification,sms}' IS DISTINCT FROM 'false'::jsonb
  OR p_spec->'required_contacts' NOT IN ('[]'::jsonb,'["phone"]'::jsonb,'["email"]'::jsonb,'["email","phone"]'::jsonb,'["phone","email"]'::jsonb)
  OR (p_spec->'required_contacts' @> '["email"]'::jsonb) IS DISTINCT FROM (p_spec#>'{booking_verification,email}'='true'::jsonb)
  OR jsonb_typeof(p_spec->'services') IS DISTINCT FROM 'array'
  OR jsonb_array_length(p_spec->'services') NOT BETWEEN 1 AND 100
  OR jsonb_typeof(p_spec->'weekly_windows') IS DISTINCT FROM 'array'
  OR jsonb_array_length(p_spec->'weekly_windows') NOT BETWEEN 1 AND 28
 THEN RETURN false; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_spec->'services') LOOP
  IF NOT appointment_system.exact_keys(item,ARRAY['id','name','enabled','duration_minutes','pricing','required_preparation'])
   OR jsonb_typeof(item->'id') IS DISTINCT FROM 'string'
   OR jsonb_typeof(item->'name') IS DISTINCT FROM 'string'
   OR coalesce(item->>'id','') !~ '^[a-z0-9][a-z0-9-]{0,79}$'
   OR item->>'id'=ANY(ids)
   OR coalesce(length(btrim(item->>'name')),0) NOT BETWEEN 1 AND 150
   OR item->>'name' ~ '[[:cntrl:]]'
   OR jsonb_typeof(item->'enabled') IS DISTINCT FROM 'boolean'
   OR NOT appointment_system.bounded_integer(item->'duration_minutes',5,480)
   OR (item->>'duration_minutes')::integer%5<>0
   OR NOT appointment_system.exact_keys(item->'pricing',ARRAY['kind','amount_paise','maximum_questions'])
   OR coalesce(item#>>'{pricing,kind}','') NOT IN ('fixed','per_question')
   OR NOT appointment_system.bounded_integer(item#>'{pricing,amount_paise}',1,2147483647)
   OR NOT appointment_system.bounded_integer(item#>'{pricing,maximum_questions}',1,10)
   OR ((item#>>'{pricing,amount_paise}')::bigint*(item#>>'{pricing,maximum_questions}')::bigint)>2147483647
   OR (item#>>'{pricing,kind}'='fixed' AND item#>'{pricing,maximum_questions}'<>'1'::jsonb)
   OR jsonb_typeof(item->'required_preparation') IS DISTINCT FROM 'array'
  THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(item->'required_preparation') a
   WHERE jsonb_typeof(a) IS DISTINCT FROM 'string'
    OR a#>>'{}' NOT IN ('birth_date','birth_time','birth_place','notes'))
   OR (SELECT count(*) FROM jsonb_array_elements(item->'required_preparation')) <>
      (SELECT count(DISTINCT a) FROM jsonb_array_elements(item->'required_preparation') a)
  THEN RETURN false; END IF;
  ids:=array_append(ids,item->>'id');
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(p_spec->'weekly_windows') LOOP
  IF NOT appointment_system.exact_keys(item,ARRAY['weekday','start','end'])
   OR NOT appointment_system.bounded_integer(item->'weekday',0,6)
   OR coalesce(item->>'start','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
   OR coalesce(item->>'end','') !~ '^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$'
  THEN RETURN false; END IF;
  opening:=(item->>'start')::time; closing:=(item->>'end')::time;
  IF opening>=closing THEN RETURN false; END IF;
  FOR other IN SELECT value FROM jsonb_array_elements(p_spec->'weekly_windows') LOOP
   IF item<>other AND item->'weekday'=other->'weekday'
    AND (other->>'start') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND (other->>'end') ~ '^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$'
    AND opening<(other->>'end')::time AND (other->>'start')::time<closing
   THEN RETURN false; END IF;
  END LOOP;
 END LOOP;
 IF (SELECT count(*) FROM jsonb_array_elements(p_spec->'weekly_windows')) <>
    (SELECT count(DISTINCT w) FROM jsonb_array_elements(p_spec->'weekly_windows') w)
 THEN RETURN false; END IF;
 IF NOT appointment_system.exact_keys(p_spec->'email_budget',
  ARRAY['daily','rolling','verification_daily','verification_rolling'])
 THEN RETURN false; END IF;
 FOR item IN SELECT value FROM jsonb_each(p_spec->'email_budget') LOOP
  IF NOT appointment_system.bounded_integer(item,0,100000) THEN RETURN false; END IF;
 END LOOP;
 IF (p_spec#>>'{email_budget,daily}')::integer>(p_spec#>>'{email_budget,rolling}')::integer
  OR (p_spec#>>'{email_budget,verification_daily}')::integer>(p_spec#>>'{email_budget,daily}')::integer
  OR (p_spec#>>'{email_budget,verification_rolling}')::integer>(p_spec#>>'{email_budget,rolling}')::integer
  OR (p_spec#>>'{email_budget,verification_daily}')::integer>(p_spec#>>'{email_budget,verification_rolling}')::integer
 THEN RETURN false; END IF;
 RETURN true;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN false;
END $_$;

CREATE OR REPLACE FUNCTION appointment_system.validate_business(p_spec jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,appointment_system,pg_temp AS $$
DECLARE r jsonb; w jsonb; e jsonb; service jsonb; projected jsonb; resources text[]:=ARRAY[]::text[]; prior jsonb;
 opening integer; closing integer; grace integer; extra integer;
BEGIN
 IF p_spec->'version'='1'::jsonb THEN RETURN appointment_system.validate_business_v1(p_spec); END IF;
 IF p_spec->'version' IS DISTINCT FROM '2'::jsonb OR octet_length(p_spec::text)>131072
 OR NOT appointment_system.exact_keys(p_spec,ARRAY['version','timezone','services','resources','slot_step_minutes','notice_minutes','horizon_days','buffer_before_minutes','buffer_after_minutes','booking_verification','required_contacts','meeting','email_budget','payment_methods','location','display_duration'])
 OR jsonb_typeof(p_spec->'resources') IS DISTINCT FROM 'array'
 OR jsonb_array_length(p_spec->'resources') NOT BETWEEN 1 AND 100
 OR p_spec->'payment_methods' NOT IN ('["online"]'::jsonb,'["at_clinic"]'::jsonb,'["online","at_clinic"]'::jsonb,'["at_clinic","online"]'::jsonb)
 OR jsonb_typeof(p_spec->'display_duration') IS DISTINCT FROM 'boolean'
 OR p_spec->>'meeting' NOT IN ('internal','google_meet','in_person')
 OR (p_spec->'payment_methods' @> '["at_clinic"]'::jsonb AND p_spec->>'meeting'<>'in_person') THEN RETURN false; END IF;
 IF p_spec->>'meeting'='in_person' THEN
  IF NOT appointment_system.exact_keys(p_spec->'location',ARRAY['name','address','maps_url'])
   OR jsonb_typeof(p_spec#>'{location,name}') IS DISTINCT FROM 'string'
   OR length(btrim(p_spec#>>'{location,name}')) NOT BETWEEN 1 AND 150
   OR jsonb_typeof(p_spec#>'{location,address}') IS DISTINCT FROM 'string'
   OR length(btrim(p_spec#>>'{location,address}')) NOT BETWEEN 1 AND 500
   OR jsonb_typeof(p_spec#>'{location,maps_url}') IS DISTINCT FROM 'string'
   OR length(p_spec#>>'{location,maps_url}') NOT BETWEEN 8 AND 2048
   OR p_spec#>>'{location,maps_url}' !~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*(:443)?([/?#][^[:space:]]*)?$'
   OR (p_spec->'location')::text ~ '\\u00[01][0-9a-f]' THEN RETURN false; END IF;
 ELSIF p_spec->'location' IS DISTINCT FROM 'null'::jsonb THEN RETURN false; END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(p_spec->'resources') LOOP
  IF NOT appointment_system.exact_keys(r,ARRAY['id','name','weekly_windows'])
   OR jsonb_typeof(r->'id') IS DISTINCT FROM 'string' OR r->>'id' !~ '^[a-z0-9][a-z0-9-]{0,79}$'
   OR r->>'id'='default' OR r->>'id'=ANY(resources)
   OR jsonb_typeof(r->'name') IS DISTINCT FROM 'string' OR length(btrim(r->>'name')) NOT BETWEEN 1 AND 150
   OR r->>'name' ~ '[[:cntrl:]]'
   OR jsonb_typeof(r->'weekly_windows') IS DISTINCT FROM 'array'
   OR jsonb_array_length(r->'weekly_windows') NOT BETWEEN 1 AND 28 THEN RETURN false; END IF;
  resources:=array_append(resources,r->>'id'); prior:='[]'::jsonb;
  FOR w IN SELECT value FROM jsonb_array_elements(r->'weekly_windows') LOOP
   IF NOT appointment_system.exact_keys(w,ARRAY['weekday','start','end','start_grace_minutes','extra_starts'])
    OR NOT appointment_system.bounded_integer(w->'weekday',0,6)
    OR coalesce(w->>'start','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    OR coalesce(w->>'end','') !~ '^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$'
    OR NOT appointment_system.bounded_integer(w->'start_grace_minutes',0,120)
    OR jsonb_typeof(w->'extra_starts') IS DISTINCT FROM 'array'
    OR jsonb_array_length(w->'extra_starts')>24 THEN RETURN false; END IF;
   opening:=extract(epoch FROM (w->>'start')::time)::integer/60;
   closing:=extract(epoch FROM (w->>'end')::time)::integer/60;grace:=(w->>'start_grace_minutes')::integer;
   IF opening>=closing OR closing+grace>=1440 THEN RETURN false; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(prior) old WHERE old->'weekday'=w->'weekday'
    AND opening<=(old->>'end_minute')::integer AND closing+grace>=(old->>'start_minute')::integer) THEN RETURN false; END IF;
   prior:=prior||jsonb_build_array(jsonb_build_object('weekday',w->'weekday','start_minute',opening,'end_minute',closing+grace));
   IF (SELECT count(*)<>count(DISTINCT value) FROM jsonb_array_elements(w->'extra_starts')) THEN RETURN false; END IF;
   FOR e IN SELECT value FROM jsonb_array_elements(w->'extra_starts') LOOP
    IF jsonb_typeof(e) IS DISTINCT FROM 'string' OR e#>>'{}' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN RETURN false; END IF;
    extra:=extract(epoch FROM (e#>>'{}')::time)::integer/60;
    IF extra<opening OR extra>closing+grace THEN RETURN false; END IF;
   END LOOP;
  END LOOP;
 END LOOP;
 IF jsonb_typeof(p_spec->'services') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 FOR service IN SELECT value FROM jsonb_array_elements(p_spec->'services') LOOP
  IF jsonb_typeof(service->'resource_id') IS DISTINCT FROM 'string' OR NOT(service->>'resource_id'=ANY(resources)) THEN RETURN false; END IF;
 END LOOP;
 projected:=(p_spec-ARRAY['resources','payment_methods','location','display_duration'])||jsonb_build_object('version',1,'meeting','internal',
  'weekly_windows',jsonb_build_array(jsonb_build_object('weekday',0,'start','00:00','end','24:00')),
  'services',(SELECT jsonb_agg(value-'resource_id') FROM jsonb_array_elements(p_spec->'services')));
 RETURN appointment_system.validate_business_v1(projected);
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow THEN RETURN false;
END $$;

CREATE FUNCTION appointment_system.resource_schedule_starts(p_spec jsonb,p_resource text,p_duration integer,p_day date,p_now timestamptz,p_deadline timestamptz DEFAULT NULL)
RETURNS TABLE(starts_at timestamptz,ends_at timestamptz,occupied_start timestamptz,occupied_end timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,appointment_system,pg_temp AS $$
BEGIN
 IF p_spec->'version'='1'::jsonb THEN
  IF p_resource='default' THEN RETURN QUERY SELECT * FROM appointment_system.schedule_starts(p_spec,p_duration,p_day,p_now,p_deadline);END IF;
  RETURN;
 END IF;
 RETURN QUERY WITH windows AS (
  SELECT p_day+(w->>'start')::time opening,p_day+(w->>'end')::time+make_interval(mins=>(w->>'start_grace_minutes')::integer) last_start,w
  FROM jsonb_array_elements(p_spec->'resources') r CROSS JOIN LATERAL jsonb_array_elements(r->'weekly_windows') w
  WHERE r->>'id'=p_resource AND (w->>'weekday')::integer=extract(isodow FROM p_day)::integer-1
 ), local_starts AS (
  SELECT generate_series(opening,last_start,make_interval(mins=>(p_spec->>'slot_step_minutes')::integer)) local_start FROM windows
  UNION SELECT p_day+extra::time FROM windows CROSS JOIN LATERAL jsonb_array_elements_text(w->'extra_starts') extra
 ), converted AS (SELECT local_start,local_start AT TIME ZONE(p_spec->>'timezone') utc_start FROM local_starts)
 SELECT utc_start,utc_start+make_interval(mins=>p_duration),
 utc_start-make_interval(mins=>(p_spec->>'buffer_before_minutes')::integer),
 utc_start+make_interval(mins=>p_duration+(p_spec->>'buffer_after_minutes')::integer)
 FROM converted WHERE p_duration BETWEEN 5 AND 480 AND p_duration%5=0
 AND p_day>=(p_now AT TIME ZONE(p_spec->>'timezone'))::date
 AND(p_deadline IS NOT NULL OR p_day<=(p_now AT TIME ZONE(p_spec->>'timezone'))::date+(p_spec->>'horizon_days')::integer)
 AND utc_start>=p_now+make_interval(mins=>(p_spec->>'notice_minutes')::integer)
 AND(p_deadline IS NULL OR utc_start<=p_deadline)
 AND utc_start AT TIME ZONE(p_spec->>'timezone')=local_start
 AND(utc_start+make_interval(mins=>p_duration)) AT TIME ZONE(p_spec->>'timezone')=local_start+make_interval(mins=>p_duration)
 ORDER BY utc_start;
END $$;

CREATE OR REPLACE FUNCTION appointment_system.service_quote(p_spec jsonb, p_service text, p_questions integer) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE service jsonb; amount bigint;
BEGIN
 SELECT item INTO service FROM jsonb_array_elements(p_spec->'services') item
 WHERE item->>'id'=p_service AND item->'enabled'='true'::jsonb;
 IF service IS NULL OR p_questions IS NULL OR p_questions<1
  OR p_questions>(service#>>'{pricing,maximum_questions}')::integer
  OR (service#>>'{pricing,kind}'='fixed' AND p_questions<>1) THEN RETURN NULL; END IF;
 amount:=(service#>>'{pricing,amount_paise}')::bigint *
  CASE WHEN service#>>'{pricing,kind}'='per_question' THEN p_questions ELSE 1 END;
 IF p_spec->'version'='2'::jsonb THEN
  service:=service||jsonb_build_object('facts_version',2,'resource_name',(SELECT r->>'name' FROM jsonb_array_elements(p_spec->'resources') r WHERE r->>'id'=service->>'resource_id'),
   'payment_methods',p_spec->'payment_methods','location',p_spec->'location','display_duration',p_spec->'display_duration');
 END IF;
 RETURN service||jsonb_build_object('amount_paise',amount,'questions',p_questions,'currency','INR',
  'meeting',p_spec->>'meeting','meeting_platform',CASE WHEN p_spec->>'meeting'='google_meet' THEN 'Google Meet' WHEN p_spec->>'meeting'='in_person' THEN p_spec#>>'{location,name}' ELSE 'Arrange directly' END);
END $$;

CREATE OR REPLACE FUNCTION appointment_system.entry_available_times(p_service text, p_day date, p_questions integer DEFAULT 1) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE spec jsonb; service jsonb; version text; instant timestamptz:=clock_timestamp(); slots jsonb;
BEGIN
 PERFORM appointment_system.control_admission(NULL);
 SELECT p.specification,p.version INTO spec,version FROM appointment_system.intake_settings s
 JOIN appointment_system.booking_policies p ON p.version=s.policy_version WHERE s.singleton FOR SHARE OF s;
 service:=appointment_system.service_quote(spec,p_service,p_questions);
 IF service IS NULL THEN RETURN jsonb_build_object('code','service_unavailable'); END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('starts_at',offer.starts_at,'ends_at',offer.ends_at)
  ORDER BY offer.starts_at),'[]'::jsonb) INTO slots
 FROM appointment_system.resource_schedule_starts(spec,coalesce(service->>'resource_id','default'),(service->>'duration_minutes')::integer,p_day,instant) offer
 WHERE NOT EXISTS(SELECT 1 FROM appointment_system.slot_claims c
  LEFT JOIN appointment_system.bookings b ON b.id=c.booking_id
  WHERE c.released_at IS NULL AND c.resource_id=coalesce(service->>'resource_id','default')
   AND NOT coalesce(b.state='held' AND b.hold_expires_at<=instant,false)
   AND tstzrange(c.starts_at,c.ends_at,'[)') && tstzrange(offer.occupied_start,offer.occupied_end,'[)'));
 RETURN jsonb_build_object('service',service||jsonb_build_object('quote_version',version,'timezone',spec->>'timezone'),
  'date',p_day,'server_now',instant,'slots',slots);
END $$;

CREATE OR REPLACE FUNCTION appointment_system.entry_reserve_configured_checkout(p_context uuid, p_request uuid, p_receipt text, p_fingerprint text, p_input jsonb, p_expected jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $_$
DECLARE ctx appointment_system.checkout_contexts%ROWTYPE; admission appointment_system.checkout_admissions%ROWTYPE;
 settings appointment_system.intake_settings%ROWTYPE; spec jsonb; service jsonb; instant timestamptz:=clock_timestamp();
 starts timestamptz; offer record; identifier uuid; existing_id uuid; reason text; quantity integer;
 method text:=coalesce(p_input->>'payment_method','online');
 grant_row appointment_system.booking_verification_grants%ROWTYPE; preparation jsonb; birth_day date;
BEGIN
 PERFORM pg_advisory_xact_lock_shared(83124,5);
 PERFORM pg_advisory_xact_lock_shared(83124,4);
 SELECT * INTO settings FROM appointment_system.intake_settings WHERE singleton FOR SHARE;
 SELECT specification INTO spec FROM appointment_system.booking_policies WHERE version=settings.policy_version;
 SELECT * INTO ctx FROM appointment_system.checkout_contexts WHERE id=p_context FOR UPDATE;
 IF NOT FOUND OR ctx.expires_at<=instant THEN RETURN jsonb_build_object('code','context_expired'); END IF;
 PERFORM appointment_system.control_admission(ctx.activation_epoch);
 SELECT * INTO admission FROM appointment_system.checkout_admissions WHERE request_id=p_request AND context_id=p_context;
 IF NOT FOUND OR admission.receipt_digest IS DISTINCT FROM p_receipt
  OR admission.request_fingerprint IS DISTINCT FROM p_fingerprint
  OR p_input->>'request_id' IS DISTINCT FROM p_request::text
  OR appointment_system.settings_digest(p_input) IS DISTINCT FROM p_fingerprint
 THEN RETURN jsonb_build_object('code','request_conflict'); END IF;
 IF admission.outcome='committed' THEN
  SELECT id INTO existing_id FROM appointment_system.bookings WHERE request_id=p_request;
  RETURN jsonb_build_object('code','existing','booking_id',existing_id);
 END IF;
 IF admission.outcome<>'pending' THEN RETURN jsonb_build_object('code','request_rejected'); END IF;
 IF spec->'version'='2'::jsonb AND NOT(p_input ? 'payment_method') THEN reason:='upgrade_required';
 ELSIF settings.policy_version IS DISTINCT FROM p_input->>'quote_version' THEN reason:='quote_changed';
 ELSIF method='online' AND (NOT settings.public_open OR p_expected IS NULL OR p_expected IS DISTINCT FROM
  jsonb_build_object('merchant_id',settings.merchant_id,'mode',settings.payment_mode,'credential_version',settings.credential_version))
 THEN reason:='payment_not_configured';
 ELSIF (p_input ? 'payment_method' AND jsonb_typeof(p_input->'payment_method') IS DISTINCT FROM 'string') OR method NOT IN ('online','at_clinic') OR (spec->'version'='1'::jsonb AND method<>'online')
 OR (spec->'version'='2'::jsonb AND NOT(spec->'payment_methods' ? method)) THEN reason:='invalid_details';
 ELSIF NOT appointment_system.bounded_integer(coalesce(p_input->'questions','1'::jsonb),1,10)
 THEN reason:='invalid_details'; END IF;
 IF reason IS NULL THEN
  quantity:=coalesce((p_input->>'questions')::integer,1);
  service:=appointment_system.service_quote(spec,p_input->>'service_id',quantity);
  IF service IS NULL THEN reason:='service_unavailable'; END IF;
 END IF;
 IF reason IS NULL THEN
  IF coalesce(p_input->>'starts_at','') !~ '(Z|[+-][0-9]{2}:[0-9]{2})$'
  THEN reason:='invalid_time';
  ELSE
   BEGIN starts:=(p_input->>'starts_at')::timestamptz;
   EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN reason:='invalid_time'; END;
  END IF;
 END IF;
 IF reason IS NULL THEN
  SELECT * INTO offer FROM appointment_system.resource_schedule_starts(spec,coalesce(service->>'resource_id','default'),(service->>'duration_minutes')::integer,
   (starts AT TIME ZONE(spec->>'timezone'))::date,instant) WHERE starts_at=starts;
  IF NOT FOUND OR NOT isfinite(starts) THEN reason:='time_unavailable'; END IF;
 END IF;
 IF reason IS NULL THEN
  IF jsonb_typeof(p_input->'full_name') IS DISTINCT FROM 'string'
   OR coalesce(length(btrim(p_input->>'full_name')),0) NOT BETWEEN 2 AND 100
   OR p_input->>'full_name' ~ '[[:cntrl:]]'
   OR coalesce(p_input->'normalization_version','2'::jsonb) NOT IN ('1'::jsonb,'2'::jsonb,'3'::jsonb)
   OR (CASE WHEN p_input->>'email' IS NULL THEN
       p_input->'normalization_version' IS DISTINCT FROM '3'::jsonb
       OR spec#>'{booking_verification,email}' IS DISTINCT FROM 'false'::jsonb
       OR p_input->>'verification_grant' IS NOT NULL
      ELSE jsonb_typeof(p_input->'email') IS DISTINCT FROM 'string'
       OR p_input->>'email' !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
       OR length(p_input->>'email') NOT BETWEEN 3 AND 254 END)
   OR (spec->'required_contacts' @> '["phone"]'::jsonb AND coalesce(p_input->>'phone','') !~ '^\+[1-9][0-9]{6,14}$')
   OR (coalesce(p_input->>'phone','')<>'' AND p_input->>'phone' !~ '^\+[1-9][0-9]{6,14}$')
  THEN reason:='invalid_details'; END IF;
  IF reason IS NULL THEN
   IF p_input->>'birth_date' IS NOT NULL THEN
    IF jsonb_typeof(p_input->'birth_date') IS DISTINCT FROM 'string' OR p_input->>'birth_date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN reason:='invalid_details';
    ELSE
     BEGIN
      birth_day:=(p_input->>'birth_date')::date;
      IF to_char(birth_day,'YYYY-MM-DD')<>p_input->>'birth_date' OR birth_day>(instant AT TIME ZONE(spec->>'timezone'))::date THEN reason:='invalid_details'; END IF;
     EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN reason:='invalid_details'; END;
    END IF;
   END IF;
   IF (p_input->'birth_time' IS NOT NULL AND jsonb_typeof(p_input->'birth_time') IS DISTINCT FROM 'string')
    OR coalesce(p_input->>'birth_time','') !~ '^(|([01][0-9]|2[0-3]):[0-5][0-9])$'
    OR (p_input->'birth_place' IS NOT NULL AND jsonb_typeof(p_input->'birth_place') IS DISTINCT FROM 'string')
    OR coalesce(length(p_input->>'birth_place'),0)>200
    OR (p_input->'notes' IS NOT NULL AND jsonb_typeof(p_input->'notes') IS DISTINCT FROM 'string')
    OR coalesce(length(p_input->>'notes'),0)>4000 THEN reason:='invalid_details'; END IF;
  END IF;
  preparation:=jsonb_build_object('birth_date',p_input->'birth_date','birth_time',p_input->'birth_time',
   'birth_place',p_input->'birth_place','notes',p_input->'notes');
  IF reason IS NULL AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(service->'required_preparation') field
   WHERE coalesce(length(btrim(p_input->>field)),0)=0)
  THEN reason:='preparation_required'; END IF;
 END IF;
 IF reason IS NULL AND spec#>'{booking_verification,email}'='true'::jsonb THEN
  SELECT * INTO grant_row FROM appointment_system.booking_verification_grants
  WHERE digest=p_input->>'verification_grant' AND context_id=p_context AND email=p_input->>'email'
   AND purpose='booking' AND policy_digest=appointment_system.verification_policy(spec)
   AND expires_at>instant AND consumed_request IS NULL AND revoked_at IS NULL;
  IF NOT FOUND THEN reason:='verification_required'; END IF;
 END IF;
 IF reason IS NOT NULL THEN
  UPDATE appointment_system.checkout_admissions SET outcome='rejected' WHERE request_id=p_request;
  RETURN jsonb_build_object('code',reason);
 END IF;
 -- Lock relevant expired bookings in sorted order before touching capacity.
 PERFORM appointment_system.lock_capacity_window(offer.occupied_start,offer.occupied_end);
 instant:=clock_timestamp();
 IF offer.starts_at<instant+make_interval(mins=>(spec->>'notice_minutes')::integer) THEN
  UPDATE appointment_system.checkout_admissions SET outcome='rejected' WHERE request_id=p_request;
  RETURN jsonb_build_object('code','time_unavailable');
 END IF;
 IF spec#>'{booking_verification,email}'='true'::jsonb THEN
  SELECT * INTO grant_row FROM appointment_system.booking_verification_grants
   WHERE digest=p_input->>'verification_grant' AND context_id=p_context AND email=p_input->>'email'
    AND purpose='booking' AND policy_digest=appointment_system.verification_policy(spec)
    AND expires_at>instant AND consumed_request IS NULL AND revoked_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
   UPDATE appointment_system.checkout_admissions SET outcome='rejected' WHERE request_id=p_request;
   RETURN jsonb_build_object('code','verification_required');
  END IF;
 END IF;
 PERFORM appointment_system.expire_relevant(offer.occupied_start,offer.occupied_end);
 IF ctx.active_checkout_id IS NOT NULL THEN
  -- Clear only this context's pointer after proving the old order is resolved.
  IF EXISTS(SELECT 1 FROM appointment_system.payment_orders WHERE booking_id=ctx.active_checkout_id AND resolved_at IS NOT NULL)
  THEN UPDATE appointment_system.checkout_contexts SET active_checkout_id=NULL WHERE id=p_context;
  ELSE
   UPDATE appointment_system.checkout_admissions SET outcome='rejected' WHERE request_id=p_request;
   RETURN jsonb_build_object('code','checkout_in_progress');
  END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM appointment_system.slot_claims WHERE released_at IS NULL AND resource_id=coalesce(service->>'resource_id','default')
  AND tstzrange(starts_at,ends_at,'[)')&&tstzrange(offer.occupied_start,offer.occupied_end,'[)'))
 THEN
  UPDATE appointment_system.checkout_admissions SET outcome='rejected' WHERE request_id=p_request;
  RETURN jsonb_build_object('code','time_unavailable');
 END IF;
 identifier:=gen_random_uuid();
 BEGIN
  INSERT INTO appointment_system.bookings(id,request_id,context_id,state,service_id,policy_version,service_snapshot,
   amount_paise,currency,starts_at,ends_at,practice_timezone,full_name,email,phone,preparation,
   hold_expires_at,receipt_expires_at,created_at,original_starts_at,activation_epoch,receipt_format,receipt_key_id,resource_id,payment_method)
  VALUES(identifier,p_request,p_context,CASE WHEN method='at_clinic' THEN 'confirmed' ELSE 'held' END,service->>'id',settings.policy_version,service,
   (service->>'amount_paise')::bigint,'INR',offer.starts_at,offer.ends_at,spec->>'timezone',
   p_input->>'full_name',p_input->>'email',nullif(p_input->>'phone',''),preparation,
   CASE WHEN method='online' THEN least(offer.starts_at,instant+interval '10 minutes') END,offer.ends_at+interval '24 hours',instant,
   offer.starts_at,ctx.activation_epoch,'v1',p_input#>>'{_receipt,key_id}',coalesce(service->>'resource_id','default'),method);
  INSERT INTO appointment_system.slot_claims(id,booking_id,starts_at,ends_at,resource_id)
  VALUES(gen_random_uuid(),identifier,offer.occupied_start,offer.occupied_end,coalesce(service->>'resource_id','default'));
  IF method='online' THEN
  INSERT INTO appointment_system.payment_orders(booking_id,merchant_id,mode,credential_version)
  VALUES(identifier,settings.merchant_id,settings.payment_mode,settings.credential_version);
  ELSE
   INSERT INTO appointment_system.delivery_jobs(id,booking_id,kind,recipient_role,booking_revision)
   SELECT gen_random_uuid(),identifier,kind,role,1 FROM(VALUES('sheet_booking','client_sheet'),('sheet_booking','agency_sheet'),('booking_ack','client'),('booking_ack','customer')) q(kind,role) WHERE role<>'customer' OR p_input->>'email' IS NOT NULL;
  END IF;
  IF grant_row.digest IS NOT NULL THEN
   UPDATE appointment_system.booking_verification_grants SET consumed_request=p_request
   WHERE digest=grant_row.digest AND consumed_request IS NULL AND expires_at>clock_timestamp() AND revoked_at IS NULL;
   IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='verification changed'; END IF;
  END IF;
  UPDATE appointment_system.checkout_contexts SET active_checkout_id=CASE WHEN method='online' THEN identifier ELSE NULL END WHERE id=p_context;
  UPDATE appointment_system.checkout_admissions SET outcome='committed' WHERE request_id=p_request;
 EXCEPTION WHEN exclusion_violation THEN
  UPDATE appointment_system.checkout_admissions SET outcome='rejected' WHERE request_id=p_request;
  RETURN jsonb_build_object('code','time_unavailable');
 END;
 RETURN jsonb_build_object('code','reserved','booking_id',identifier);
END $_$;

CREATE OR REPLACE FUNCTION appointment_system.entry_studio_appointment_reschedule(p_session text, p_client text, p_origin text, p_operation uuid, p_claim uuid, p_revision integer, p_reason text, p_start timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE actor text;old appointment_system.staff_appointment_actions%ROWTYPE;b appointment_system.bookings%ROWTYPE;
 booking uuid;context uuid;instant timestamptz;spec jsonb;local_start timestamp;offer record;new_end timestamptz;deadline timestamptz;late boolean;old_snapshot jsonb;snapshot jsonb;
BEGIN
 actor:=appointment_system.studio_calendar_actor(p_session,p_client,p_origin);
 IF actor IS NULL THEN RETURN jsonb_build_object('code','access_unavailable');END IF;
 IF p_operation IS NULL OR p_claim IS NULL OR p_revision IS NULL OR p_revision<1 OR p_revision>=2147483647
 OR p_start IS NULL OR NOT isfinite(p_start) OR coalesce(length(btrim(p_reason)),0) NOT BETWEEN 2 AND 500 OR p_reason ~ '[[:cntrl:]]'
 THEN RETURN jsonb_build_object('code','invalid_change');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('staff-appointment-operation:'||p_operation::text,0));
 SELECT s.booking_id,bk.context_id INTO booking,context FROM appointment_system.slot_claims s JOIN appointment_system.bookings bk ON bk.id=s.booking_id WHERE s.id=p_claim;
 IF NOT FOUND THEN RETURN jsonb_build_object('code','appointment_unavailable');END IF;
 SELECT p.specification INTO spec FROM appointment_system.intake_settings s JOIN appointment_system.booking_policies p ON p.version=s.policy_version WHERE s.singleton FOR SHARE OF s;
 IF NOT FOUND THEN RETURN jsonb_build_object('code','time_unavailable'); END IF;
 PERFORM 1 FROM appointment_system.checkout_contexts WHERE id=context FOR UPDATE;
 IF appointment_system.studio_calendar_actor(p_session,p_client,p_origin) IS NULL THEN RETURN jsonb_build_object('code','access_unavailable');END IF;
 SELECT * INTO old FROM appointment_system.staff_appointment_actions WHERE operation_id=p_operation;
 IF FOUND THEN
  IF old.action<>'reschedule' OR old.actor IS DISTINCT FROM actor OR old.claim_id IS DISTINCT FROM p_claim OR old.previous_revision IS DISTINCT FROM p_revision
  OR old.reason IS DISTINCT FROM p_reason OR old.new_starts_at IS DISTINCT FROM p_start THEN RETURN jsonb_build_object('code','request_conflict');END IF;
  RETURN jsonb_build_object('code','rescheduled','revision',old.revision,'starts_at',old.new_starts_at,'ends_at',old.new_ends_at);
 END IF;

 SELECT * INTO b FROM appointment_system.bookings WHERE id=booking;
 PERFORM appointment_system.lock_capacity_window(
  p_start-make_interval(mins=>(spec->>'buffer_before_minutes')::integer),
  p_start+(b.ends_at-b.starts_at)+make_interval(mins=>(spec->>'buffer_after_minutes')::integer),
  (SELECT starts_at FROM appointment_system.slot_claims WHERE id=p_claim),
  (SELECT ends_at FROM appointment_system.slot_claims WHERE id=p_claim));

 PERFORM appointment_system.lock_move_capacity(booking,
  p_start-make_interval(mins=>(spec->>'buffer_before_minutes')::integer),
  p_start+(b.ends_at-b.starts_at)+make_interval(mins=>(spec->>'buffer_after_minutes')::integer));
 SELECT * INTO b FROM appointment_system.bookings WHERE id=booking FOR UPDATE;
 instant:=clock_timestamp();
 IF b.revision<>p_revision THEN RETURN jsonb_build_object('code','revision_changed');END IF;
 IF b.state<>'confirmed' OR b.starts_at<=instant OR NOT EXISTS(SELECT 1 FROM appointment_system.slot_claims WHERE id=p_claim AND released_at IS NULL)
 THEN RETURN jsonb_build_object('code','appointment_unavailable');END IF;
 IF p_start=b.starts_at THEN RETURN jsonb_build_object('code','invalid_change');END IF;
 late:=b.starts_at<instant+interval '12 hours';
 IF late AND (b.preparation->'_legacy_late_reschedule_used'='true'::jsonb OR EXISTS(SELECT 1 FROM appointment_system.staff_appointment_actions WHERE booking_id=b.id AND late_exception))
 THEN RETURN jsonb_build_object('code','late_reschedule_used');END IF;
 IF late AND b.original_starts_at IS NULL AND b.reschedule_deadline_at IS NULL
 THEN RETURN jsonb_build_object('code','original_time_review_required');END IF;
 deadline:=coalesce(b.reschedule_deadline_at,CASE WHEN late THEN b.original_starts_at+interval '14 days' END);
 SELECT * INTO offer FROM appointment_system.resource_schedule_starts(spec,b.resource_id,
  (extract(epoch FROM b.ends_at-b.starts_at)/60)::integer,
  (p_start AT TIME ZONE (spec->>'timezone'))::date,instant,deadline) s WHERE s.starts_at=p_start;
 IF NOT FOUND THEN RETURN jsonb_build_object('code','time_unavailable'); END IF;
 new_end:=offer.ends_at;
 IF EXISTS(SELECT 1 FROM appointment_system.slot_claims WHERE id<>p_claim AND released_at IS NULL AND resource_id=b.resource_id
  AND tstzrange(starts_at,ends_at,'[)')&&tstzrange(offer.occupied_start,offer.occupied_end,'[)'))
 THEN RETURN jsonb_build_object('code','time_already_reserved'); END IF;
 old_snapshot:=appointment_system.booking_snapshot(b.id);
 snapshot:=old_snapshot||jsonb_build_object('revision',b.revision+1,'starts_at',p_start,'ends_at',new_end);
 BEGIN
  UPDATE appointment_system.slot_claims SET starts_at=offer.occupied_start,ends_at=offer.occupied_end WHERE id=p_claim;
  UPDATE appointment_system.bookings SET starts_at=p_start,ends_at=new_end,revision=revision+1,
  hold_expires_at=CASE WHEN payment_method='online' THEN least(hold_expires_at,p_start) END,receipt_expires_at=greatest(receipt_expires_at,new_end+interval '24 hours'),reschedule_deadline_at=deadline WHERE id=b.id;
  INSERT INTO appointment_system.staff_appointment_actions(operation_id,claim_id,booking_id,action,actor,reason,previous_revision,revision,starts_at,notice_seconds,policy_guidance,new_starts_at,new_ends_at,late_exception)
  VALUES(p_operation,p_claim,b.id,'reschedule',actor,p_reason,b.revision,b.revision+1,b.starts_at,floor(extract(epoch FROM b.starts_at-instant))::bigint,
  CASE WHEN late THEN 'late_reschedule_review' ELSE 'free_reschedule' END,p_start,new_end,late);
  INSERT INTO appointment_system.delivery_jobs(id,booking_id,kind,recipient_role,booking_revision,payload)
  SELECT gen_random_uuid(),b.id,'booking_cancelled','calendar',b.revision,old_snapshot
 WHERE b.service_snapshot->>'meeting'='google_meet' ON CONFLICT(kind,booking_id,recipient_role,booking_revision,event_key) DO NOTHING;
  INSERT INTO appointment_system.delivery_jobs(id,booking_id,kind,recipient_role,booking_revision,payload)
  SELECT gen_random_uuid(),b.id,kind,role,b.revision+1,snapshot FROM(VALUES('sheet_booking','client_sheet'),('sheet_booking','agency_sheet'),('booking_calendar','calendar')) jobs(kind,role) WHERE kind<>'booking_calendar' OR b.service_snapshot->>'meeting'='google_meet';
  INSERT INTO appointment_system.delivery_jobs(id,booking_id,kind,recipient_role,booking_revision,payload)
  SELECT gen_random_uuid(),b.id,'booking_ack',role,b.revision+1,jsonb_build_object('booking_id',b.id,'reference',b.request_id,
  'service',b.service_snapshot->>'name','starts_at',p_start,'ends_at',new_end,'amount_paise',b.amount_paise,'currency',b.currency,'change_kind','rescheduled') FROM(VALUES('customer'),('client')) roles(role) WHERE role<>'customer' OR b.email IS NOT NULL;
 EXCEPTION WHEN exclusion_violation THEN RETURN jsonb_build_object('code','time_already_reserved');END;
 RETURN jsonb_build_object('code','rescheduled','revision',b.revision+1,'starts_at',p_start,'ends_at',new_end);
END $$;

CREATE OR REPLACE FUNCTION appointment_system.entry_studio_appointment_cancel(p_session text, p_client text, p_origin text, p_operation uuid, p_claim uuid, p_revision integer, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE actor text;old appointment_system.staff_appointment_actions%ROWTYPE;b appointment_system.bookings%ROWTYPE;
 booking uuid;context uuid;instant timestamptz;guidance text;snapshot jsonb;old_snapshot jsonb;
BEGIN
 actor:=appointment_system.studio_calendar_actor(p_session,p_client,p_origin);
 IF actor IS NULL THEN RETURN jsonb_build_object('code','access_unavailable'); END IF;
 IF p_operation IS NULL OR p_claim IS NULL OR p_revision IS NULL OR p_revision<1 OR p_revision>=2147483647
 OR coalesce(length(btrim(p_reason)),0) NOT BETWEEN 2 AND 500 OR p_reason ~ '[[:cntrl:]]' THEN RETURN jsonb_build_object('code','invalid_change'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('staff-appointment-operation:'||p_operation::text,0));
 SELECT s.booking_id,bk.context_id INTO booking,context FROM appointment_system.slot_claims s JOIN appointment_system.bookings bk ON bk.id=s.booking_id WHERE s.id=p_claim;
 IF NOT FOUND THEN RETURN jsonb_build_object('code','appointment_unavailable'); END IF;
 PERFORM 1 FROM appointment_system.checkout_contexts WHERE id=context FOR UPDATE;
 IF appointment_system.studio_calendar_actor(p_session,p_client,p_origin) IS NULL THEN RETURN jsonb_build_object('code','access_unavailable'); END IF;
 SELECT * INTO old FROM appointment_system.staff_appointment_actions WHERE operation_id=p_operation;
 IF FOUND THEN
  IF old.action<>'cancel' OR old.actor IS DISTINCT FROM actor OR old.claim_id IS DISTINCT FROM p_claim OR old.previous_revision IS DISTINCT FROM p_revision OR old.reason IS DISTINCT FROM p_reason THEN RETURN jsonb_build_object('code','request_conflict'); END IF;
  RETURN jsonb_build_object('code','cancelled','revision',old.revision,'policy_guidance',old.policy_guidance);
 END IF;
 SELECT * INTO b FROM appointment_system.bookings WHERE id=booking FOR UPDATE;
 instant:=clock_timestamp();
 IF b.revision<>p_revision THEN RETURN jsonb_build_object('code','revision_changed'); END IF;
 IF b.state<>'confirmed' OR b.starts_at<=instant OR NOT EXISTS(SELECT 1 FROM appointment_system.slot_claims WHERE id=p_claim AND released_at IS NULL) THEN RETURN jsonb_build_object('code','appointment_unavailable'); END IF;
 guidance:=CASE WHEN b.payment_method='at_clinic' THEN 'no_payment_received' WHEN EXISTS(SELECT 1 FROM appointment_system.staff_appointment_actions WHERE booking_id=b.id AND action='reschedule') THEN 'staff_review' WHEN b.starts_at>=instant+interval '24 hours' THEN 'full_refund_review' WHEN b.starts_at>=instant+interval '12 hours' THEN 'staff_review' ELSE 'late_reschedule_review' END;
 old_snapshot:=appointment_system.booking_snapshot(b.id);
 snapshot:=old_snapshot||jsonb_build_object('revision',b.revision+1,'state','cancelled','cancelled_at',instant)||CASE WHEN b.service_snapshot->'facts_version'='2'::jsonb THEN jsonb_build_object('amount_due_paise',0) ELSE '{}'::jsonb END;
 INSERT INTO appointment_system.staff_appointment_actions(operation_id,claim_id,booking_id,action,actor,reason,previous_revision,revision,starts_at,notice_seconds,policy_guidance)
 VALUES(p_operation,p_claim,b.id,'cancel',actor,p_reason,b.revision,b.revision+1,b.starts_at,floor(extract(epoch FROM b.starts_at-instant))::bigint,guidance);
 UPDATE appointment_system.bookings SET state='cancelled',cancelled_at=instant,revision=revision+1 WHERE id=b.id;
 UPDATE appointment_system.slot_claims SET released_at=instant WHERE id=p_claim;
 -- Never erase accepted evidence or revoke an in-flight completion lease.
 UPDATE appointment_system.delivery_jobs SET state='suppressed',last_error_code='appointment_cancelled'
 WHERE booking_id=b.id AND booking_revision=b.revision AND kind IN ('booking_ack','booking_details','booking_calendar')
 AND state IN ('pending','retry_wait') AND first_attempt_at IS NULL AND payload IS NULL AND provider_id IS NULL AND lease_token IS NULL;
 INSERT INTO appointment_system.delivery_jobs(id,booking_id,kind,recipient_role,booking_revision,payload)
 SELECT gen_random_uuid(),b.id,'booking_cancelled','calendar',b.revision,old_snapshot
 WHERE b.service_snapshot->>'meeting'='google_meet'
 ON CONFLICT(kind,booking_id,recipient_role,booking_revision,event_key) DO NOTHING;
 INSERT INTO appointment_system.delivery_jobs(id,booking_id,kind,recipient_role,booking_revision,payload)
 SELECT gen_random_uuid(),b.id,'sheet_booking',role,b.revision+1,snapshot FROM (VALUES('client_sheet'),('agency_sheet')) roles(role);
 INSERT INTO appointment_system.delivery_jobs(id,booking_id,kind,recipient_role,booking_revision)
 SELECT gen_random_uuid(),b.id,'booking_cancelled',role,b.revision+1 FROM (VALUES('customer'),('client')) roles(role) WHERE role<>'customer' OR b.email IS NOT NULL;
 RETURN jsonb_build_object('code','cancelled','revision',b.revision+1,'policy_guidance',guidance);
END $$;

CREATE OR REPLACE FUNCTION appointment_system.booking_snapshot(p_booking uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
 SELECT CASE WHEN b.service_snapshot->'facts_version'='2'::jsonb THEN jsonb_build_object(
 'facts_version',2,'resource_id',b.resource_id,'resource_name',b.service_snapshot->>'resource_name',
 'payment_method',b.payment_method,'amount_due_paise',CASE WHEN b.payment_method='at_clinic' AND b.state='confirmed' THEN b.amount_paise ELSE 0 END,
 'location',b.service_snapshot->'location','display_duration',b.service_snapshot->'display_duration') ELSE '{}'::jsonb END || jsonb_build_object('id',id,'request_id',request_id,'revision',revision,'state',state,
  'service_snapshot',service_snapshot,'starts_at',starts_at,'ends_at',ends_at,'practice_timezone',practice_timezone,
  'calendar_protocol',calendar_protocol,'policy_version',policy_version,'service_id',service_id,'verification_policy_revision',(SELECT appointment_system.verification_policy(specification) FROM appointment_system.booking_policies WHERE version=b.policy_version),'meet_url',(SELECT meet_url FROM appointment_system.meeting_events WHERE booking_id=b.id AND booking_revision=b.revision AND state='ready'),'payment_identity',(SELECT jsonb_build_object('merchant_id',merchant_id,'mode',mode,'credential_version',credential_version,'provider_order_id',provider_order_id) FROM appointment_system.payment_orders WHERE booking_id=b.id),'created_at',created_at,'cancelled_at',cancelled_at,'original_starts_at',original_starts_at,'full_name',full_name,'email',email,'phone',phone,
  'amount_paise',amount_paise,'currency',currency,'preparation',preparation,
  'questions',coalesce((service_snapshot->>'questions')::integer,1),
  'payment_reference',(SELECT a.payment_id FROM appointment_system.accepted_payments a WHERE a.booking_id=b.id))
 FROM appointment_system.bookings b WHERE id=p_booking
$$;

CREATE OR REPLACE FUNCTION appointment_system.booking_receipt_facts(p_booking appointment_system.bookings,p_at timestamptz) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,appointment_system,pg_temp AS $$
 SELECT CASE WHEN b.service_snapshot->'facts_version'='2'::jsonb THEN jsonb_build_object(
 'facts_version',2,'resource_id',b.resource_id,'resource_name',b.service_snapshot->>'resource_name',
 'payment_method',b.payment_method,'amount_due_paise',CASE WHEN b.payment_method='at_clinic' AND b.state='confirmed' THEN b.amount_paise ELSE 0 END,
 'location',b.service_snapshot->'location','display_duration',b.service_snapshot->'display_duration') ELSE '{}'::jsonb END || jsonb_build_object(
  'request_id',b.request_id,'booking_revision',b.revision,'meeting_mode',b.service_snapshot->>'meeting',
'state',b.state,'order_state',CASE WHEN b.payment_method='at_clinic' THEN 'not_required' ELSE p.state END,'attempted_at',p.attempted_at,
        'provider_order_id',p.provider_order_id,'resolution',p.resolution,'resolved_at',p.resolved_at,
        'hold_expires_at',b.hold_expires_at,'service_name',b.service_snapshot->>'name',
        'amount_paise',b.amount_paise,'currency',b.currency,'starts_at',b.starts_at,'ends_at',b.ends_at,
        'practice_timezone',b.practice_timezone,
        'payment_state',CASE WHEN b.payment_method='at_clinic' THEN 'due_at_clinic'
          WHEN EXISTS(SELECT 1 FROM appointment_system.payment_cases WHERE booking_id=b.id AND resolved_at IS NULL) THEN 'needs_attention'
          WHEN amounts.captured_paise>0 AND amounts.refunded_paise>=amounts.captured_paise THEN 'refunded'
          WHEN amounts.refunded_paise>0 THEN 'partially_refunded'
          WHEN EXISTS(SELECT 1 FROM appointment_system.accepted_payments WHERE booking_id=b.id) THEN 'captured'
          WHEN EXISTS(SELECT 1 FROM appointment_system.payment_observations WHERE booking_id=b.id AND status='captured' AND captured) THEN 'captured'
          WHEN EXISTS(SELECT 1 FROM (
            SELECT DISTINCT ON (merchant_id,mode,payment_id) status
            FROM appointment_system.payment_observations WHERE booking_id=b.id
            ORDER BY merchant_id,mode,payment_id,observed_at DESC,
              CASE status WHEN 'refunded' THEN 5 WHEN 'captured' THEN 4
                WHEN 'failed' THEN 3 WHEN 'authorized' THEN 2 ELSE 1 END DESC,id DESC
          ) latest WHERE status IN ('created','authorized')) THEN 'pending'
          WHEN EXISTS(SELECT 1 FROM appointment_system.payment_observations WHERE booking_id=b.id AND status='failed') THEN 'failed_observed'
          ELSE 'unobserved' END,
        'captured_paise',coalesce(amounts.captured_paise,0),'refunded_paise',coalesce(amounts.refunded_paise,0),
        'payment_checked_at',(SELECT max(observed_at) FROM appointment_system.payment_observations WHERE booking_id=b.id),
        'meeting_state',CASE
          WHEN b.state='cancelled' THEN 'cancelled' WHEN b.service_snapshot->>'meeting' IN ('internal','in_person') THEN 'not_created'
          WHEN EXISTS(SELECT 1 FROM appointment_system.delivery_jobs WHERE booking_id=b.id AND booking_revision=b.revision
                       AND kind='booking_calendar' AND state='needs_review') THEN 'needs_attention'
          WHEN b.state='confirmed' AND EXISTS(SELECT 1 FROM appointment_system.meeting_events WHERE booking_id=b.id
                       AND booking_revision=b.revision AND state='ready') THEN 'ready'
          WHEN b.state='confirmed' THEN 'preparing' ELSE 'not_created' END,
        'meet_url',CASE WHEN b.state='confirmed' THEN (SELECT meet_url FROM appointment_system.meeting_events
          WHERE booking_id=b.id AND booking_revision=b.revision AND state='ready') ELSE NULL END,
        'acknowledgement_state',CASE WHEN b.email IS NULL THEN 'not_requested' ELSE coalesce((SELECT appointment_system.email_delivery_state(id) FROM appointment_system.delivery_jobs WHERE booking_id=b.id
           AND booking_revision=b.revision AND kind='booking_ack' AND recipient_role='customer'),'not_queued') END,
        'meeting_email_state',CASE WHEN b.email IS NULL THEN 'not_requested' ELSE coalesce((SELECT appointment_system.email_delivery_state(id) FROM appointment_system.delivery_jobs WHERE booking_id=b.id
           AND booking_revision=b.revision AND kind='booking_details' AND recipient_role='customer'),'not_queued') END
 ) FROM (SELECT (p_booking).*) b
 LEFT JOIN appointment_system.payment_orders p ON p.booking_id=b.id

      LEFT JOIN LATERAL (
        SELECT accepted.amount_paise AS captured_paise,coalesce(max(o.refunded_paise),0) AS refunded_paise
        FROM appointment_system.accepted_payments a
        JOIN appointment_system.payment_observations accepted ON accepted.id=a.observation_id
        JOIN appointment_system.payment_observations o ON o.booking_id=a.booking_id AND o.merchant_id=a.merchant_id
          AND o.mode=a.mode AND o.payment_id=a.payment_id
        WHERE a.booking_id=b.id
        GROUP BY accepted.amount_paise
      ) amounts ON true

$$;

CREATE OR REPLACE FUNCTION appointment_system.entry_api_receipt_snapshot(p1 uuid) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,appointment_system,pg_temp AS $$
 WITH instant AS MATERIALIZED (SELECT clock_timestamp() AS at)
 SELECT jsonb_build_object('server_now',instant.at,
  'booking_product_enabled',appointment_system.control_snapshot()->'enabled','booking',(
   SELECT appointment_system.booking_receipt_facts(b,instant.at)||jsonb_build_object(
    'receipt_digest',a.receipt_digest,'receipt_format',b.receipt_format,'receipt_key_id',b.receipt_key_id,
    'booking_id',b.id,'context_id',b.context_id,'has_booking_email',b.email IS NOT NULL,
    'email_copy',appointment_system.receipt_copy_state(b.id),
    'merchant_id',p.merchant_id,'mode',p.mode,'credential_version',p.credential_version,
    'receipt_expires_at',b.receipt_expires_at,'receipt_revoked_at',b.receipt_revoked_at)
   FROM appointment_system.bookings b
    JOIN appointment_system.checkout_admissions a ON a.request_id=b.request_id
    LEFT JOIN appointment_system.payment_orders p ON p.booking_id=b.id WHERE b.request_id=p1
  )) FROM instant
$$;
CREATE OR REPLACE FUNCTION appointment_system.booking_details(p_name text,p_phone text,p_epoch uuid,p_reference uuid,
 p_as_of timestamptz,p_bucket integer,p_start timestamptz,p_last uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,appointment_system,pg_temp AS $$
DECLARE instant timestamptz:=clock_timestamp();ordering_at timestamptz:=coalesce(p_as_of,instant);
 normalized text;result jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock_shared(83124,5);
 PERFORM appointment_system.require_registered_caller(ARRAY['web']);
 IF p_epoch IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0503',MESSAGE='lookup admission unavailable'; END IF;
 PERFORM appointment_system.control_admission(p_epoch);
 normalized:=appointment_system.booking_lookup_name(p_name);
 IF p_name IS NULL OR length(p_name) NOT BETWEEN 2 AND 100 OR normalized IS NULL OR length(normalized) NOT BETWEEN 2 AND 100
  OR p_phone IS NULL OR p_phone !~ '^\+[1-9][0-9]{6,14}$' THEN
  RETURN jsonb_build_object('code','invalid_name'); END IF;
 IF (p_as_of IS NULL AND (p_bucket IS NOT NULL OR p_start IS NOT NULL OR p_last IS NOT NULL))
  OR (p_as_of IS NOT NULL AND (p_bucket IS NULL OR p_start IS NULL OR p_last IS NULL
    OR NOT isfinite(p_as_of) OR NOT isfinite(p_start) OR p_as_of>instant OR p_as_of<instant-interval '24 hours'
    OR p_bucket NOT IN (0,1) OR p_last='00000000-0000-0000-0000-000000000000'::uuid
    OR (p_bucket=0 AND p_start<p_as_of) OR (p_bucket=1 AND p_start>=p_as_of)))
  OR (p_reference IS NOT NULL AND p_as_of IS NOT NULL) THEN
  RETURN jsonb_build_object('code','invalid_cursor'); END IF;
 IF p_reference IS NOT NULL THEN
  -- The matched row and STABLE fact helper share one read snapshot. No global
  -- reference lookup, receipt secret, contact value or action is returned.
  WITH matched AS MATERIALIZED (
   SELECT b FROM appointment_system.bookings b WHERE b.phone=p_phone
    AND appointment_system.booking_lookup_name(b.full_name)=normalized AND b.request_id=p_reference
  ) SELECT appointment_system.booking_receipt_facts(m.b,instant) INTO result FROM matched m;
  RETURN jsonb_build_object('server_now',instant,'booking',result);
 END IF;
 -- Two bounded index ranges. At most 42 candidates reach the merge; at most
 -- 21 leave SQL. Freeze the time boundary, not the underlying booking records.
 WITH future AS MATERIALIZED (
  SELECT b.request_id,b.revision,b.service_snapshot->>'name' AS service_name,b.starts_at,b.ends_at,b.practice_timezone,
   b.state,b.hold_expires_at,b.resource_id,b.service_snapshot,0 AS bucket FROM appointment_system.bookings b
  WHERE (p_bucket IS NULL OR p_bucket=0) AND b.phone=p_phone
   AND appointment_system.booking_lookup_name(b.full_name)=normalized AND b.starts_at>=ordering_at
   AND (p_bucket IS NULL OR (b.starts_at,b.request_id)>(p_start,p_last))
  ORDER BY b.starts_at,b.request_id LIMIT 21
 ), past AS MATERIALIZED (
  SELECT b.request_id,b.revision,b.service_snapshot->>'name' AS service_name,b.starts_at,b.ends_at,b.practice_timezone,
   b.state,b.hold_expires_at,b.resource_id,b.service_snapshot,1 AS bucket FROM appointment_system.bookings b
  WHERE b.phone=p_phone AND appointment_system.booking_lookup_name(b.full_name)=normalized AND b.starts_at<ordering_at
   AND (p_bucket IS NULL OR p_bucket=0 OR (b.starts_at,b.request_id)<(p_start,p_last))
  ORDER BY b.starts_at DESC,b.request_id DESC LIMIT 21
 ), page AS MATERIALIZED (
  SELECT * FROM (SELECT * FROM future UNION ALL SELECT * FROM past) candidates
  ORDER BY bucket,CASE WHEN bucket=0 THEN starts_at END,CASE WHEN bucket=0 THEN request_id END,
   CASE WHEN bucket=1 THEN starts_at END DESC,CASE WHEN bucket=1 THEN request_id END DESC LIMIT 21
 ) SELECT coalesce(jsonb_agg(jsonb_build_object('request_id',request_id,'booking_revision',revision,
    'service_name',service_name,'starts_at',starts_at,'ends_at',ends_at,'timezone',practice_timezone,'bucket',bucket,
    'appointment_state',CASE WHEN state='held' AND hold_expires_at<=instant THEN 'expired' ELSE state END)||CASE WHEN service_snapshot->'facts_version'='2'::jsonb THEN jsonb_build_object('facts_version',2,'resource_id',resource_id,'resource_name',service_snapshot->>'resource_name','display_duration',service_snapshot->'display_duration') ELSE '{}'::jsonb END
   ORDER BY bucket,CASE WHEN bucket=0 THEN starts_at END,CASE WHEN bucket=0 THEN request_id END,
    CASE WHEN bucket=1 THEN starts_at END DESC,CASE WHEN bucket=1 THEN request_id END DESC),'[]'::jsonb)
  INTO result FROM page;
 RETURN jsonb_build_object('server_now',instant,'as_of',ordering_at,'items',result);
END $$;

CREATE OR REPLACE FUNCTION appointment_system.studio_calendar_actor(p_session text, p_client text, p_origin text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE s appointment_system.studio_sessions%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock_shared(83124,4);
 IF p_origin=(appointment_system.installation_value('origin')||'/company/booking-support') THEN
  RETURN appointment_system.control_obligation_actor(p_session,p_client,p_origin);
 END IF;
 PERFORM appointment_system.control_admission(NULL);
 SELECT * INTO s FROM appointment_system.studio_sessions WHERE digest=p_session FOR SHARE;
 IF NOT FOUND OR (s.role<>'client' AND NOT(s.role='agency' AND appointment_system.current_business()->'version'='2'::jsonb AND EXISTS(SELECT 1 FROM appointment_system.installation WHERE singleton AND specification->'schedule_management' ? 'agency'))) OR s.client_id IS DISTINCT FROM p_client OR s.origin IS DISTINCT FROM p_origin
  OR s.revoked_at IS NOT NULL OR s.expires_at<=clock_timestamp()
  OR NOT EXISTS(SELECT 1 FROM appointment_system.studio_identities i WHERE i.role=s.role AND i.subject=s.subject) THEN RETURN NULL; END IF;
 RETURN s.role||':'||encode(sha256(convert_to(s.subject,'UTF8')),'hex');
END $$;

CREATE OR REPLACE FUNCTION appointment_system.entry_studio_calendar_list(p_session text, p_client text, p_origin text, p_day date, p_after uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE result jsonb; from_time timestamptz; to_time timestamptz; actor text;
BEGIN
 actor:=appointment_system.studio_calendar_actor(p_session,p_client,p_origin);
 IF actor IS NULL THEN RETURN jsonb_build_object('code','access_unavailable'); END IF;
 IF p_day IS NULL OR NOT isfinite(p_day) OR p_day<(clock_timestamp() AT TIME ZONE (appointment_system.current_business()->>'timezone'))::date-31
    OR p_day>(clock_timestamp() AT TIME ZONE (appointment_system.current_business()->>'timezone'))::date+366 THEN
   RETURN jsonb_build_object('code','invalid_calendar_date'); END IF;
 from_time:=p_day::timestamp AT TIME ZONE (appointment_system.current_business()->>'timezone');
 to_time:=(p_day+1)::timestamp AT TIME ZONE (appointment_system.current_business()->>'timezone');
 WITH page AS (
  SELECT s.id,s.booking_id,s.resource_id,coalesce(b.starts_at,s.starts_at) AS starts_at,coalesce(b.ends_at,s.ends_at) AS ends_at,s.closure_reason,b.full_name,b.state,b.service_snapshot
  FROM appointment_system.slot_claims s LEFT JOIN appointment_system.bookings b ON b.id=s.booking_id
  WHERE s.released_at IS NULL AND (s.booking_id IS NULL OR b.state='confirmed') AND coalesce(b.starts_at,s.starts_at)<to_time AND coalesce(b.ends_at,s.ends_at)>from_time
    AND (p_after IS NULL OR s.id>p_after) ORDER BY s.id LIMIT 51
 ), shown AS (SELECT * FROM page ORDER BY id LIMIT 50)
 SELECT jsonb_build_object('code','ok','day',p_day,'timezone',(appointment_system.current_business()->>'timezone'),
   'items',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'kind',CASE WHEN booking_id IS NULL THEN 'closure' ELSE 'appointment' END,
      'starts_at',starts_at,'ends_at',ends_at,'reason',CASE WHEN booking_id IS NULL THEN closure_reason ELSE NULL END,
      'name',CASE WHEN booking_id IS NOT NULL THEN full_name ELSE NULL END,
      'service',CASE WHEN booking_id IS NOT NULL THEN service_snapshot->>'name' ELSE NULL END,
      'state',CASE WHEN booking_id IS NOT NULL THEN state ELSE NULL END)||CASE WHEN appointment_system.current_business()->'version'='2'::jsonb THEN jsonb_build_object('resource_id',resource_id,'resource_name',coalesce(service_snapshot->>'resource_name',(SELECT r->>'name' FROM jsonb_array_elements(appointment_system.current_business()->'resources') r WHERE r->>'id'=resource_id))) ELSE '{}'::jsonb END ORDER BY id) FROM shown),'[]'::jsonb),
   'next_cursor',CASE WHEN (SELECT count(*) FROM page)>50 THEN (SELECT id FROM shown ORDER BY id DESC LIMIT 1) ELSE NULL END)
 INTO result;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION appointment_system.entry_studio_calendar_close(p_session text, p_client text, p_origin text, p_operation uuid, p_reason text, p_start timestamp with time zone, p_end timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE actor text; result jsonb; active boolean;
BEGIN
 actor:=appointment_system.studio_calendar_actor(p_session,p_client,p_origin);
 IF actor IS NULL THEN RETURN jsonb_build_object('code','access_unavailable'); END IF;
 IF p_operation IS NULL OR p_start IS NULL OR p_end IS NULL OR NOT isfinite(p_start) OR NOT isfinite(p_end)
   OR p_end<=p_start OR p_end-p_start>interval '31 days'
   OR p_end>clock_timestamp()+interval '366 days' OR coalesce(length(btrim(p_reason)),0) NOT BETWEEN 2 AND 500
 THEN RETURN jsonb_build_object('code','invalid_closure'); END IF;
 IF appointment_system.studio_calendar_actor(p_session,p_client,p_origin) IS NULL THEN RETURN jsonb_build_object('code','access_unavailable'); END IF;
 IF appointment_system.current_business()->'version'='2'::jsonb THEN RETURN jsonb_build_object('code','upgrade_required'); END IF;
 result:=appointment_system.close_calendar(p_operation,actor,p_reason,p_start,p_end);
 IF result ? 'claim_id' THEN
   SELECT released_at IS NULL INTO active FROM appointment_system.slot_claims WHERE id=(result->>'claim_id')::uuid;
   result:=result||jsonb_build_object('active',active);
 END IF;
 RETURN result;
END $$;

CREATE TABLE appointment_system.resource_closure_actions(
 operation_id uuid PRIMARY KEY,actor text NOT NULL,resource_selector text NOT NULL,
 reason text NOT NULL,starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL,claim_ids uuid[] NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE FUNCTION appointment_system.studio_calendar_close_resource(p_session text,p_client text,p_origin text,p_operation uuid,p_reason text,p_start timestamptz,p_end timestamptz,p_resource text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,appointment_system,pg_temp AS $$
DECLARE actor text;spec jsonb;targets text[];target text;ids uuid[]:=ARRAY[]::uuid[];claim uuid;old appointment_system.resource_closure_actions%ROWTYPE;
BEGIN
 PERFORM appointment_system.require_registered_caller(ARRAY['staff','company']);
 actor:=appointment_system.studio_calendar_actor(p_session,p_client,p_origin);
 IF actor IS NULL THEN RETURN jsonb_build_object('code','access_unavailable'); END IF;
 PERFORM 1 FROM appointment_system.intake_settings WHERE singleton FOR SHARE;
 spec:=appointment_system.current_business();
 IF spec->'version'<>'2'::jsonb OR p_operation IS NULL OR p_resource IS NULL
 OR p_start IS NULL OR p_end IS NULL OR NOT isfinite(p_start) OR NOT isfinite(p_end)
 OR p_end<=p_start OR p_end<=clock_timestamp() OR p_end-p_start>interval '31 days'
 OR p_end>clock_timestamp()+interval '366 days' OR coalesce(length(btrim(p_reason)),0) NOT BETWEEN 2 AND 500
 OR p_reason ~ '[[:cntrl:]]' THEN RETURN jsonb_build_object('code','invalid_closure'); END IF;
 SELECT array_agg(r->>'id' ORDER BY r->>'id') INTO targets FROM jsonb_array_elements(spec->'resources') r
 WHERE p_resource='*' OR r->>'id'=p_resource;
 IF coalesce(array_length(targets,1),0)=0 THEN RETURN jsonb_build_object('code','invalid_resource'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('staff-calendar-operation:'||p_operation::text,0));
 SELECT * INTO old FROM appointment_system.resource_closure_actions WHERE operation_id=p_operation;
 IF FOUND THEN
  IF old.actor IS DISTINCT FROM actor OR old.resource_selector IS DISTINCT FROM p_resource OR old.reason IS DISTINCT FROM p_reason OR old.starts_at IS DISTINCT FROM p_start OR old.ends_at IS DISTINCT FROM p_end THEN
   RETURN jsonb_build_object('code','request_conflict'); END IF;
  RETURN jsonb_build_object('code','existing','claim_ids',old.claim_ids,'active',NOT EXISTS(SELECT 1 FROM unnest(old.claim_ids) AS owned(claim_id) LEFT JOIN appointment_system.slot_claims c ON c.id=owned.claim_id WHERE c.id IS NULL OR c.released_at IS NOT NULL));
 END IF;
 IF EXISTS(SELECT 1 FROM appointment_system.staff_calendar_actions WHERE operation_id=p_operation) THEN RETURN jsonb_build_object('code','request_conflict'); END IF;
 PERFORM appointment_system.lock_capacity_window(p_start,p_end);
 PERFORM appointment_system.expire_relevant(p_start,p_end);
 IF EXISTS(SELECT 1 FROM appointment_system.slot_claims WHERE released_at IS NULL AND resource_id=ANY(targets)
  AND tstzrange(starts_at,ends_at,'[)')&&tstzrange(p_start,p_end,'[)')) THEN RETURN jsonb_build_object('code','time_already_reserved'); END IF;
 BEGIN
  FOREACH target IN ARRAY targets LOOP
   claim:=gen_random_uuid();ids:=array_append(ids,claim);
   INSERT INTO appointment_system.slot_claims(id,closure_reason,starts_at,ends_at,resource_id) VALUES(claim,p_reason,p_start,p_end,target);
  END LOOP;
  INSERT INTO appointment_system.resource_closure_actions(operation_id,actor,resource_selector,reason,starts_at,ends_at,claim_ids)
   VALUES(p_operation,actor,p_resource,p_reason,p_start,p_end,ids);
 EXCEPTION WHEN exclusion_violation THEN RETURN jsonb_build_object('code','time_already_reserved'); END;
 RETURN jsonb_build_object('code','closed','claim_ids',ids,'active',true);
END $$;


CREATE FUNCTION appointment_system.route_resource_notification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,appointment_system,pg_temp AS $$
DECLARE b appointment_system.bookings%ROWTYPE;
BEGIN
 SELECT * INTO b FROM appointment_system.bookings WHERE id=NEW.booking_id;
 IF b.service_snapshot->'facts_version'='2'::jsonb AND NEW.kind IN ('booking_ack','booking_cancelled','payment_review') AND NEW.recipient_role='client' THEN
  NEW.recipient_role:='resource';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER resource_notification_before BEFORE INSERT ON appointment_system.delivery_jobs
FOR EACH ROW EXECUTE FUNCTION appointment_system.route_resource_notification();
CREATE FUNCTION appointment_system.copy_management_notification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,appointment_system,pg_temp AS $$
BEGIN
 IF NEW.recipient_role='resource' THEN
  INSERT INTO appointment_system.delivery_jobs(id,booking_id,kind,recipient_role,booking_revision,event_key,payload)
  VALUES(gen_random_uuid(),NEW.booking_id,NEW.kind,'agency',NEW.booking_revision,NEW.event_key,NEW.payload)
  ON CONFLICT(kind,booking_id,recipient_role,booking_revision,event_key) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER resource_notification_after AFTER INSERT ON appointment_system.delivery_jobs
FOR EACH ROW EXECUTE FUNCTION appointment_system.copy_management_notification();
ALTER TABLE appointment_system.delivery_jobs DROP CONSTRAINT delivery_jobs_destination_check;
ALTER TABLE appointment_system.delivery_jobs ADD CONSTRAINT delivery_jobs_destination_check CHECK(
 (kind='payment_review' AND recipient_role IN ('client','resource','agency') AND length(event_key)>0) OR
 (event_key='' AND ((kind='booking_ack' AND recipient_role IN ('customer','client','resource','agency')) OR
 (kind='booking_calendar' AND recipient_role='calendar') OR(kind='booking_details' AND recipient_role='customer') OR
 (kind='booking_cancelled' AND recipient_role IN ('customer','client','calendar','resource','agency')) OR
 (kind='sheet_booking' AND recipient_role IN ('client_sheet','agency_sheet')))) OR
 (event_key='meeting-ready' AND kind='sheet_booking' AND recipient_role IN ('client_sheet','agency_sheet')) OR
 (kind='booking_receipt' AND recipient_role='customer' AND event_key ~ '^receipt:[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'));
DROP INDEX appointment_system.email_provider_identity;
CREATE UNIQUE INDEX email_provider_identity ON appointment_system.delivery_jobs(provider_id)
 WHERE recipient_role IN ('customer','client','resource','agency') AND provider_id IS NOT NULL;


CREATE OR REPLACE FUNCTION appointment_system.is_email_job(k text, r text) RETURNS boolean
    LANGUAGE sql IMMUTABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$ SELECT (k='booking_ack' AND r IN ('customer','client','resource','agency'))
 OR(k='booking_details' AND r='customer') OR(k='booking_cancelled' AND r IN ('customer','client','resource','agency'))
 OR(k='payment_review' AND r IN ('client','resource','agency')) OR(k='booking_receipt' AND r='customer') $$;

CREATE OR REPLACE FUNCTION appointment_system.entry_claim_email_delivery() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE j appointment_system.delivery_jobs%ROWTYPE; b appointment_system.bookings%ROWTYPE; candidate record; link text;
BEGIN
 FOR candidate IN SELECT id,booking_id FROM appointment_system.delivery_jobs
   WHERE appointment_system.is_email_job(kind,recipient_role) AND state IN ('pending','retry_wait','delivery_unknown','processing')
   AND next_attempt_at<=clock_timestamp() AND (lease_expires_at IS NULL OR lease_expires_at<=clock_timestamp())
   ORDER BY next_attempt_at,id LIMIT 20 LOOP
  SELECT * INTO b FROM appointment_system.bookings WHERE id=candidate.booking_id FOR SHARE SKIP LOCKED;
  IF NOT FOUND THEN CONTINUE; END IF;
  SELECT * INTO j FROM appointment_system.delivery_jobs WHERE id=candidate.id
    AND state IN ('pending','retry_wait','delivery_unknown','processing') AND next_attempt_at<=clock_timestamp()
    AND(lease_expires_at IS NULL OR lease_expires_at<=clock_timestamp()) FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN CONTINUE; END IF;
  IF j.provider_id IS NOT NULL THEN
    UPDATE appointment_system.delivery_jobs SET state='completed',lease_token=NULL,lease_expires_at=NULL WHERE id=j.id;
    CONTINUE;
  END IF;
  IF j.kind<>'payment_review' AND (j.booking_revision<>b.revision OR
    (j.kind='booking_cancelled' AND b.state<>'cancelled') OR (j.kind<>'booking_cancelled' AND b.state<>'confirmed')) THEN
    UPDATE appointment_system.delivery_jobs SET state=CASE WHEN first_attempt_at IS NULL THEN 'suppressed' ELSE 'needs_review' END,
      last_error_code='email_obsolete_revision',lease_token=NULL,lease_expires_at=NULL WHERE id=j.id;
    CONTINUE;
  END IF;
  IF coalesce(j.send_deadline_at,CASE WHEN j.kind IN ('booking_ack','booking_details') THEN b.starts_at ELSE clock_timestamp()+interval '24 hours' END)<=clock_timestamp() THEN
    UPDATE appointment_system.delivery_jobs SET state=CASE WHEN first_attempt_at IS NULL THEN 'suppressed' ELSE 'needs_review' END,
     last_error_code='email_deadline_passed',lease_token=NULL,lease_expires_at=NULL WHERE id=j.id;CONTINUE;
  END IF;
  IF j.kind IN ('booking_details','booking_receipt') AND b.service_snapshot->>'meeting'='google_meet' THEN
    SELECT meet_url INTO link FROM appointment_system.meeting_events WHERE booking_id=b.id AND booking_revision=b.revision AND state='ready';
    IF link IS NULL THEN
      IF j.kind='booking_receipt' AND EXISTS(SELECT 1 FROM appointment_system.delivery_jobs WHERE booking_id=b.id
       AND booking_revision=b.revision AND kind='booking_calendar' AND state='needs_review') THEN
       UPDATE appointment_system.delivery_jobs SET state='needs_review',last_error_code='email_meeting_unavailable',lease_token=NULL,lease_expires_at=NULL WHERE id=j.id;
      ELSE
       UPDATE appointment_system.delivery_jobs SET next_attempt_at=least(clock_timestamp()+interval '30 seconds',coalesce(send_deadline_at,b.starts_at)) WHERE id=j.id;
      END IF;
      CONTINUE;
    END IF;
  END IF;
  IF j.attempts>=20 THEN UPDATE appointment_system.delivery_jobs SET state='needs_review',last_error_code='job_attempt_limit',lease_token=NULL,lease_expires_at=NULL WHERE id=j.id;CONTINUE; END IF;
  UPDATE appointment_system.delivery_jobs SET state='processing',lease_token=gen_random_uuid(),
    lease_expires_at=clock_timestamp()+interval '90 seconds',attempts=attempts+1,
    send_deadline_at=coalesce(send_deadline_at,CASE WHEN kind IN ('booking_ack','booking_details') THEN b.starts_at
      ELSE clock_timestamp()+interval '24 hours' END),
    destination=coalesce(destination,CASE WHEN recipient_role='customer' THEN b.email WHEN recipient_role='resource' THEN appointment_system.installation_value('resource_notifications.'||b.resource_id) WHEN recipient_role='agency' THEN appointment_system.installation_value('owners.agency_email') ELSE appointment_system.installation_value('owners.client_email') END),
    payload=CASE WHEN message_snapshot IS NULL AND first_attempt_at IS NULL THEN coalesce(payload,'{}'::jsonb)||jsonb_build_object('booking_id',b.id,'reference',b.request_id,'service',b.service_snapshot->>'name',
      'starts_at',b.starts_at,'ends_at',b.ends_at,'amount_paise',b.amount_paise,'currency',b.currency,'practice_timezone',b.practice_timezone,'meeting',b.service_snapshot->>'meeting',
      'meet_url',CASE WHEN kind IN ('booking_details','booking_receipt') THEN link ELSE NULL END)||CASE WHEN b.service_snapshot->'facts_version'='2'::jsonb THEN jsonb_build_object('facts_version',2,'resource_id',b.resource_id,'resource_name',b.service_snapshot->>'resource_name','payment_method',b.payment_method,'amount_due_paise',CASE WHEN b.payment_method='at_clinic' AND b.state='confirmed' THEN b.amount_paise ELSE 0 END,'location',b.service_snapshot->'location','display_duration',b.service_snapshot->'display_duration') ELSE '{}'::jsonb END ELSE payload END
    WHERE id=j.id RETURNING * INTO j;
  RETURN to_jsonb(j);
 END LOOP;
 RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION appointment_system.entry_studio_appointment_detail(p_session text, p_client text, p_origin text, p_claim uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE b appointment_system.bookings%ROWTYPE;
BEGIN
 IF appointment_system.studio_calendar_actor(p_session,p_client,p_origin) IS NULL THEN RETURN jsonb_build_object('code','access_unavailable'); END IF;
 SELECT booking.* INTO b FROM appointment_system.bookings booking JOIN appointment_system.slot_claims s ON s.booking_id=booking.id WHERE s.id=p_claim;
 IF NOT FOUND THEN RETURN jsonb_build_object('code','appointment_unavailable'); END IF;
 RETURN jsonb_build_object('code','ok','claim_id',p_claim,'revision',b.revision,'state',b.state,'name',b.full_name,
 'service',b.service_snapshot->>'name','reference',b.request_id,'starts_at',b.starts_at,'ends_at',b.ends_at,
 'can_cancel',b.state='confirmed' AND b.starts_at>clock_timestamp(),
 'can_reschedule',b.state='confirmed' AND b.starts_at>clock_timestamp(),
 'policy_guidance',CASE WHEN b.payment_method='at_clinic' THEN 'no_payment_received' WHEN EXISTS(SELECT 1 FROM appointment_system.staff_appointment_actions WHERE booking_id=b.id AND action='reschedule') THEN 'staff_review' WHEN b.starts_at>=clock_timestamp()+interval '24 hours' THEN 'full_refund_review'
 WHEN b.starts_at>=clock_timestamp()+interval '12 hours' THEN 'staff_review' ELSE 'late_reschedule_review' END)||CASE WHEN b.service_snapshot->'facts_version'='2'::jsonb THEN jsonb_build_object('resource_id',b.resource_id,'resource_name',b.service_snapshot->>'resource_name','payment_method',b.payment_method) ELSE '{}'::jsonb END;
END $$;

CREATE OR REPLACE FUNCTION appointment_system.staff_signin_consume(p_state text, p_browser text, p_purpose text, p_client text, p_origin text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE a appointment_system.google_attempts%ROWTYPE;result jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock_shared(83124,4);
 PERFORM appointment_system.require_registered_caller(ARRAY['staff']);
 IF p_purpose IS DISTINCT FROM 'signin' OR p_origin IS DISTINCT FROM appointment_system.installation_value('origin') THEN RETURN NULL; END IF;
 SELECT * INTO a FROM appointment_system.google_attempts WHERE state_digest=p_state FOR UPDATE;
 IF NOT FOUND OR (a.role<>'client' AND NOT(a.role='agency' AND a.portal='booking' AND (appointment_system.current_business()->'version'='2'::jsonb AND EXISTS(SELECT 1 FROM appointment_system.installation WHERE singleton AND specification->'schedule_management' ? 'agency')))) OR a.purpose<>'signin' THEN RETURN NULL; END IF;
 IF a.portal='booking' THEN
  IF NOT coalesce((SELECT enabled FROM appointment_system.control_product_state WHERE singleton),false) THEN RETURN NULL; END IF;
  PERFORM appointment_system.control_admission(NULL);
 END IF;
 result:=appointment_system.entry_consume_google_attempt(p_state,p_browser,p_purpose,p_client,p_origin);
 IF result IS NULL THEN RETURN NULL; END IF;
 RETURN result||jsonb_build_object('portal',a.portal);
END $$;

CREATE OR REPLACE FUNCTION appointment_system.staff_signin_finish(p_state text, p_subject text, p_session text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $_$
DECLARE a appointment_system.google_attempts%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock_shared(83124,4);
 PERFORM appointment_system.require_registered_caller(ARRAY['staff']);
 SELECT * INTO a FROM appointment_system.google_attempts WHERE state_digest=p_state;
 IF NOT FOUND OR (a.role<>'client' AND NOT(a.role='agency' AND a.portal='booking' AND (appointment_system.current_business()->'version'='2'::jsonb AND EXISTS(SELECT 1 FROM appointment_system.installation WHERE singleton AND specification->'schedule_management' ? 'agency')))) OR a.purpose<>'signin' OR p_session IS NULL OR p_session!~'^[a-f0-9]{64}$' THEN RETURN false; END IF;
 IF a.portal='booking' THEN
  IF NOT coalesce((SELECT enabled FROM appointment_system.control_product_state WHERE singleton),false) THEN RETURN false; END IF;
  PERFORM appointment_system.control_admission(NULL);
 END IF;
 RETURN appointment_system.entry_finish_google_signin(p_state,p_subject,p_session);
END $_$;

CREATE OR REPLACE FUNCTION appointment_system.staff_signin_start(p_state text, p_browser text, p_purpose text, p_role text, p_encrypted text, p_session text, p_client text, p_origin text, p_portal text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $_$
BEGIN
 PERFORM pg_advisory_xact_lock_shared(83124,4);
 PERFORM appointment_system.require_registered_caller(ARRAY['staff']);
 IF p_purpose IS DISTINCT FROM 'signin' OR (p_role IS DISTINCT FROM 'client' AND NOT(p_role='agency' AND p_portal='booking' AND (appointment_system.current_business()->'version'='2'::jsonb AND EXISTS(SELECT 1 FROM appointment_system.installation WHERE singleton AND specification->'schedule_management' ? 'agency')))) OR p_session IS NOT NULL
  OR p_portal IS NULL OR p_portal NOT IN ('booking','enquiry') OR p_origin IS DISTINCT FROM appointment_system.installation_value('origin')
  OR p_state IS NULL OR p_state!~'^[a-f0-9]{64}$' OR p_browser IS NULL OR p_browser!~'^[a-f0-9]{64}$'
  OR p_encrypted IS NULL OR length(p_encrypted) NOT BETWEEN 128 AND 8192
  OR p_client IS NULL OR length(p_client) NOT BETWEEN 20 AND 250 THEN RETURN false; END IF;
 IF p_portal='booking' THEN PERFORM appointment_system.control_admission(NULL); END IF;
 IF NOT appointment_system.entry_start_google_attempt(p_state,p_browser,p_purpose,p_role,p_encrypted,p_session,p_client,p_origin) THEN RETURN false; END IF;
 UPDATE appointment_system.google_attempts SET portal=p_portal WHERE state_digest=p_state;
 RETURN true;
END $_$;

CREATE OR REPLACE FUNCTION appointment_system.finish_email_delivery(p_job uuid, p_lease uuid, p_provider uuid, p_error text, p_attention boolean, p_delay integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $_$
DECLARE j appointment_system.delivery_jobs%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock_shared(83124,4);
 IF p_delay IS NULL OR p_delay NOT BETWEEN 15 AND 86400 OR p_attention IS NULL
   OR(p_error IS NOT NULL AND p_error !~ '^[a-z_]{1,80}$') THEN RETURN false; END IF;
 SELECT * INTO j FROM appointment_system.delivery_jobs WHERE id=p_job FOR UPDATE;
 IF NOT FOUND OR NOT appointment_system.is_email_job(j.kind,j.recipient_role) OR j.lease_token IS DISTINCT FROM p_lease
   OR p_lease IS NULL OR j.state<>'processing' OR j.lease_expires_at<=clock_timestamp() OR NOT appointment_system.transport_claim_current(to_jsonb(j)) THEN RETURN false; END IF;
 IF p_provider IS NOT NULL AND (j.first_attempt_at IS NULL OR j.message_snapshot IS NULL) THEN RETURN false; END IF;
 IF p_provider IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended('appointment-mail-provider:'||p_provider::text,0)); END IF;
 IF p_provider IS NOT NULL AND ((j.provider_id IS NOT NULL AND j.provider_id<>p_provider::text)
   OR EXISTS(SELECT 1 FROM appointment_system.delivery_jobs WHERE provider_id=p_provider::text AND id<>j.id AND recipient_role IN ('customer','client','resource','agency'))
   OR EXISTS(SELECT 1 FROM appointment_system.enquiry_delivery_jobs WHERE provider_id=p_provider::text AND kind IN ('verification','acknowledgement','practice_notice'))) THEN
   UPDATE appointment_system.delivery_jobs SET state='needs_review',last_error_code='email_provider_conflict',lease_token=NULL,lease_expires_at=NULL WHERE id=j.id;
   RETURN false;
 END IF;
 UPDATE appointment_system.delivery_jobs SET provider_id=coalesce(p_provider::text,provider_id),
   accepted_at=CASE WHEN p_provider IS NOT NULL THEN coalesce(accepted_at,clock_timestamp()) ELSE accepted_at END,
   state=CASE WHEN p_provider IS NOT NULL OR provider_id IS NOT NULL THEN 'completed' WHEN p_attention THEN 'needs_review' ELSE 'delivery_unknown' END,
   last_error_code=p_error,next_attempt_at=clock_timestamp()+make_interval(secs=>p_delay),lease_token=NULL,lease_expires_at=NULL WHERE id=j.id;
 RETURN true;
END $_$;

CREATE OR REPLACE FUNCTION appointment_system.entry_reconcile_email_event() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE e appointment_system.provider_inbox%ROWTYPE; j appointment_system.delivery_jobs%ROWTYPE;
 candidate record; provider_uuid uuid; job_uuid uuid; occurred timestamptz; code text;
BEGIN
 FOR candidate IN SELECT p.account_id,p.event_id,p.payload FROM appointment_system.provider_inbox p
   WHERE p.provider='resend' AND p.environment='live' AND p.processed_at IS NULL AND p.next_attempt_at<=clock_timestamp()
    AND (p.account_id=appointment_system.installation_value('sender.email')
     OR EXISTS(SELECT 1 FROM appointment_system.mail_connection m WHERE p.account_id=m.account_id
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(m.legacy_identities) a WHERE a->>'event_account_id'=p.account_id)))
    AND NOT EXISTS(SELECT 1 FROM appointment_system.enquiry_delivery_jobs c WHERE c.id::text=appointment_system.resolved_mail_job(p.account_id,p.payload)::text)
    AND NOT EXISTS(SELECT 1 FROM appointment_system.booking_verification_mail c WHERE c.id::text=appointment_system.resolved_mail_job(p.account_id,p.payload)::text)
   ORDER BY p.next_attempt_at,p.received_at,p.event_id LIMIT 20 LOOP
  code:=NULL;
  BEGIN
    job_uuid:=(appointment_system.resolved_mail_job(candidate.account_id,candidate.payload)::text)::uuid;
    provider_uuid:=(candidate.payload->>'email_id')::uuid;
    occurred:=(candidate.payload->>'occurred_at')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow THEN
    job_uuid:=NULL;provider_uuid:=NULL;occurred:=NULL;
  END;
  SELECT * INTO j FROM appointment_system.delivery_jobs WHERE id=job_uuid FOR UPDATE SKIP LOCKED;
  IF NOT FOUND AND EXISTS(SELECT 1 FROM appointment_system.delivery_jobs WHERE id=job_uuid) THEN CONTINUE; END IF;
  SELECT * INTO e FROM appointment_system.provider_inbox WHERE provider='resend'
    AND account_id=candidate.account_id AND environment='live' AND event_id=candidate.event_id
    AND processed_at IS NULL AND next_attempt_at<=clock_timestamp() FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN CONTINUE; END IF;
  IF provider_uuid IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended('appointment-mail-provider:'||provider_uuid::text,0)); END IF;
  IF j.id IS NULL OR e.account_id IS DISTINCT FROM coalesce(j.mail_event_account_id,appointment_system.installation_value('sender.email')) OR provider_uuid IS NULL OR occurred IS NULL OR
    NOT appointment_system.is_email_job(j.kind,j.recipient_role) OR j.first_attempt_at IS NULL OR j.message_snapshot IS NULL THEN
    code:='email_event_job_unmatched';
  ELSIF (j.provider_id IS NOT NULL AND j.provider_id<>provider_uuid::text) OR
    EXISTS(SELECT 1 FROM appointment_system.delivery_jobs WHERE provider_id=provider_uuid::text AND id<>j.id AND recipient_role IN ('customer','client','resource','agency')) OR
    EXISTS(SELECT 1 FROM appointment_system.enquiry_delivery_jobs WHERE provider_id=provider_uuid::text AND kind IN ('verification','acknowledgement','practice_notice')) THEN
    code:='email_event_provider_conflict';
  ELSIF e.payload->>'event' NOT IN ('email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed','email.suppressed')
    OR e.payload->>'event' IS NULL THEN code:='email_event_invalid';
  END IF;
  IF code IS NULL AND (occurred>clock_timestamp()+interval '5 minutes' OR NOT isfinite(occurred)) THEN
   code:='email_event_invalid'; END IF;
  IF code IS NULL AND e.payload->>'binding_version' IS NOT NULL AND (
   e.payload->>'binding_version'<>'2' OR (e.payload->>'mail_format' IS NOT NULL AND e.payload->>'mail_format' IS DISTINCT FROM j.mail_format) OR e.payload->>'recipient_hash' IS DISTINCT FROM
   encode(sha256(convert_to(lower(trim(j.destination)),'UTF8')),'hex') OR
   (e.payload->>'message_version' IS NOT NULL AND e.payload->>'message_version'<>j.template_version::text)) THEN
   code:='email_event_job_unmatched'; END IF;
  IF code IS NULL AND appointment_system.append_mail_acceptance('booking',j.id,j.message_hash,provider_uuid)<>'accepted' THEN
   code:='email_event_provider_conflict'; END IF;
  IF code IS NOT NULL THEN
    UPDATE appointment_system.provider_inbox SET attempts=attempts+1,last_error_code=code,
      next_attempt_at=clock_timestamp()+interval '1 hour' WHERE provider=e.provider AND account_id=e.account_id
      AND environment=e.environment AND event_id=e.event_id;
    RETURN false;
  END IF;
  INSERT INTO appointment_system.email_observations(event_id,job_id,provider_id,event_type,occurred_at)
    VALUES(e.event_id,j.id,provider_uuid,e.payload->>'event',occurred) ON CONFLICT(event_id) DO NOTHING;
  UPDATE appointment_system.delivery_jobs SET provider_id=provider_uuid::text,accepted_at=coalesce(accepted_at,clock_timestamp()),
    state=CASE WHEN state IN ('needs_review','suppressed') THEN state ELSE 'completed' END
    WHERE id=j.id AND (lease_expires_at IS NULL OR lease_expires_at<=clock_timestamp());
  UPDATE appointment_system.provider_inbox SET processed_at=clock_timestamp(),last_error_code=NULL,attempts=attempts+1
    WHERE provider=e.provider AND account_id=e.account_id AND environment=e.environment AND event_id=e.event_id;
  RETURN true;
 END LOOP;
 RETURN false;
END $$;

CREATE OR REPLACE FUNCTION appointment_system.entry_finish_enquiry_delivery(p_job uuid, p_lease uuid, p_provider text, p_error text, p_attention boolean, p_delay integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $_$
DECLARE e appointment_system.enquiries%ROWTYPE;j appointment_system.enquiry_delivery_jobs%ROWTYPE;owner_id uuid;is_mail boolean;
BEGIN
 PERFORM pg_advisory_xact_lock_shared(83124,4);
 IF p_delay IS NULL OR p_delay NOT BETWEEN 15 AND 86400 OR p_attention IS NULL
   OR (p_error IS NOT NULL AND p_error !~ '^[a-z_]{1,80}$') THEN RETURN false; END IF;
 SELECT request_id INTO owner_id FROM appointment_system.enquiry_delivery_jobs WHERE id=p_job;
 SELECT * INTO e FROM appointment_system.enquiries WHERE request_id=owner_id FOR SHARE;
 SELECT * INTO j FROM appointment_system.enquiry_delivery_jobs WHERE id=p_job FOR UPDATE;
 IF NOT FOUND OR p_lease IS NULL OR j.lease_token IS DISTINCT FROM p_lease OR j.state<>'processing'
   OR j.lease_expires_at<=clock_timestamp() OR NOT appointment_system.transport_claim_current(to_jsonb(j)) THEN RETURN false; END IF;
 is_mail:=j.kind IN ('verification','acknowledgement','practice_notice');
 IF NOT appointment_system.contact_job_eligible(e,j) THEN RETURN false; END IF;
 IF p_provider IS NOT NULL THEN
  IF is_mail THEN
   IF j.first_attempt_at IS NULL OR j.message_digest IS NULL OR p_provider !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' THEN RETURN false; END IF;
   PERFORM pg_advisory_xact_lock(hashtextextended('appointment-mail-provider:'||p_provider,0));
   IF EXISTS(SELECT 1 FROM appointment_system.delivery_jobs WHERE provider_id=p_provider AND recipient_role IN ('customer','client','resource','agency'))
    OR EXISTS(SELECT 1 FROM appointment_system.enquiry_delivery_jobs WHERE provider_id=p_provider AND id<>j.id AND kind IN ('verification','acknowledgement','practice_notice')) THEN
    UPDATE appointment_system.enquiry_delivery_jobs SET state='needs_review',last_error_code='email_provider_conflict',lease_token=NULL,lease_expires_at=NULL WHERE id=j.id;
    RETURN false;
   END IF;
  ELSIF p_provider !~ '^[A-Za-z0-9_-]{1,200}$' THEN RETURN false; END IF;
  IF j.provider_id IS NOT NULL AND j.provider_id<>p_provider THEN RETURN false; END IF;
 END IF;
 UPDATE appointment_system.enquiry_delivery_jobs SET provider_id=coalesce(p_provider,provider_id),
  state=CASE WHEN p_provider IS NOT NULL OR provider_id IS NOT NULL THEN CASE WHEN is_mail THEN 'completed' ELSE 'completed' END
   WHEN p_attention THEN 'needs_review' ELSE 'delivery_unknown' END,last_error_code=p_error,
  next_attempt_at=clock_timestamp()+make_interval(secs=>p_delay),lease_token=NULL,lease_expires_at=NULL WHERE id=j.id;
 RETURN true;
END $_$;

CREATE OR REPLACE FUNCTION appointment_system.entry_reconcile_enquiry_email_event() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE candidate record;e appointment_system.provider_inbox%ROWTYPE;j appointment_system.enquiry_delivery_jobs%ROWTYPE;provider_uuid uuid;occurred timestamptz;fault text;
BEGIN
 FOR candidate IN SELECT p.account_id,p.event_id,p.payload FROM appointment_system.provider_inbox p
  JOIN appointment_system.enquiry_delivery_jobs d ON d.id::text=appointment_system.resolved_mail_job(p.account_id,p.payload)::text
  WHERE p.provider='resend' AND p.account_id=coalesce(d.mail_event_account_id,appointment_system.installation_value('sender.email')) AND p.environment='live'
    AND p.processed_at IS NULL AND p.next_attempt_at<=clock_timestamp() ORDER BY p.next_attempt_at,p.received_at LIMIT 20 LOOP
  SELECT * INTO j FROM appointment_system.enquiry_delivery_jobs WHERE id::text=appointment_system.resolved_mail_job(candidate.account_id,candidate.payload)::text FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN CONTINUE; END IF;
  SELECT * INTO e FROM appointment_system.provider_inbox WHERE provider='resend' AND account_id=candidate.account_id
   AND environment='live' AND event_id=candidate.event_id AND processed_at IS NULL AND next_attempt_at<=clock_timestamp() FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN CONTINUE; END IF;
  fault:=NULL;
  BEGIN
   provider_uuid:=(e.payload->>'email_id')::uuid;occurred:=(e.payload->>'occurred_at')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow THEN provider_uuid:=NULL;occurred:=NULL; END;
  IF provider_uuid IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended('appointment-mail-provider:'||provider_uuid::text,0)); END IF;
  IF j.kind NOT IN ('verification','acknowledgement','practice_notice') OR j.first_attempt_at IS NULL OR j.message_digest IS NULL
   OR provider_uuid IS NULL OR occurred IS NULL OR NOT isfinite(occurred)
   OR e.payload->>'event' IS NULL OR e.payload->>'event' NOT IN ('email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed','email.suppressed') THEN fault:='email_event_job_unmatched';
  ELSIF (j.provider_id IS NOT NULL AND j.provider_id<>provider_uuid::text)
   OR EXISTS(SELECT 1 FROM appointment_system.enquiry_delivery_jobs WHERE provider_id=provider_uuid::text AND id<>j.id)
   OR EXISTS(SELECT 1 FROM appointment_system.delivery_jobs WHERE provider_id=provider_uuid::text AND recipient_role IN ('customer','client','resource','agency'))
   THEN fault:='email_event_provider_conflict'; END IF;
  IF fault IS NULL AND (occurred>clock_timestamp()+interval '5 minutes' OR NOT isfinite(occurred)) THEN
   fault:='email_event_invalid'; END IF;
  IF fault IS NULL AND e.payload->>'binding_version' IS NOT NULL AND (
   e.payload->>'binding_version'<>'2' OR (e.payload->>'mail_format' IS NOT NULL AND e.payload->>'mail_format' IS DISTINCT FROM j.mail_format) OR e.payload->>'recipient_hash' IS DISTINCT FROM
   encode(sha256(convert_to(lower(trim(j.destination)),'UTF8')),'hex') OR
   (e.payload->>'message_version' IS NOT NULL AND e.payload->>'message_version'<>j.template_version::text)) THEN
   fault:='email_event_job_unmatched'; END IF;
  IF fault IS NULL AND appointment_system.append_mail_acceptance('contact',j.id,j.message_digest,provider_uuid)<>'accepted' THEN
   fault:='email_event_provider_conflict'; END IF;
  IF fault IS NOT NULL THEN
   UPDATE appointment_system.provider_inbox SET attempts=attempts+1,last_error_code=fault,next_attempt_at=clock_timestamp()+interval '1 hour'
    WHERE provider=e.provider AND account_id=e.account_id AND environment=e.environment AND event_id=e.event_id; RETURN false;
  END IF;
  INSERT INTO appointment_system.enquiry_email_observations(event_id,job_id,provider_id,event_type,occurred_at)
   VALUES(e.event_id,j.id,provider_uuid,e.payload->>'event',occurred) ON CONFLICT(event_id) DO NOTHING;
  UPDATE appointment_system.enquiry_delivery_jobs SET provider_id=provider_uuid::text,
   state=CASE WHEN state IN ('needs_review','suppressed','suppressed') THEN state ELSE 'completed' END WHERE id=j.id
    AND (lease_expires_at IS NULL OR lease_expires_at<=clock_timestamp());
  UPDATE appointment_system.provider_inbox SET processed_at=clock_timestamp(),last_error_code=NULL,attempts=attempts+1
   WHERE provider=e.provider AND account_id=e.account_id AND environment=e.environment AND event_id=e.event_id;
  RETURN true;
 END LOOP; RETURN false;
END $$;

CREATE OR REPLACE FUNCTION appointment_system.close_calendar(p_operation uuid, p_actor text, p_reason text, p_start timestamp with time zone, p_end timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE old appointment_system.staff_calendar_actions%ROWTYPE; claim uuid;
BEGIN
    PERFORM pg_advisory_xact_lock_shared(83124,4);
    PERFORM 1 FROM appointment_system.intake_settings WHERE singleton FOR SHARE;
    IF appointment_system.current_business()->'version'='2'::jsonb THEN RETURN jsonb_build_object('code','upgrade_required');END IF;
    IF p_operation IS NULL THEN RETURN jsonb_build_object('code','invalid_closure'); END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('staff-calendar-operation:'||p_operation::text,0));
    SELECT * INTO old FROM appointment_system.staff_calendar_actions WHERE operation_id=p_operation;
    IF FOUND THEN
        IF old.action <> 'close' OR old.actor IS DISTINCT FROM p_actor
           OR old.reason IS DISTINCT FROM p_reason OR old.starts_at IS DISTINCT FROM p_start
           OR old.ends_at IS DISTINCT FROM p_end THEN
            RETURN jsonb_build_object('code','request_conflict');
        END IF;
        RETURN jsonb_build_object('code','existing','claim_id',old.claim_id);
    END IF;
    IF p_start IS NULL OR p_end IS NULL OR NOT isfinite(p_start) OR NOT isfinite(p_end)
       OR p_end <= p_start OR p_end <= clock_timestamp() OR p_end-p_start>interval '366 days'
       OR coalesce(length(btrim(p_actor)),0) NOT BETWEEN 1 AND 200
       OR coalesce(length(btrim(p_reason)),0) NOT BETWEEN 1 AND 500 THEN
        RETURN jsonb_build_object('code','invalid_closure');
    END IF;
    PERFORM appointment_system.lock_capacity_window(p_start,p_end);
    PERFORM appointment_system.expire_relevant(p_start,p_end);
    IF EXISTS(SELECT 1 FROM appointment_system.slot_claims WHERE released_at IS NULL
        AND tstzrange(starts_at,ends_at,'[)') && tstzrange(p_start,p_end,'[)')) THEN
        RETURN jsonb_build_object('code','time_already_reserved');
    END IF;
    claim := gen_random_uuid();
    BEGIN
        INSERT INTO appointment_system.slot_claims(id,closure_reason,starts_at,ends_at)
          VALUES(claim,p_reason,p_start,p_end);
        INSERT INTO appointment_system.staff_calendar_actions(operation_id,claim_id,action,actor,reason,starts_at,ends_at)
          VALUES(p_operation,claim,'close',p_actor,p_reason,p_start,p_end);
    EXCEPTION WHEN exclusion_violation THEN
        RETURN jsonb_build_object('code','time_already_reserved');
    END;
    RETURN jsonb_build_object('code','closed','claim_id',claim);
END
$$;

ALTER TABLE appointment_system.receipt_recoveries DROP CONSTRAINT receipt_recoveries_verification_method_check;
ALTER TABLE appointment_system.receipt_recoveries ADD CONSTRAINT receipt_recoveries_verification_method_check CHECK(
 (verification_method='existing_phone_callback' AND verified_payment_id IS NOT NULL AND historical_operation_id IS NULL) OR
 (verification_method='staff_confirmed_clinic_booking' AND verified_payment_id IS NULL AND historical_operation_id IS NULL AND action='contact_correction') OR
 (verification_method='retained_staff_operation' AND verified_payment_id IS NULL AND historical_operation_id=operation_id
  AND historical_operation_id IS NOT NULL AND previous_email IS NULL AND previous_phone IS NULL AND new_email IS NULL AND new_phone IS NULL));

CREATE OR REPLACE FUNCTION appointment_system.entry_studio_support_change(p_session text, p_client text, p_origin text, p_operation uuid, p_reference uuid, p_revision integer, p_action text, p_reason text, p_payment text, p_email text, p_phone text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $_$
DECLARE actor text;prior appointment_system.receipt_recoveries%ROWTYPE;b appointment_system.bookings%ROWTYPE;context uuid;instant timestamptz;old_snapshot jsonb;snapshot jsonb;new_revision integer; frozen_email_required boolean;
BEGIN
 actor:=appointment_system.studio_calendar_actor(p_session,p_client,p_origin);
 IF actor IS NULL OR actor LIKE 'agency:%' THEN RETURN jsonb_build_object('code','access_unavailable');END IF;
 IF p_operation IS NULL OR p_reference IS NULL OR p_revision IS NULL OR p_revision<1 OR p_revision>=2147483647
 OR p_action IS NULL OR p_action<>'contact_correction' OR coalesce(length(btrim(p_reason)),0) NOT BETWEEN 2 AND 500 OR p_reason ~ '[[:cntrl:]]'
 OR (p_payment IS NOT NULL AND p_payment !~ '^pay_[A-Za-z0-9]{1,64}$')
 OR (p_action='contact_correction' AND((p_email IS NOT NULL AND (length(p_email) NOT BETWEEN 3 AND 254 OR p_email ~ '[[:cntrl:]]' OR p_email !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$')) OR p_phone IS NULL OR p_phone !~ '^\+[1-9][0-9]{6,14}$')) THEN RETURN jsonb_build_object('code','invalid_change');END IF;
 SELECT context_id INTO context FROM appointment_system.bookings WHERE request_id=p_reference;
 IF NOT FOUND THEN RETURN jsonb_build_object('code','booking_unavailable');END IF;
 PERFORM 1 FROM appointment_system.checkout_contexts WHERE id=context FOR UPDATE;
 SELECT * INTO b FROM appointment_system.bookings WHERE request_id=p_reference FOR UPDATE;
 IF appointment_system.studio_calendar_actor(p_session,p_client,p_origin) IS NULL THEN RETURN jsonb_build_object('code','access_unavailable');END IF;
 SELECT * INTO prior FROM appointment_system.receipt_recoveries WHERE operation_id=p_operation;
 IF FOUND THEN
  IF prior.request_id<>p_reference OR prior.actor<>actor OR prior.action<>p_action OR prior.reason<>p_reason OR prior.previous_revision<>p_revision OR prior.verified_payment_id IS DISTINCT FROM p_payment
  OR prior.new_email IS DISTINCT FROM p_email OR prior.new_phone IS DISTINCT FROM p_phone THEN RETURN jsonb_build_object('code','request_conflict');END IF;
  RETURN jsonb_build_object('code','contact_corrected','revision',prior.revision,'operation_id',p_operation,'reference',prior.request_id);
 END IF;
 IF p_action='contact_correction' THEN
  SELECT (specification#>>'{booking_verification,email}')::boolean INTO frozen_email_required
   FROM appointment_system.booking_policies WHERE version=b.policy_version;
  IF frozen_email_required IS NULL OR (frozen_email_required AND p_email IS NULL) THEN RETURN jsonb_build_object('code','invalid_change'); END IF;
 END IF;
 IF b.revision<>p_revision THEN RETURN jsonb_build_object('code','revision_changed');END IF;
 instant:=clock_timestamp();
 IF b.state='held' OR (b.payment_method='at_clinic' AND p_payment IS NOT NULL) OR (b.payment_method='online' AND (p_payment IS NULL OR NOT EXISTS(SELECT 1 FROM appointment_system.payment_observations o JOIN appointment_system.payment_orders p ON p.booking_id=o.booking_id
 WHERE o.booking_id=b.id AND o.payment_id=p_payment AND o.merchant_id=p.merchant_id AND o.mode=p.mode AND o.provider_order_id=p.provider_order_id
 AND o.currency=b.currency AND o.amount_paise>0 AND(o.captured OR o.refunded_paise>0)))) THEN RETURN jsonb_build_object('code','support_verification_unavailable');END IF;
 IF (SELECT count(*) FROM appointment_system.receipt_recoveries WHERE request_id=b.request_id AND created_at>instant-interval '1 hour')>=3 THEN RETURN jsonb_build_object('code','support_wait');END IF;
 IF p_action='contact_correction' AND(b.state<>'confirmed' OR b.starts_at<=instant OR (b.email IS NOT DISTINCT FROM p_email AND b.phone IS NOT DISTINCT FROM p_phone)) THEN RETURN jsonb_build_object('code','invalid_change');END IF;
 new_revision:=b.revision+CASE WHEN p_action='contact_correction' THEN 1 ELSE 0 END;
 UPDATE appointment_system.receipt_recoveries SET superseded_at=instant WHERE request_id=b.request_id AND superseded_at IS NULL;
 INSERT INTO appointment_system.receipt_recoveries(operation_id,request_id,action,actor,reason,verified_payment_id,previous_revision,revision,previous_email,previous_phone,new_email,new_phone,verification_method)
 VALUES(p_operation,b.request_id,p_action,actor,p_reason,p_payment,b.revision,new_revision,CASE WHEN p_action='contact_correction' THEN b.email END,CASE WHEN p_action='contact_correction' THEN b.phone END,p_email,p_phone,CASE WHEN b.payment_method='at_clinic' THEN 'staff_confirmed_clinic_booking' ELSE 'existing_phone_callback' END) RETURNING * INTO prior;
 -- Contact correction revokes the old receipt; lookup reads the corrected phone.
 -- No replacement receipt secret or customer code is issued.
 UPDATE appointment_system.bookings SET receipt_revoked_at=instant WHERE id=b.id;
 IF p_action='contact_correction' THEN
  old_snapshot:=appointment_system.booking_snapshot(b.id);
  UPDATE appointment_system.bookings SET email=p_email,phone=p_phone,revision=new_revision WHERE id=b.id;
  snapshot:=appointment_system.booking_snapshot(b.id);
  IF b.service_snapshot->>'meeting'='google_meet' THEN
  INSERT INTO appointment_system.delivery_jobs(id,booking_id,kind,recipient_role,booking_revision,payload)
  VALUES(gen_random_uuid(),b.id,'booking_cancelled','calendar',b.revision,old_snapshot) ON CONFLICT(kind,booking_id,recipient_role,booking_revision,event_key) DO NOTHING;
  END IF;
  INSERT INTO appointment_system.delivery_jobs(id,booking_id,kind,recipient_role,booking_revision,payload)
  SELECT gen_random_uuid(),b.id,kind,role,new_revision,snapshot FROM(VALUES('sheet_booking','client_sheet'),('sheet_booking','agency_sheet'),('booking_calendar','calendar'))jobs(kind,role) WHERE kind<>'booking_calendar' OR b.service_snapshot->>'meeting'='google_meet';
  INSERT INTO appointment_system.delivery_jobs(id,booking_id,kind,recipient_role,booking_revision,payload)
  SELECT gen_random_uuid(),b.id,'booking_ack',role,new_revision,jsonb_build_object('booking_id',b.id,'reference',b.request_id,'service',b.service_snapshot->>'name','starts_at',b.starts_at,'ends_at',b.ends_at,'amount_paise',b.amount_paise,'currency',b.currency,'change_kind','contact_corrected') FROM(VALUES('customer'),('client'))roles(role) WHERE role<>'customer' OR p_email IS NOT NULL;
 END IF;
 RETURN jsonb_build_object('code','contact_corrected','revision',new_revision,'operation_id',p_operation,'reference',b.request_id);
EXCEPTION WHEN unique_violation THEN RETURN jsonb_build_object('code','request_conflict');
END $_$;

CREATE OR REPLACE FUNCTION appointment_system.staff_actor(p_session text, p_client text, p_origin text, p_capability text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE s appointment_system.studio_sessions%ROWTYPE;principal text;
BEGIN
 IF p_capability IS NULL OR p_capability NOT IN ('booking','enquiry') THEN RETURN NULL; END IF;
 PERFORM pg_advisory_xact_lock_shared(83124,4);
 IF p_origin=(appointment_system.installation_value('origin')||'/company/booking-support') THEN
  principal:=appointment_system.control_obligation_actor(p_session,p_client,p_origin);
  IF principal IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('role','client','actor',principal);
 END IF;
 SELECT * INTO s FROM appointment_system.studio_sessions WHERE digest=p_session FOR SHARE;
 IF NOT FOUND OR s.client_id IS DISTINCT FROM p_client OR s.origin IS DISTINCT FROM p_origin
  OR s.revoked_at IS NOT NULL OR s.expires_at<=clock_timestamp()
  OR NOT EXISTS(SELECT 1 FROM appointment_system.studio_identities i WHERE i.role=s.role AND i.subject=s.subject) THEN RETURN NULL; END IF;
 IF s.role='agency' AND p_origin=appointment_system.installation_value('origin') AND appointment_system.current_business()->'version'='2'::jsonb THEN RETURN NULL; END IF;
 IF s.role<>'client' AND p_capability='enquiry' THEN RETURN NULL; END IF;
 IF s.role='client' AND p_capability='booking' THEN PERFORM appointment_system.control_admission(NULL); END IF;
 RETURN jsonb_build_object('role',s.role,'actor',s.role||':'||encode(sha256(convert_to(s.subject,'UTF8')),'hex'));
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

CREATE OR REPLACE FUNCTION appointment_system.configure_installation(p_manifest jsonb, p_business jsonb, p_enabled boolean) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $_$
DECLARE destination record; identifier uuid; old appointment_system.installation%ROWTYPE; digest text;
BEGIN
 IF p_enabled IS NULL OR NOT appointment_system.exact_keys(p_manifest-ARRAY['resource_notifications','schedule_management'],ARRAY[
  'version','installation_id','project_id','label','environment','origin','aliases','database_targets',
  'owners','sender','providers','worker','surfaces'])
  OR p_manifest->'version' IS DISTINCT FROM '1'::jsonb
  OR coalesce(p_manifest->>'project_id','') !~ '^[a-z0-9][a-z0-9-]{0,79}$'
  OR coalesce(p_manifest->>'environment','') NOT IN ('development','test','production')
  OR coalesce(p_manifest->>'origin','') !~ '^https?://[a-z0-9.-]+(:[0-9]+)?$'
  OR NOT appointment_system.validate_business(p_business)
 THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='invalid installation settings'; END IF;
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

CREATE OR REPLACE FUNCTION appointment_system.entry_studio_booking_lookup(p_session text, p_client text, p_origin text, p_reference uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE b appointment_system.bookings%ROWTYPE;result jsonb;
BEGIN
 IF appointment_system.studio_calendar_actor(p_session,p_client,p_origin) IS NULL OR appointment_system.studio_calendar_actor(p_session,p_client,p_origin) LIKE 'agency:%' THEN RETURN jsonb_build_object('code','access_unavailable');END IF;
 SELECT * INTO b FROM appointment_system.bookings WHERE request_id=p_reference;
 IF NOT FOUND THEN RETURN jsonb_build_object('code','booking_unavailable');END IF;
 SELECT jsonb_build_object('code','ok','reference',b.request_id,'revision',b.revision,'state',b.state,'name',b.full_name,'email',b.email,'phone',b.phone,'contact_email_required',(SELECT (specification#>>'{booking_verification,email}')::boolean FROM appointment_system.booking_policies WHERE version=b.policy_version),
 'service',b.service_snapshot->>'name','starts_at',b.starts_at,'ends_at',b.ends_at,'amount_paise',b.amount_paise,'currency',b.currency,
 'claim_id',(SELECT id FROM appointment_system.slot_claims WHERE booking_id=b.id),
 'unresolved_payments',(SELECT count(*) FROM appointment_system.payment_cases WHERE booking_id=b.id AND resolved_at IS NULL),
 'payments',coalesce((SELECT jsonb_agg(x ORDER BY x.observed_at DESC,x.id DESC) FROM (SELECT id,payment_id,status,amount_paise,refunded_paise,currency,captured,observed_at FROM appointment_system.payment_observations WHERE booking_id=b.id ORDER BY observed_at DESC,id DESC LIMIT 20)x),'[]'::jsonb)) INTO result;
 RETURN result||CASE WHEN b.service_snapshot->'facts_version'='2'::jsonb THEN jsonb_build_object(
  'facts_version',2,'resource_id',b.resource_id,'resource_name',b.service_snapshot->>'resource_name',
  'payment_method',b.payment_method,'amount_due_paise',CASE WHEN b.payment_method='at_clinic' AND b.state='confirmed' THEN b.amount_paise ELSE 0 END,
  'location',b.service_snapshot->'location','display_duration',b.service_snapshot->'display_duration') ELSE '{}'::jsonb END;
END $$;

CREATE OR REPLACE FUNCTION appointment_system.studio_time_context(p_session text,p_client text,p_origin text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog,appointment_system,pg_temp AS $$
DECLARE zone text;
BEGIN
 PERFORM appointment_system.require_registered_caller(ARRAY['staff','company']);
 IF appointment_system.studio_calendar_actor(p_session,p_client,p_origin) IS NULL THEN
  RETURN jsonb_build_object('code','access_unavailable');END IF;
 zone:=appointment_system.current_business()->>'timezone';
 RETURN jsonb_build_object('code','ok','timezone',zone,'today',(clock_timestamp() AT TIME ZONE zone)::date)||CASE WHEN appointment_system.current_business()->'version'='2'::jsonb THEN jsonb_build_object('policy_version',2,'resources',(SELECT jsonb_agg(jsonb_build_object('id',r->>'id','name',r->>'name') ORDER BY r->>'id') FROM jsonb_array_elements(appointment_system.current_business()->'resources') r)) ELSE '{}'::jsonb END;
END $$;

REVOKE ALL ON TABLE appointment_system.resource_closure_actions FROM PUBLIC;
GRANT SELECT ON TABLE appointment_system.resource_closure_actions TO appointment_system_backup_access;
REVOKE ALL ON FUNCTION appointment_system.studio_calendar_close_resource(text,text,text,uuid,text,timestamptz,timestamptz,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION appointment_system.studio_calendar_close_resource(text,text,text,uuid,text,timestamptz,timestamptz,text) TO appointment_system_staff_access,appointment_system_company_access;


DO $block$ DECLARE p regprocedure; BEGIN FOR p IN SELECT oid::regprocedure FROM pg_proc WHERE pronamespace='appointment_system'::regnamespace AND proname='protect_booking_resource' LOOP EXECUTE 'REVOKE ALL ON FUNCTION '||p||' FROM PUBLIC'; END LOOP;END $block$;

DO $block$ DECLARE p regprocedure; BEGIN FOR p IN SELECT oid::regprocedure FROM pg_proc WHERE pronamespace='appointment_system'::regnamespace AND proname='protect_claim_resource' LOOP EXECUTE 'REVOKE ALL ON FUNCTION '||p||' FROM PUBLIC'; END LOOP;END $block$;

DO $block$ DECLARE p regprocedure; BEGIN FOR p IN SELECT oid::regprocedure FROM pg_proc WHERE pronamespace='appointment_system'::regnamespace AND proname='validate_business_v1' LOOP EXECUTE 'REVOKE ALL ON FUNCTION '||p||' FROM PUBLIC'; END LOOP;END $block$;

DO $block$ DECLARE p regprocedure; BEGIN FOR p IN SELECT oid::regprocedure FROM pg_proc WHERE pronamespace='appointment_system'::regnamespace AND proname='resource_schedule_starts' LOOP EXECUTE 'REVOKE ALL ON FUNCTION '||p||' FROM PUBLIC'; END LOOP;END $block$;

DO $block$ DECLARE p regprocedure; BEGIN FOR p IN SELECT oid::regprocedure FROM pg_proc WHERE pronamespace='appointment_system'::regnamespace AND proname='route_resource_notification' LOOP EXECUTE 'REVOKE ALL ON FUNCTION '||p||' FROM PUBLIC'; END LOOP;END $block$;

DO $block$ DECLARE p regprocedure; BEGIN FOR p IN SELECT oid::regprocedure FROM pg_proc WHERE pronamespace='appointment_system'::regnamespace AND proname='copy_management_notification' LOOP EXECUTE 'REVOKE ALL ON FUNCTION '||p||' FROM PUBLIC'; END LOOP;END $block$;

RESET ROLE;
