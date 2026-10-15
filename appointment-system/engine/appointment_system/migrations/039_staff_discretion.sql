-- Clinic-specific staff discretion; historical migrations and financial facts stay intact.
SET LOCAL ROLE appointment_system_owner;
SELECT pg_advisory_xact_lock(83124,5);
SELECT pg_advisory_xact_lock(83124,4);
ALTER TABLE appointment_system.staff_appointment_actions
 ADD COLUMN change_policy_mode text NOT NULL DEFAULT 'legacy_notice' CHECK(change_policy_mode IN ('legacy_notice','staff_discretion')),
 ADD COLUMN change_policy_version text,
 ADD COLUMN before_state jsonb,
 ADD COLUMN after_state jsonb;
-- Historical rows deliberately retain NULL detail rather than invented history.
CREATE FUNCTION appointment_system.appointment_change_mode(spec jsonb) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
 SELECT CASE WHEN spec->'version'='2'::jsonb AND spec->>'appointment_changes'='staff_discretion' THEN 'staff_discretion' ELSE 'legacy_notice' END
$$;
REVOKE ALL ON FUNCTION appointment_system.appointment_change_mode(jsonb) FROM PUBLIC;
CREATE OR REPLACE FUNCTION appointment_system.validate_business(p_spec jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,appointment_system,pg_temp AS $$
DECLARE r jsonb; w jsonb; e jsonb; service jsonb; projected jsonb; resources text[]:=ARRAY[]::text[]; prior jsonb;
 opening integer; closing integer; grace integer; extra integer;
BEGIN
 IF p_spec->'version'='1'::jsonb THEN RETURN appointment_system.validate_business_v1(p_spec); END IF;
 IF p_spec->'version' IS DISTINCT FROM '2'::jsonb OR octet_length(p_spec::text)>131072
 OR NOT appointment_system.exact_keys(p_spec-'appointment_changes',ARRAY['version','timezone','services','resources','slot_step_minutes','notice_minutes','horizon_days','buffer_before_minutes','buffer_after_minutes','booking_verification','required_contacts','meeting','email_budget','payment_methods','location','display_duration'])
 OR (p_spec ? 'appointment_changes' AND (jsonb_typeof(p_spec->'appointment_changes') IS DISTINCT FROM 'string' OR p_spec->>'appointment_changes' NOT IN ('legacy_notice','staff_discretion')))
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
 projected:=(p_spec-ARRAY['resources','payment_methods','location','display_duration','appointment_changes'])||jsonb_build_object('version',1,'meeting','internal',
  'weekly_windows',jsonb_build_array(jsonb_build_object('weekday',0,'start','00:00','end','24:00')),
  'services',(SELECT jsonb_agg(value-'resource_id') FROM jsonb_array_elements(p_spec->'services')));
 RETURN appointment_system.validate_business_v1(projected);
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow THEN RETURN false;
END $$;

CREATE OR REPLACE FUNCTION appointment_system.entry_studio_appointment_reschedule(p_session text, p_client text, p_origin text, p_operation uuid, p_claim uuid, p_revision integer, p_reason text, p_start timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE policy_mode text; policy_version text; prior_state jsonb; result_state jsonb; actor text;old appointment_system.staff_appointment_actions%ROWTYPE;b appointment_system.bookings%ROWTYPE;
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
 SELECT p.specification,s.policy_version INTO spec,policy_version FROM appointment_system.intake_settings s JOIN appointment_system.booking_policies p ON p.version=s.policy_version WHERE s.singleton FOR SHARE OF s;
 IF NOT FOUND THEN RETURN jsonb_build_object('code','time_unavailable'); END IF;
 policy_mode:=appointment_system.appointment_change_mode(spec);
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
 IF appointment_system.studio_calendar_actor(p_session,p_client,p_origin) IS NULL THEN RETURN jsonb_build_object('code','access_unavailable'); END IF;
 instant:=clock_timestamp();
 IF b.revision<>p_revision THEN RETURN jsonb_build_object('code','revision_changed');END IF;
 IF b.state<>'confirmed' OR (policy_mode='legacy_notice' AND b.starts_at<=instant) OR NOT EXISTS(SELECT 1 FROM appointment_system.slot_claims WHERE id=p_claim AND released_at IS NULL)
 THEN RETURN jsonb_build_object('code','appointment_unavailable');END IF;
 IF policy_mode='staff_discretion' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(spec->'resources') r WHERE r->>'id'=b.resource_id) THEN RETURN jsonb_build_object('code','resource_unavailable'); END IF;
 IF p_start=b.starts_at THEN RETURN jsonb_build_object('code','invalid_change');END IF;
 late:=policy_mode='legacy_notice' AND b.starts_at<instant+interval '12 hours';
 IF late AND (b.preparation->'_legacy_late_reschedule_used'='true'::jsonb OR EXISTS(SELECT 1 FROM appointment_system.staff_appointment_actions WHERE booking_id=b.id AND late_exception))
 THEN RETURN jsonb_build_object('code','late_reschedule_used');END IF;
 IF late AND b.original_starts_at IS NULL AND b.reschedule_deadline_at IS NULL
 THEN RETURN jsonb_build_object('code','original_time_review_required');END IF;
 deadline:=CASE WHEN policy_mode='legacy_notice' THEN coalesce(b.reschedule_deadline_at,CASE WHEN late THEN b.original_starts_at+interval '14 days' END) END;
 SELECT * INTO offer FROM appointment_system.resource_schedule_starts(spec,b.resource_id,
  (extract(epoch FROM b.ends_at-b.starts_at)/60)::integer,
  (p_start AT TIME ZONE (spec->>'timezone'))::date,instant,deadline) s WHERE s.starts_at=p_start;
 IF NOT FOUND THEN RETURN jsonb_build_object('code','time_unavailable'); END IF;
 policy_mode:=appointment_system.appointment_change_mode(spec);
 new_end:=offer.ends_at;
 IF EXISTS(SELECT 1 FROM appointment_system.slot_claims WHERE id<>p_claim AND released_at IS NULL AND resource_id=b.resource_id
  AND tstzrange(starts_at,ends_at,'[)')&&tstzrange(offer.occupied_start,offer.occupied_end,'[)'))
 THEN RETURN jsonb_build_object('code','time_already_reserved'); END IF;
 prior_state:=jsonb_build_object('state',b.state,'starts_at',b.starts_at,'ends_at',b.ends_at,'revision',b.revision);
 old_snapshot:=appointment_system.booking_snapshot(b.id);
 snapshot:=old_snapshot||jsonb_build_object('revision',b.revision+1,'starts_at',p_start,'ends_at',new_end);
 BEGIN
  UPDATE appointment_system.slot_claims SET starts_at=offer.occupied_start,ends_at=offer.occupied_end WHERE id=p_claim;
  UPDATE appointment_system.bookings SET starts_at=p_start,ends_at=new_end,revision=revision+1,
  hold_expires_at=CASE WHEN payment_method='online' THEN least(hold_expires_at,p_start) END,receipt_expires_at=greatest(receipt_expires_at,new_end+interval '24 hours'),reschedule_deadline_at=CASE WHEN policy_mode='staff_discretion' THEN b.reschedule_deadline_at ELSE deadline END WHERE id=b.id;
  INSERT INTO appointment_system.staff_appointment_actions(operation_id,claim_id,booking_id,action,actor,reason,previous_revision,revision,starts_at,notice_seconds,policy_guidance,new_starts_at,new_ends_at,late_exception,change_policy_mode,change_policy_version,before_state,after_state)
  VALUES(p_operation,p_claim,b.id,'reschedule',actor,p_reason,b.revision,b.revision+1,b.starts_at,floor(extract(epoch FROM b.starts_at-instant))::bigint,
  CASE WHEN policy_mode='staff_discretion' THEN CASE WHEN b.payment_method='at_clinic' THEN 'no_payment_received' ELSE 'staff_decision' END WHEN late THEN 'late_reschedule_review' ELSE 'free_reschedule' END,p_start,new_end,late,policy_mode,policy_version,prior_state,jsonb_build_object('state','confirmed','starts_at',p_start,'ends_at',new_end,'revision',b.revision+1));
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
DECLARE policy_mode text; policy_version text; prior_state jsonb; result_state jsonb; actor text;old appointment_system.staff_appointment_actions%ROWTYPE;b appointment_system.bookings%ROWTYPE;
 booking uuid;context uuid;instant timestamptz;guidance text;spec jsonb;snapshot jsonb;old_snapshot jsonb;
BEGIN
 actor:=appointment_system.studio_calendar_actor(p_session,p_client,p_origin);
 IF actor IS NULL THEN RETURN jsonb_build_object('code','access_unavailable'); END IF;
 IF p_operation IS NULL OR p_claim IS NULL OR p_revision IS NULL OR p_revision<1 OR p_revision>=2147483647
 OR coalesce(length(btrim(p_reason)),0) NOT BETWEEN 2 AND 500 OR p_reason ~ '[[:cntrl:]]' THEN RETURN jsonb_build_object('code','invalid_change'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('staff-appointment-operation:'||p_operation::text,0));
 SELECT s.booking_id,bk.context_id INTO booking,context FROM appointment_system.slot_claims s JOIN appointment_system.bookings bk ON bk.id=s.booking_id WHERE s.id=p_claim;
 IF NOT FOUND THEN RETURN jsonb_build_object('code','appointment_unavailable'); END IF;
 SELECT p.specification,s.policy_version INTO spec,policy_version FROM appointment_system.intake_settings s JOIN appointment_system.booking_policies p ON p.version=s.policy_version WHERE s.singleton FOR SHARE OF s;
 IF NOT FOUND THEN RETURN jsonb_build_object('code','appointment_unavailable'); END IF;
 policy_mode:=appointment_system.appointment_change_mode(spec);
 PERFORM 1 FROM appointment_system.checkout_contexts WHERE id=context FOR UPDATE;
 IF appointment_system.studio_calendar_actor(p_session,p_client,p_origin) IS NULL THEN RETURN jsonb_build_object('code','access_unavailable'); END IF;
 SELECT * INTO old FROM appointment_system.staff_appointment_actions WHERE operation_id=p_operation;
 IF FOUND THEN
  IF old.action<>'cancel' OR old.actor IS DISTINCT FROM actor OR old.claim_id IS DISTINCT FROM p_claim OR old.previous_revision IS DISTINCT FROM p_revision OR old.reason IS DISTINCT FROM p_reason THEN RETURN jsonb_build_object('code','request_conflict'); END IF;
  RETURN jsonb_build_object('code','cancelled','revision',old.revision,'policy_guidance',old.policy_guidance);
 END IF;
 SELECT * INTO b FROM appointment_system.bookings WHERE id=booking FOR UPDATE;
 IF appointment_system.studio_calendar_actor(p_session,p_client,p_origin) IS NULL THEN RETURN jsonb_build_object('code','access_unavailable'); END IF;
 instant:=clock_timestamp();
 IF b.revision<>p_revision THEN RETURN jsonb_build_object('code','revision_changed'); END IF;
 IF b.state<>'confirmed' OR (policy_mode='legacy_notice' AND b.starts_at<=instant) OR NOT EXISTS(SELECT 1 FROM appointment_system.slot_claims WHERE id=p_claim AND released_at IS NULL) THEN RETURN jsonb_build_object('code','appointment_unavailable'); END IF;
 guidance:=CASE WHEN b.payment_method='at_clinic' THEN 'no_payment_received' WHEN policy_mode='staff_discretion' THEN 'staff_decision' WHEN EXISTS(SELECT 1 FROM appointment_system.staff_appointment_actions WHERE booking_id=b.id AND action='reschedule') THEN 'staff_review' WHEN b.starts_at>=instant+interval '24 hours' THEN 'full_refund_review' WHEN b.starts_at>=instant+interval '12 hours' THEN 'staff_review' ELSE 'late_reschedule_review' END;
 prior_state:=jsonb_build_object('state',b.state,'starts_at',b.starts_at,'ends_at',b.ends_at,'revision',b.revision);
 old_snapshot:=appointment_system.booking_snapshot(b.id);
 snapshot:=old_snapshot||jsonb_build_object('revision',b.revision+1,'state','cancelled','cancelled_at',instant)||CASE WHEN b.service_snapshot->'facts_version'='2'::jsonb THEN jsonb_build_object('amount_due_paise',0) ELSE '{}'::jsonb END;
 INSERT INTO appointment_system.staff_appointment_actions(operation_id,claim_id,booking_id,action,actor,reason,previous_revision,revision,starts_at,notice_seconds,policy_guidance,change_policy_mode,change_policy_version,before_state,after_state)
 VALUES(p_operation,p_claim,b.id,'cancel',actor,p_reason,b.revision,b.revision+1,b.starts_at,floor(extract(epoch FROM b.starts_at-instant))::bigint,guidance,policy_mode,policy_version,prior_state,jsonb_build_object('state','cancelled','starts_at',b.starts_at,'ends_at',b.ends_at,'revision',b.revision+1));
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

CREATE OR REPLACE FUNCTION appointment_system.entry_studio_appointment_detail(p_session text, p_client text, p_origin text, p_claim uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $$
DECLARE b appointment_system.bookings%ROWTYPE; spec jsonb; mode text; active boolean;
BEGIN
 IF appointment_system.studio_calendar_actor(p_session,p_client,p_origin) IS NULL THEN RETURN jsonb_build_object('code','access_unavailable'); END IF;
 SELECT booking.* INTO b FROM appointment_system.bookings booking JOIN appointment_system.slot_claims s ON s.booking_id=booking.id WHERE s.id=p_claim;
 IF NOT FOUND THEN RETURN jsonb_build_object('code','appointment_unavailable'); END IF;
 spec:=appointment_system.current_business();mode:=appointment_system.appointment_change_mode(spec);
 active:=b.state='confirmed' AND (mode='staff_discretion' OR b.starts_at>clock_timestamp()) AND EXISTS(SELECT 1 FROM appointment_system.slot_claims WHERE id=p_claim AND released_at IS NULL);
 RETURN jsonb_build_object('appointment_changes',mode,'code','ok','claim_id',p_claim,'revision',b.revision,'state',b.state,'name',b.full_name,
 'service',b.service_snapshot->>'name','reference',b.request_id,'starts_at',b.starts_at,'ends_at',b.ends_at,
 'can_cancel',active,
 'can_reschedule',active AND (mode='legacy_notice' OR EXISTS(SELECT 1 FROM jsonb_array_elements(spec->'resources') r WHERE r->>'id'=b.resource_id)),
 'policy_guidance',CASE WHEN b.payment_method='at_clinic' THEN 'no_payment_received' WHEN mode='staff_discretion' THEN 'staff_decision' WHEN EXISTS(SELECT 1 FROM appointment_system.staff_appointment_actions WHERE booking_id=b.id AND action='reschedule') THEN 'staff_review' WHEN b.starts_at>=clock_timestamp()+interval '24 hours' THEN 'full_refund_review'
 WHEN b.starts_at>=clock_timestamp()+interval '12 hours' THEN 'staff_review' ELSE 'late_reschedule_review' END)||CASE WHEN b.service_snapshot->'facts_version'='2'::jsonb THEN jsonb_build_object('resource_id',b.resource_id,'resource_name',b.service_snapshot->>'resource_name','payment_method',b.payment_method) ELSE '{}'::jsonb END;
END $$;
CREATE OR REPLACE FUNCTION appointment_system.entry_api_payment_intake() RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,appointment_system,pg_temp AS $$
 SELECT jsonb_build_object('merchant_id',merchant_id,'mode',payment_mode,'credential_version',credential_version,'public_open',public_open)
 FROM appointment_system.intake_settings WHERE singleton
$$;
CREATE OR REPLACE FUNCTION appointment_system.configure_installation(p_manifest jsonb, p_business jsonb, p_enabled boolean) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'appointment_system', 'pg_temp'
    AS $_$
DECLARE contact jsonb; labels text[]:=ARRAY[]::text[]; destination record; identifier uuid; old appointment_system.installation%ROWTYPE; digest text;
BEGIN
 IF p_enabled IS NULL OR NOT appointment_system.exact_keys(p_manifest-ARRAY['resource_notifications','schedule_management','public_contacts'],ARRAY[
  'version','installation_id','project_id','label','environment','origin','aliases','database_targets',
  'owners','sender','providers','worker','surfaces'])
  OR p_manifest->'version' IS DISTINCT FROM '1'::jsonb
  OR coalesce(p_manifest->>'project_id','') !~ '^[a-z0-9][a-z0-9-]{0,79}$'
  OR coalesce(p_manifest->>'environment','') NOT IN ('development','test','production')
  OR coalesce(p_manifest->>'origin','') !~ '^https?://[a-z0-9.-]+(:[0-9]+)?$'
  OR NOT appointment_system.validate_business(p_business)
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

RESET ROLE;
