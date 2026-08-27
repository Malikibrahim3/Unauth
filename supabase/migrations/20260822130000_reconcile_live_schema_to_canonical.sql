-- Reconcile the linked production project whose pre-consolidation migration
-- ledger skipped part of the canonical release sequence. Canonical replays
-- already contain these objects, so the patch is deliberately a no-op there.
DO $canonical_reconcile$
BEGIN
  IF to_regclass('public.account_deletion_audit_receipts') IS NULL
     OR to_regclass('public.case_investigation_dispatches') IS NULL
     OR to_regclass('public.case_investigation_attachments') IS NULL
     OR to_regclass('public.data_subject_erasure_receipts') IS NULL
     OR to_regclass('public.privacy_storage_cleanup_jobs') IS NULL
     OR to_regproc('public.audit_safe_uuid') IS NULL THEN
    EXECUTE $canonical_schema_patch$
SET check_function_bodies = false;
COMMENT ON SCHEMA public IS NULL;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON ROUTINES FROM authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON ROUTINES FROM postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON ROUTINES FROM service_role;
DROP FUNCTION public.claim_processed_webhook(p_key text, p_provider text, p_store_key text, p_topic text);
COMMENT ON FUNCTION public.get_automation_analytics(uuid,uuid,text,timestamp with time zone,timestamp with time zone,text,text,text,timestamp with time zone) IS NULL;
COMMENT ON FUNCTION public.get_evidence_analytics(uuid,uuid,text,timestamp with time zone,timestamp with time zone,text,text,text,timestamp with time zone) IS NULL;
COMMENT ON FUNCTION public.get_financial_analytics_records(uuid,uuid,timestamp with time zone,timestamp with time zone,text,text,text,timestamp with time zone,integer,integer) IS NULL;
COMMENT ON FUNCTION public.get_financial_analytics(uuid,uuid,text,timestamp with time zone,timestamp with time zone,text,text,text,timestamp with time zone) IS NULL;
COMMENT ON FUNCTION public.get_recovery_analytics(uuid,uuid,text,timestamp with time zone,timestamp with time zone,text,text,text,timestamp with time zone) IS NULL;
COMMENT ON FUNCTION public.get_source_health_analytics(uuid,uuid,text,timestamp with time zone,timestamp with time zone,text,text,text,timestamp with time zone) IS NULL;
COMMENT ON FUNCTION public.get_work_analytics(uuid,uuid,text,timestamp with time zone,timestamp with time zone,text,text,text,timestamp with time zone) IS NULL;
COMMENT ON TABLE public.case_clarification_requests IS NULL;
ALTER TABLE public.case_clarification_requests DROP CONSTRAINT case_clarification_requests_support_payout_case_id_fkey;
COMMENT ON TABLE public.case_prevention_observations IS NULL;
COMMENT ON TABLE public.case_recommendation_snapshots IS NULL;
COMMENT ON COLUMN public.claim_outcomes.followed_recommendation IS NULL;
COMMENT ON TABLE public.default_rule_templates IS NULL;
COMMENT ON COLUMN public.evidence_items.fact_kind IS NULL;
COMMENT ON COLUMN public.helpdesk_connections.webhook_secret_created_at IS NULL;
COMMENT ON TABLE public.identity_catch_events IS NULL;
COMMENT ON COLUMN public.identity_catch_events.submitted_identifier_display IS NULL;
COMMENT ON COLUMN public.identity_catch_events.estimated_exposure_amount IS NULL;
COMMENT ON COLUMN public.integration_credentials.connection_id IS NULL;
COMMENT ON TABLE public.merchant_rules IS NULL;
ALTER TABLE public.merchant_widget_tokens DROP CONSTRAINT merchant_widget_tokens_api_key_id_fkey;
COMMENT ON COLUMN public.network_access_log.k_anonymity_satisfied IS NULL;
COMMENT ON TABLE public.oauth_connection_transactions IS NULL;
ALTER TABLE public.partner_recovery_rules DROP CONSTRAINT partner_recovery_rules_partner_id_fkey;
COMMENT ON COLUMN public.recovery_cases.provider_claim_stage IS NULL;
COMMENT ON COLUMN public.recovery_cases.last_source_event_at IS NULL;
COMMENT ON COLUMN public.recovery_cases.provider_position IS NULL;
COMMENT ON COLUMN public.recovery_cases.amount_approved_minor IS NULL;
COMMENT ON TABLE public.recovery_claim_packs IS NULL;
COMMENT ON TABLE public.recovery_claim_submissions IS NULL;
COMMENT ON TABLE public.recovery_provider_responses IS NULL;
COMMENT ON TABLE public.rule_evaluations IS NULL;
COMMENT ON TABLE public.support_payout_cases IS NULL;
COMMENT ON COLUMN public.support_payout_cases.recommended_payout_action IS NULL;
COMMENT ON COLUMN public.support_payout_cases.payout_decision_state IS NULL;
COMMENT ON COLUMN public.support_payout_cases.recovery_state IS NULL;
COMMENT ON COLUMN public.support_payout_cases.next_action IS NULL;
COMMENT ON COLUMN public.support_payout_cases.responsibility_confirmation_state IS NULL;
COMMENT ON COLUMN public.support_payout_cases.responsibility_event_id IS NULL;
COMMENT ON COLUMN public.support_provider_connections.webhook_secret_hash IS NULL;
COMMENT ON INDEX public.merchant_integrations_one_active_provider_key IS NULL;
DROP INDEX public.idx_case_clarification_requests_case;
COMMENT ON VIEW public.reporting_case_dimensions IS NULL;
DROP POLICY case_clarification_requests_member_insert ON public.case_clarification_requests;
DROP POLICY case_clarification_requests_member_select ON public.case_clarification_requests;
DROP POLICY case_clarification_requests_member_update ON public.case_clarification_requests;
DROP POLICY case_decisions_member_all ON public.case_decisions;
DROP POLICY case_outcomes_member_all ON public.case_outcomes;
DROP POLICY evidence_links_member_all ON public.evidence_links;
DROP POLICY evidence_packages_member_all ON public.evidence_packages;
DROP POLICY identity_notes_member_all ON public.identity_notes;
DROP POLICY loss_attribution_candidates_member_all ON public.loss_attribution_candidates;
DROP POLICY mis_member_all ON public.merchant_identity_state;
DROP POLICY "merchant manage own rules" ON public.merchant_rules;
DROP POLICY partner_recovery_rules_member_all ON public.partner_recovery_rules;
DROP POLICY partners_member_all ON public.partners;
DROP POLICY recovery_cases_member_all ON public.recovery_cases;
DROP POLICY support_payout_cases_member_update ON public.support_payout_cases;
DROP POLICY work_tasks_member_all ON public.work_tasks;
REVOKE USAGE ON SCHEMA public FROM anon;
REVOKE USAGE ON SCHEMA public FROM authenticated;
REVOKE USAGE ON SCHEMA public FROM service_role;
REVOKE ALL ON SEQUENCE public.evidence_package_daily_seq FROM anon;
REVOKE ALL ON SEQUENCE public.evidence_package_daily_seq FROM authenticated;
REVOKE ALL ON SEQUENCE public.evidence_package_daily_seq FROM service_role;
REVOKE ALL ON SEQUENCE public.migration_orphans_id_seq FROM anon;
REVOKE ALL ON SEQUENCE public.migration_orphans_id_seq FROM authenticated;
REVOKE ALL ON SEQUENCE public.migration_orphans_id_seq FROM service_role;
REVOKE ALL ON FUNCTION public._distinctive_analytics_assert_scope(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM anon;
REVOKE ALL ON FUNCTION public._distinctive_analytics_assert_scope(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM authenticated;
REVOKE ALL ON FUNCTION public._distinctive_analytics_assert_scope(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM service_role;
REVOKE ALL ON FUNCTION public._distinctive_analytics_envelope(jsonb, timestamp with time zone, timestamp with time zone, text, jsonb, bigint, text[]) FROM anon;
REVOKE ALL ON FUNCTION public._distinctive_analytics_envelope(jsonb, timestamp with time zone, timestamp with time zone, text, jsonb, bigint, text[]) FROM authenticated;
REVOKE ALL ON FUNCTION public._distinctive_analytics_envelope(jsonb, timestamp with time zone, timestamp with time zone, text, jsonb, bigint, text[]) FROM service_role;
REVOKE ALL ON FUNCTION public.add_merchant_topup_credits(uuid, integer, numeric, text) FROM anon;
REVOKE ALL ON FUNCTION public.add_merchant_topup_credits(uuid, integer, numeric, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.add_merchant_topup_credits(uuid, integer, numeric, text) FROM service_role;
REVOKE ALL ON FUNCTION public.all_processing_job_chunks_complete(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.all_processing_job_chunks_complete(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.all_processing_job_chunks_complete(uuid) FROM service_role;
REVOKE ALL ON FUNCTION public.archive_merchant_rule(uuid, uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.archive_merchant_rule(uuid, uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.archive_merchant_rule(uuid, uuid, uuid) FROM service_role;
REVOKE ALL ON FUNCTION public.audit_claim_status_change() FROM anon;
REVOKE ALL ON FUNCTION public.audit_claim_status_change() FROM authenticated;
REVOKE ALL ON FUNCTION public.audit_claim_status_change() FROM service_role;
CREATE FUNCTION public.audit_safe_uuid(p_value text)
 RETURNS uuid
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
begin
  if p_value is null or p_value = '' then return null; end if;
  return p_value::uuid;
exception when invalid_text_representation then
  return null;
end;
$function$;
REVOKE ALL ON FUNCTION public.begin_processing_job_chunk(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.begin_processing_job_chunk(uuid, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.begin_processing_job_chunk(uuid, integer) FROM service_role;
REVOKE ALL ON FUNCTION public.bulk_transition_work_tasks(uuid, uuid, uuid[], text, timestamp with time zone) FROM anon;
REVOKE ALL ON FUNCTION public.bulk_transition_work_tasks(uuid, uuid, uuid[], text, timestamp with time zone) FROM authenticated;
REVOKE ALL ON FUNCTION public.bulk_transition_work_tasks(uuid, uuid, uuid[], text, timestamp with time zone) FROM service_role;
CREATE FUNCTION public.bump_case_exception_state_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.state_version := greatest(coalesce(old.state_version, 0) + 1, 1);
  return new;
end;
$function$;
CREATE FUNCTION public.capture_sensitive_audit_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_new jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  v_old jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_row jsonb := case when tg_op = 'DELETE' then v_old else v_new end;
  v_merchant_id uuid;
  v_resource_id text;
  v_aggregate_id uuid;
  v_resource_type text;
  v_action text;
  v_actor_id uuid;
  v_actor_type text;
  v_actor_role text;
  v_effective_at timestamptz;
  v_recorded_at timestamptz := clock_timestamp();
  v_correlation_id uuid;
  v_idempotency_reference text;
  v_meaning text;
  v_details jsonb := '{}'::jsonb;
  v_changed_fields jsonb := '[]'::jsonb;
  v_request_headers jsonb := coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb,
    '{}'::jsonb
  );
  v_request_ip text;
begin
  -- A lawful merchant erasure has its own non-FK receipt. Do not recreate
  -- merchant-scoped events while the flag-gated purge RPC removes history.
  if coalesce(current_setting('app.allow_domain_event_purge', true), '') = 'on' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  v_merchant_id := public.audit_safe_uuid(v_row ->> 'merchant_id');
  if v_merchant_id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  -- Avoid noisy audit events for routine API-key usage stamps. Creation and
  -- revocation remain sensitive and are captured below.
  if tg_table_name = 'merchant_api_keys' and tg_op = 'UPDATE'
     and (v_old ->> 'revoked_at') is not distinct from (v_new ->> 'revoked_at') then
    return new;
  end if;

  v_resource_id := coalesce(
    v_row ->> 'support_payout_case_id',
    v_row ->> 'claim_id',
    v_row ->> 'recovery_case_id',
    v_row ->> 'loss_case_id',
    v_row ->> 'merchant_rule_id',
    v_row ->> 'id'
  );
  v_aggregate_id := public.audit_safe_uuid(v_resource_id);

  v_actor_id := public.audit_safe_uuid(coalesce(
    v_row ->> 'audit_actor_id',
    v_row ->> 'actor_user_id',
    v_row ->> 'resolved_by',
    v_row ->> 'published_by',
    v_row ->> 'updated_by',
    v_row ->> 'created_by',
    v_row ->> 'invited_by',
    v_row ->> 'granted_by',
    v_row ->> 'grantor_user_id',
    v_row #>> '{metadata,actor_user_id}',
    v_row #>> '{metadata,actor_id}',
    v_request_headers ->> 'x-unauth-audit-actor-id',
    auth.uid()::text
  ));
  v_actor_type := coalesce(nullif(v_row ->> 'actor_type', ''),
    case when v_actor_id is null then 'system' else 'user' end);
  v_actor_role := coalesce(nullif(v_row ->> 'audit_actor_role', ''),
    nullif(v_row #>> '{metadata,actor_role}', ''),
    nullif(v_request_headers ->> 'x-unauth-audit-actor-role', ''),
    case when v_actor_id is null then 'system' else 'unknown' end);
  v_correlation_id := public.audit_safe_uuid(coalesce(
    v_row ->> 'audit_correlation_id',
    v_row ->> 'correlation_id',
    v_row #>> '{metadata,correlation_id}',
    v_request_headers ->> 'x-unauth-audit-correlation-id'
  ));
  if v_correlation_id is null then v_correlation_id := gen_random_uuid(); end if;
  v_request_ip := nullif(v_request_headers ->> 'x-unauth-audit-request-ip', '');

  begin
    v_effective_at := coalesce(
      nullif(v_row ->> 'effective_at', '')::timestamptz,
      nullif(v_row ->> 'resolved_at', '')::timestamptz,
      nullif(v_row ->> 'published_at', '')::timestamptz,
      nullif(v_row ->> 'created_at', '')::timestamptz,
      v_recorded_at
    );
  exception when invalid_datetime_format then
    v_effective_at := v_recorded_at;
  end;

  if tg_op = 'UPDATE' then
    select coalesce(jsonb_agg(key order by key), '[]'::jsonb)
      into v_changed_fields
      from jsonb_object_keys(v_new) key
     where (v_old -> key) is distinct from (v_new -> key);
  end if;

  case tg_table_name
    when 'support_payout_cases' then
      v_resource_type := 'claim';
      if tg_op = 'INSERT' then v_action := 'claim_created';
      elsif (v_old ->> 'payout_decision_state') is distinct from (v_new ->> 'payout_decision_state') then
        v_action := case when v_new ->> 'payout_decision_state' = 'reversed'
          then 'payout_decision_reversed' else 'payout_decision_recorded' end;
      elsif (v_old ->> 'assigned_to') is distinct from (v_new ->> 'assigned_to') then
        v_action := 'claim_assignment_changed';
      else v_action := 'claim_state_changed'; end if;
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'previous_status', v_old ->> 'status', 'new_status', v_new ->> 'status',
        'previous_decision_state', v_old ->> 'payout_decision_state',
        'new_decision_state', v_new ->> 'payout_decision_state',
        'state_version', v_new ->> 'state_version'));
    when 'case_decisions' then
      v_resource_type := 'claim';
      v_action := case when v_row ->> 'reverses_decision_id' is null
        then 'payout_decision_recorded' else 'payout_decision_reversed' end;
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'decision', v_row ->> 'decision', 'action', v_row ->> 'action',
        'amount_minor', v_row ->> 'amount_minor', 'currency', v_row ->> 'currency',
        'reverses_decision_id', v_row ->> 'reverses_decision_id'));
    when 'case_outcomes' then
      v_resource_type := 'claim';
      v_action := case when v_row ->> 'reverses_outcome_id' is null
        then 'payout_outcome_recorded' else 'payout_outcome_reversed' end;
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'outcome_type', v_row ->> 'outcome_type', 'amount_minor', v_row ->> 'amount_minor',
        'currency', v_row ->> 'currency'));
    when 'case_financial_entries' then
      v_resource_type := 'financial_entry';
      v_resource_id := v_row ->> 'id';
      v_aggregate_id := public.audit_safe_uuid(v_resource_id);
      v_action := case when v_row ->> 'reverses_entry_id' is null
        then 'financial_entry_recorded' else 'financial_entry_reversed' end;
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'support_payout_case_id', v_row ->> 'support_payout_case_id',
        'state', v_row ->> 'state', 'amount_minor', v_row ->> 'amount_minor',
        'currency', v_row ->> 'currency', 'direction', v_row ->> 'direction',
        'reverses_entry_id', v_row ->> 'reverses_entry_id'));
    when 'loss_cases' then
      v_resource_type := 'loss_case';
      v_resource_id := v_row ->> 'id'; v_aggregate_id := public.audit_safe_uuid(v_resource_id);
      if tg_op = 'INSERT' then v_action := 'loss_created';
      elsif (v_old ->> 'attribution') is distinct from (v_new ->> 'attribution')
         or (v_old ->> 'counterparty_type') is distinct from (v_new ->> 'counterparty_type')
        then v_action := 'loss_attribution_corrected';
      elsif (v_old ->> 'financial_state') is distinct from (v_new ->> 'financial_state')
        then v_action := 'loss_financial_state_changed';
      else v_action := 'loss_updated'; end if;
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'support_payout_case_id', v_row ->> 'support_payout_case_id',
        'previous_attribution', v_old ->> 'attribution', 'new_attribution', v_new ->> 'attribution',
        'previous_financial_state', v_old ->> 'financial_state', 'new_financial_state', v_new ->> 'financial_state'));
    when 'loss_attribution_candidates' then
      v_resource_type := 'loss_attribution';
      v_resource_id := v_row ->> 'loss_case_id'; v_aggregate_id := public.audit_safe_uuid(v_resource_id);
      v_action := case when tg_op = 'INSERT' then 'loss_attribution_recorded'
        when tg_op = 'DELETE' then 'loss_attribution_removed'
        else 'loss_attribution_corrected' end;
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'candidate_id', v_row ->> 'id',
        'previous_attribution', v_old ->> 'attribution', 'new_attribution', v_new ->> 'attribution',
        'previous_confidence', v_old ->> 'confidence', 'new_confidence', v_new ->> 'confidence',
        'previous_is_primary', v_old ->> 'is_primary', 'new_is_primary', v_new ->> 'is_primary',
        'accountable_party_type', v_row ->> 'accountable_party_type'));
    when 'recovery_cases' then
      v_resource_type := 'recovery_case';
      v_resource_id := v_row ->> 'id'; v_aggregate_id := public.audit_safe_uuid(v_resource_id);
      if tg_op = 'INSERT' then v_action := 'recovery_created';
      elsif (v_old ->> 'amount_recovered') is distinct from (v_new ->> 'amount_recovered')
        then v_action := 'recovery_amount_corrected';
      elsif (v_old ->> 'status') is distinct from (v_new ->> 'status')
        then v_action := 'recovery_status_changed';
      else v_action := 'recovery_updated'; end if;
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'support_payout_case_id', v_row ->> 'support_payout_case_id',
        'previous_status', v_old ->> 'status', 'new_status', v_new ->> 'status',
        'previous_amount_recovered', v_old ->> 'amount_recovered',
        'new_amount_recovered', v_new ->> 'amount_recovered', 'currency', v_row ->> 'currency'));
    when 'record_match_resolutions' then
      v_resource_type := coalesce(v_row ->> 'subject_entity_type', 'identity');
      v_resource_id := v_row ->> 'subject_entity_id'; v_aggregate_id := public.audit_safe_uuid(v_resource_id);
      v_action := 'identity_link_resolved';
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'selected_candidate_id', v_row ->> 'selected_candidate_id',
        'prior_status', v_row ->> 'prior_status', 'new_status', v_row ->> 'new_status',
        'reason', v_row ->> 'reason'));
    when 'merchant_rule_versions' then
      v_resource_type := 'rule_version';
      v_resource_id := v_row ->> 'id'; v_aggregate_id := public.audit_safe_uuid(v_resource_id);
      v_action := case v_row ->> 'status'
        when 'published' then 'rule_version_published'
        when 'retired' then 'rule_version_retired'
        else 'rule_version_created' end;
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'merchant_rule_id', v_row ->> 'merchant_rule_id', 'version', v_row ->> 'version',
        'status', v_row ->> 'status', 'name', v_row ->> 'name'));
    when 'workflow_definitions' then
      v_resource_type := 'workflow_version';
      v_resource_id := v_row ->> 'id'; v_aggregate_id := public.audit_safe_uuid(v_resource_id);
      v_action := case v_row ->> 'status'
        when 'published' then 'workflow_version_published'
        when 'retired' then 'workflow_version_retired'
        else 'workflow_version_changed' end;
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'version', v_row ->> 'version', 'status', v_row ->> 'status', 'name', v_row ->> 'name'));
    when 'rule_evaluations' then
      v_resource_type := 'rule_evaluation';
      v_resource_id := coalesce(v_row ->> 'claim_id', v_row ->> 'id');
      v_aggregate_id := public.audit_safe_uuid(v_resource_id);
      v_action := 'rule_evaluated';
      v_actor_id := public.audit_safe_uuid(v_row #>> '{all_rules_evaluated,-1,actor_id}');
      v_actor_type := case when v_actor_id is null then 'system' else 'user' end;
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'rule_id', v_row ->> 'rule_id', 'recommendation', v_row ->> 'recommendation',
        'evaluation_source', v_row ->> 'evaluation_source',
        'signals_hash', v_row ->> 'signals_hash', 'rules_hash', v_row ->> 'rules_hash'));
    when 'user_permission_grants' then
      v_resource_type := 'permission_grant';
      v_action := case when tg_op = 'DELETE' or coalesce((v_row ->> 'revoked')::boolean, false)
        then 'permission_revoked' else 'permission_granted' end;
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'grantee_user_id', v_row ->> 'grantee_user_id', 'permission', v_row ->> 'permission'));
    when 'merchant_users' then
      v_resource_type := 'merchant_member';
      v_action := case when tg_op = 'INSERT' then 'team_member_invited'
        when tg_op = 'DELETE' then 'team_member_removed'
        when (v_old ->> 'role') is distinct from (v_new ->> 'role') then 'team_member_role_changed'
        else 'team_member_updated' end;
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'member_user_id', v_row ->> 'user_id', 'previous_role', v_old ->> 'role', 'new_role', v_new ->> 'role'));
    when 'merchant_api_keys' then
      v_resource_type := 'api_key';
      v_action := case when tg_op = 'INSERT' then 'api_key_created' else 'api_key_revoked' end;
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'name', v_row ->> 'name', 'key_prefix', v_row ->> 'key_prefix',
        'revoked_at', v_row ->> 'revoked_at'));
    when 'evidence_download_tokens' then
      v_resource_type := 'evidence_export';
      v_resource_id := v_row ->> 'evidence_id'; v_aggregate_id := public.audit_safe_uuid(v_resource_id);
      v_action := case when tg_op = 'INSERT' then 'evidence_export_issued' else 'evidence_export_downloaded' end;
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'expires_at', v_row ->> 'expires_at', 'used_at', v_row ->> 'used_at'));
    when 'evidence_packages' then
      v_resource_type := 'evidence';
      v_resource_id := v_row ->> 'id'; v_aggregate_id := public.audit_safe_uuid(v_resource_id);
      v_action := case when tg_op = 'DELETE' then 'evidence_deleted' else 'evidence_generated' end;
      v_details := jsonb_strip_nulls(jsonb_build_object('reference_number', v_row ->> 'reference_number'));
    -- commerce_store_connections is a read-only compatibility view over the
    -- trigger-audited store_connections table, so it must not receive its own
    -- row trigger.
    when 'merchant_integrations', 'store_connections', 'helpdesk_connections' then
      v_resource_type := 'integration_connection';
      v_resource_id := v_row ->> 'id'; v_aggregate_id := public.audit_safe_uuid(v_resource_id);
      v_action := case
        when tg_op = 'DELETE' then 'integration_disconnected'
        when coalesce(v_new ->> 'status', '') in ('disconnected','disabled','not_connected') then 'integration_disconnected'
        when tg_op = 'INSERT' then 'integration_connected'
        when (v_old ->> 'status') is distinct from (v_new ->> 'status') then 'integration_status_changed'
        else 'integration_configuration_changed' end;
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'provider', coalesce(v_row ->> 'provider_id', v_row ->> 'provider', v_row ->> 'platform'),
        'previous_status', v_old ->> 'status', 'new_status', v_new ->> 'status'));
    when 'source_orders' then
      v_resource_type := 'order';
      v_resource_id := v_row ->> 'id'; v_aggregate_id := public.audit_safe_uuid(v_resource_id);
      v_action := case
        when tg_op = 'UPDATE'
         and (v_old ->> 'dismissed_by_merchant') is distinct from (v_new ->> 'dismissed_by_merchant')
         and coalesce((v_new ->> 'dismissed_by_merchant')::boolean, false)
          then 'dismiss_transaction'
        else 'order_review_state_changed'
      end;
    when 'sync_jobs' then
      v_resource_type := 'processing_job';
      v_resource_id := v_row ->> 'id'; v_aggregate_id := public.audit_safe_uuid(v_resource_id);
      v_action := case when coalesce((v_new ->> 'hidden_by_merchant')::boolean, false)
        then 'hide_job' else 'processing_job_changed' end;
    when 'identity_notes' then
      v_resource_type := 'customer_note';
      v_action := case when tg_op = 'INSERT' then 'customer_note_added'
        when tg_op = 'DELETE'
          or ((v_old ->> 'deleted_at') is distinct from (v_new ->> 'deleted_at')
            and nullif(v_new ->> 'deleted_at', '') is not null)
          then 'customer_note_deleted' else 'customer_note_changed' end;
    when 'merchant_identity_state' then
      v_resource_type := 'customer';
      v_action := case
        when coalesce((v_new ->> 'removed_by_merchant')::boolean, false)
          then 'customer_watchlist_removed'
        when tg_op = 'UPDATE'
          and (v_old ->> 'investigation_status') is distinct from (v_new ->> 'investigation_status')
          then 'update_customer_status'
        else 'customer_state_changed'
      end;
    when 'accountability_events' then
      v_resource_type := 'claim';
      v_resource_id := v_row ->> 'claim_id'; v_aggregate_id := public.audit_safe_uuid(v_resource_id);
      v_action := lower(v_row ->> 'event_type');
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'description', v_row ->> 'description', 'loss_source_id', v_row ->> 'loss_source_id',
        'recovery_task_id', v_row ->> 'recovery_task_id'));
    when 'connector_action_runs' then
      v_resource_type := 'connector_action';
      v_resource_id := v_row ->> 'id'; v_aggregate_id := public.audit_safe_uuid(v_resource_id);
      v_action := 'connector_action_recorded';
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'capability_id', v_row ->> 'capability_id', 'status', v_row ->> 'status',
        'support_payout_case_id', v_row ->> 'support_payout_case_id'));
    when 'access_audit_log' then
      v_resource_type := 'sensitive_context_access';
      v_resource_id := v_row ->> 'id'; v_aggregate_id := public.audit_safe_uuid(v_resource_id);
      v_action := 'sensitive_context_accessed';
      v_actor_type := 'api_key';
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'query_type', v_row ->> 'query_type', 'lookup_type', v_row ->> 'lookup_type',
        'result_returned', v_row ->> 'result_returned',
        'k_anonymity_satisfied', v_row ->> 'k_anonymity_satisfied',
        'matched_merchant_count', v_row ->> 'matched_merchant_count'));
    else
      v_resource_type := tg_table_name;
      v_action := lower(tg_op) || '_' || tg_table_name;
  end case;

  -- This reference identifies the mutation, not merely its resulting row
  -- state. Two real transitions that return a row to the same values must not
  -- collapse into one audit event. Delivery retries dedupe on the resulting
  -- immutable domain-event id.
  v_idempotency_reference :=
    'audit:' || tg_table_name || ':' || coalesce(v_row ->> 'id', v_resource_id, 'row') || ':' ||
    lower(tg_op) || ':' || gen_random_uuid()::text;
  v_meaning := initcap(replace(v_action, '_', ' ')) || ' for ' || replace(v_resource_type, '_', ' ');

  perform public.record_domain_event(
    v_merchant_id,
    'audit.action_recorded',
    v_resource_type,
    v_aggregate_id,
    'audit:' || tg_table_name || ':' || v_idempotency_reference,
    jsonb_build_object('audit', jsonb_strip_nulls(jsonb_build_object(
      'action', v_action,
      'resource_type', v_resource_type,
      'resource_id', v_resource_id,
      'actor_role', v_actor_role,
      'meaning', v_meaning,
      'effective_at', v_effective_at,
      'recorded_at', v_recorded_at,
      'idempotency_reference', v_idempotency_reference,
      'metadata', jsonb_strip_nulls(jsonb_build_object(
        'source_table', tg_table_name,
        'operation', lower(tg_op),
        'changed_fields', v_changed_fields,
        'details', v_details,
        'request_ip', v_request_ip
      ))
    ))),
    null, null, null,
    v_actor_type,
    v_actor_id,
    v_effective_at,
    v_correlation_id,
    null,
    array['auditTimelineProjection']::text[]
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;
CREATE FUNCTION public.claim_case_investigation_dispatch(p_merchant_id uuid, p_investigation_id uuid, p_dispatch_kind text, p_channel text, p_idempotency_key text, p_request_hash text, p_actor_user_id uuid, p_lease_seconds integer DEFAULT 60)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_investigation public.case_clarification_requests;
  v_dispatch public.case_investigation_dispatches;
  v_lease_token uuid;
begin
  if p_merchant_id is null or p_investigation_id is null or p_actor_user_id is null then
    raise exception 'investigation_dispatch_identifiers_required' using errcode = '22023';
  end if;
  if p_dispatch_kind not in ('initial_request', 'chase')
     or p_channel <> 'email' then
    raise exception 'investigation_dispatch_kind_invalid' using errcode = '22023';
  end if;
  if p_idempotency_key is null
     or length(trim(p_idempotency_key)) < 8
     or length(p_idempotency_key) > 180
     or p_request_hash !~ '^[0-9a-f]{64}$'
     or p_lease_seconds not between 15 and 300 then
    raise exception 'investigation_dispatch_request_invalid' using errcode = '22023';
  end if;

  select *
    into v_investigation
  from public.case_clarification_requests
  where id = p_investigation_id
    and merchant_id = p_merchant_id
  for update;
  if not found then
    raise exception 'investigation_not_found' using errcode = 'P0002';
  end if;

  select *
    into v_dispatch
  from public.case_investigation_dispatches
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key)
  for update;
  if found then
    if v_dispatch.investigation_id is distinct from p_investigation_id
       or v_dispatch.dispatch_kind is distinct from p_dispatch_kind
       or v_dispatch.channel is distinct from p_channel
       or v_dispatch.request_hash is distinct from p_request_hash then
      raise exception 'investigation_dispatch_idempotency_conflict'
        using errcode = '23505';
    end if;
    if v_dispatch.status = 'accepted' then
      return to_jsonb(v_dispatch)
        || jsonb_build_object('claimed', false, 'replayed', true);
    end if;
  end if;

  if p_dispatch_kind = 'initial_request' and v_investigation.status <> 'draft' then
    raise exception 'investigation_must_be_draft_to_send' using errcode = '22023';
  end if;
  if p_dispatch_kind = 'chase' and v_investigation.status <> 'waiting_response' then
    raise exception 'investigation_must_be_waiting_to_chase' using errcode = '22023';
  end if;

  insert into public.case_investigation_dispatches (
    merchant_id, investigation_id, dispatch_kind, channel,
    idempotency_key, request_hash, status, created_by
  ) values (
    p_merchant_id, p_investigation_id, p_dispatch_kind, p_channel,
    trim(p_idempotency_key), p_request_hash, 'requested', p_actor_user_id
  )
  on conflict (merchant_id, idempotency_key) do nothing;

  select *
    into v_dispatch
  from public.case_investigation_dispatches
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key)
  for update;
  if v_dispatch.investigation_id is distinct from p_investigation_id
     or v_dispatch.dispatch_kind is distinct from p_dispatch_kind
     or v_dispatch.channel is distinct from p_channel
     or v_dispatch.request_hash is distinct from p_request_hash then
    raise exception 'investigation_dispatch_idempotency_conflict'
      using errcode = '23505';
  end if;

  if v_dispatch.status = 'accepted' then
    return to_jsonb(v_dispatch)
      || jsonb_build_object('claimed', false, 'replayed', true);
  end if;
  if v_dispatch.status = 'processing'
     and v_dispatch.leased_until > now() then
    return to_jsonb(v_dispatch)
      || jsonb_build_object('claimed', false, 'replayed', true);
  end if;

  v_lease_token := gen_random_uuid();
  update public.case_investigation_dispatches
  set
    status = 'processing',
    lease_token = v_lease_token,
    leased_until = now() + make_interval(secs => p_lease_seconds),
    attempt_count = attempt_count + 1,
    last_error = null,
    updated_at = now()
  where id = v_dispatch.id
    and merchant_id = p_merchant_id
  returning * into v_dispatch;

  return to_jsonb(v_dispatch)
    || jsonb_build_object('claimed', true, 'replayed', false);
end;
$function$;
CREATE OR REPLACE FUNCTION public.claim_domain_event_deliveries(p_handler_name text, p_limit integer DEFAULT 20, p_worker_id text DEFAULT 'worker'::text, p_lease_seconds integer DEFAULT 60)
 RETURNS SETOF public.domain_event_deliveries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.domain_event_deliveries
     set status = 'dead_letter',
         last_error = coalesce(last_error, 'delivery lease expired after final attempt'),
         leased_by = null,
         leased_until = null
   where handler_name = p_handler_name
     and status = 'processing'
     and leased_until <= now()
     and attempts >= max_attempts;

  return query
  with claimed as (
    select d.id
      from public.domain_event_deliveries d
     where d.handler_name = p_handler_name
       and d.attempts < d.max_attempts
       and (
         (d.status in ('pending', 'failed') and d.next_attempt_at <= now())
         or (d.status = 'processing' and d.leased_until <= now())
       )
     order by coalesce(d.leased_until, d.next_attempt_at), d.created_at, d.id
     for update skip locked
     limit least(greatest(p_limit, 1), 1000)
  )
  update public.domain_event_deliveries d
     set status = 'processing',
         leased_by = p_worker_id,
         leased_until = now() + make_interval(secs => greatest(p_lease_seconds, 1)),
         attempts = d.attempts + 1
    from claimed
   where d.id = claimed.id
  returning d.*;
end;
$function$;
REVOKE ALL ON FUNCTION public.claim_ingestion_event(uuid, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.claim_ingestion_event(uuid, text, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.claim_ingestion_event(uuid, text, integer) FROM service_role;
CREATE FUNCTION public.claim_processed_webhook(p_key text, p_provider text, p_store_key text, p_topic text, p_payload_hash text, p_lease_seconds integer DEFAULT 300, p_object_key text DEFAULT NULL::text, p_event_version bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_row public.processed_webhooks;
  v_token uuid := gen_random_uuid();
  v_inserted boolean := false;
begin
  if nullif(trim(p_key), '') is null
     or nullif(trim(p_provider), '') is null
     or nullif(trim(p_payload_hash), '') is null then
    raise exception 'invalid_webhook_claim';
  end if;
  if (p_object_key is null) <> (p_event_version is null) then
    raise exception 'invalid_webhook_object_version';
  end if;

  -- Serialize claims for one provider account/object even when the delivery
  -- identifiers differ. The transaction-scoped lock is released immediately
  -- after this function returns; the processing lease then owns the work.
  if p_object_key is not null then
    perform pg_advisory_xact_lock(
      hashtextextended(concat_ws(chr(31), p_provider, coalesce(p_store_key, ''), p_object_key), 0)
    );
  end if;

  insert into public.processed_webhooks (
    idempotency_key,
    provider,
    store_key,
    topic,
    status,
    attempts,
    last_error,
    payload_hash,
    claim_token,
    lease_expires_at,
    object_key,
    event_version,
    processed_at,
    updated_at
  ) values (
    p_key,
    p_provider,
    p_store_key,
    p_topic,
    'processing',
    1,
    null,
    p_payload_hash,
    v_token,
    now() + make_interval(secs => greatest(p_lease_seconds, 1)),
    p_object_key,
    p_event_version,
    now(),
    now()
  )
  on conflict (idempotency_key) do nothing
  returning * into v_row;

  v_inserted := found;

  if not v_inserted then
    select * into v_row
      from public.processed_webhooks
     where idempotency_key = p_key
     for update;

    if v_row.payload_hash is not null and v_row.payload_hash <> p_payload_hash then
      return jsonb_build_object('status', 'conflict');
    end if;
    if (v_row.object_key is not null and v_row.object_key is distinct from p_object_key)
       or (v_row.event_version is not null and v_row.event_version is distinct from p_event_version) then
      return jsonb_build_object('status', 'conflict');
    end if;

    if v_row.status in ('completed', 'ignored') then
      return jsonb_build_object(
        'status', 'duplicate',
        'result', v_row.result_payload
      );
    end if;

    if v_row.status = 'processing'
       and v_row.lease_expires_at is not null
       and v_row.lease_expires_at > now() then
      return jsonb_build_object('status', 'in_progress');
    end if;
  end if;

  if p_object_key is not null then
    -- Expired workers can never complete (the completion RPC also checks the
    -- lease). Mark them failed before deciding whether this object is free.
    update public.processed_webhooks
       set status = 'failed',
           last_error = 'lease_expired',
           lease_expires_at = null,
           updated_at = now()
     where provider = p_provider
       and store_key is not distinct from p_store_key
       and object_key = p_object_key
       and idempotency_key <> p_key
       and status = 'processing'
       and (lease_expires_at is null or lease_expires_at <= now());

    if exists (
      select 1
        from public.processed_webhooks
       where provider = p_provider
         and store_key is not distinct from p_store_key
         and object_key = p_object_key
         and idempotency_key <> p_key
         and status in ('completed', 'ignored')
         and event_version >= p_event_version
    ) then
      update public.processed_webhooks
         set provider = p_provider,
             store_key = p_store_key,
             topic = p_topic,
             status = 'ignored',
             attempts = attempts + case when v_inserted then 0 else 1 end,
             last_error = null,
             payload_hash = coalesce(payload_hash, p_payload_hash),
             object_key = coalesce(object_key, p_object_key),
             event_version = coalesce(event_version, p_event_version),
             claim_token = null,
             lease_expires_at = null,
             processed_at = now(),
             updated_at = now()
       where idempotency_key = p_key;
      return jsonb_build_object('status', 'stale');
    end if;

    if exists (
      select 1
        from public.processed_webhooks
       where provider = p_provider
         and store_key is not distinct from p_store_key
         and object_key = p_object_key
         and idempotency_key <> p_key
         and status = 'processing'
         and lease_expires_at > now()
    ) then
      update public.processed_webhooks
         set provider = p_provider,
             store_key = p_store_key,
             topic = p_topic,
             status = 'failed',
             attempts = attempts + case when v_inserted then 0 else 1 end,
             last_error = 'object_in_progress',
             payload_hash = coalesce(payload_hash, p_payload_hash),
             object_key = coalesce(object_key, p_object_key),
             event_version = coalesce(event_version, p_event_version),
             claim_token = null,
             lease_expires_at = null,
             updated_at = now()
       where idempotency_key = p_key;
      return jsonb_build_object('status', 'busy');
    end if;
  end if;

  if v_inserted then
    return jsonb_build_object('status', 'claimed', 'claim_token', v_token);
  end if;

  update public.processed_webhooks
     set provider = p_provider,
         store_key = p_store_key,
         topic = p_topic,
         status = 'processing',
         attempts = attempts + 1,
         last_error = null,
         payload_hash = coalesce(payload_hash, p_payload_hash),
         object_key = coalesce(object_key, p_object_key),
         event_version = coalesce(event_version, p_event_version),
         claim_token = v_token,
         lease_expires_at = now() + make_interval(secs => greatest(p_lease_seconds, 1)),
         result_payload = null,
         updated_at = now()
   where idempotency_key = p_key;

  return jsonb_build_object('status', 'claimed', 'claim_token', v_token);
end;
$function$;
REVOKE ALL ON FUNCTION public.claim_sync_job(integer, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.claim_sync_job(integer, text, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.claim_sync_job(integer, text, integer) FROM service_role;
CREATE FUNCTION public.complete_case_investigation_dispatch(p_merchant_id uuid, p_dispatch_id uuid, p_lease_token uuid, p_accepted boolean, p_provider_message_id text, p_error text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_dispatch public.case_investigation_dispatches;
begin
  select *
    into v_dispatch
  from public.case_investigation_dispatches
  where id = p_dispatch_id
    and merchant_id = p_merchant_id
  for update;
  if not found then
    raise exception 'investigation_dispatch_not_found' using errcode = 'P0002';
  end if;
  if v_dispatch.status = 'accepted' then
    return to_jsonb(v_dispatch) || jsonb_build_object('replayed', true);
  end if;
  if v_dispatch.status <> 'processing'
     or v_dispatch.lease_token is distinct from p_lease_token then
    raise exception 'investigation_dispatch_lease_conflict' using errcode = '40001';
  end if;
  if p_accepted and coalesce(length(trim(p_provider_message_id)), 0) < 1 then
    raise exception 'investigation_dispatch_provider_id_required' using errcode = '22023';
  end if;

  update public.case_investigation_dispatches
  set
    status = case when p_accepted then 'accepted' else 'failed' end,
    provider_message_id = case
      when p_accepted then trim(p_provider_message_id)
      else provider_message_id
    end,
    accepted_at = case when p_accepted then now() else accepted_at end,
    last_error = case
      when p_accepted then null
      else left(coalesce(nullif(trim(p_error), ''), 'email_provider_failed'), 2000)
    end,
    lease_token = null,
    leased_until = null,
    updated_at = now()
  where id = p_dispatch_id
    and merchant_id = p_merchant_id
  returning * into v_dispatch;
  return to_jsonb(v_dispatch) || jsonb_build_object('replayed', false);
end;
$function$;
REVOKE ALL ON FUNCTION public.complete_domain_event_delivery(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.complete_domain_event_delivery(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.complete_domain_event_delivery(uuid) FROM service_role;
CREATE FUNCTION public.complete_privacy_storage_cleanup_job(p_job_id uuid, p_worker_id text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with completed as (
    update public.privacy_storage_cleanup_jobs
       set status = 'completed', completed_at = now(), last_error = null,
           leased_by = null, leased_until = null
     where id = p_job_id and status = 'processing' and leased_by = p_worker_id
    returning 1
  ) select exists(select 1 from completed);
$function$;
CREATE FUNCTION public.complete_processed_webhook(p_key text, p_claim_token uuid, p_status text, p_last_error text DEFAULT NULL::text, p_result jsonb DEFAULT NULL::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_rows integer;
begin
  if p_status not in ('completed', 'failed') then
    raise exception 'invalid_webhook_completion_status';
  end if;

  update public.processed_webhooks
     set status = p_status,
         last_error = case when p_status = 'failed' then left(p_last_error, 300) else null end,
         result_payload = case when p_status = 'completed' then p_result else null end,
         processed_at = case when p_status = 'completed' then now() else processed_at end,
         lease_expires_at = null,
         updated_at = now()
   where idempotency_key = p_key
     and claim_token = p_claim_token
     and status = 'processing'
     and lease_expires_at > now();

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$function$;
REVOKE ALL ON FUNCTION public.complete_processing_job_chunk(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.complete_processing_job_chunk(uuid, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.complete_processing_job_chunk(uuid, integer) FROM service_role;
REVOKE ALL ON FUNCTION public.consume_context_credits_if_available(uuid, uuid, text, text, integer, timestamp with time zone, timestamp with time zone, integer, uuid, text, text, text, text, jsonb, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.consume_context_credits_if_available(uuid, uuid, text, text, integer, timestamp with time zone, timestamp with time zone, integer, uuid, text, text, text, text, jsonb, boolean) FROM authenticated;
REVOKE ALL ON FUNCTION public.consume_context_credits_if_available(uuid, uuid, text, text, integer, timestamp with time zone, timestamp with time zone, integer, uuid, text, text, text, text, jsonb, boolean) FROM service_role;
CREATE FUNCTION public.correct_case_issue(p_merchant_id uuid, p_case_id uuid, p_expected_version bigint, p_issue text, p_rationale text, p_actor_user_id uuid, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_case public.support_payout_cases;
  v_prior_event public.domain_events;
  v_event public.domain_events;
  v_previous_issue text;
  v_claim_type public.claim_type;
  v_result jsonb;
begin
  if p_merchant_id is null or p_case_id is null or p_actor_user_id is null then
    raise exception 'case_issue_identifiers_required' using errcode = '22023';
  end if;
  if p_expected_version is null or p_expected_version < 1 then
    raise exception 'case_issue_expected_version_required' using errcode = '22023';
  end if;
  if p_idempotency_key is null
     or length(trim(p_idempotency_key)) < 8
     or length(p_idempotency_key) > 200 then
    raise exception 'case_issue_idempotency_key_invalid' using errcode = '22023';
  end if;
  if coalesce(length(trim(p_rationale)), 0) < 5
     or length(p_rationale) > 2000 then
    raise exception 'case_issue_rationale_invalid' using errcode = '22023';
  end if;
  if p_issue is null or p_issue not in (
    'item_not_received', 'missing_item', 'damaged_item', 'wrong_item',
    'not_as_described', 'late_delivery', 'refund_request',
    'chargeback_related', 'return_abuse', 'other'
  ) then
    raise exception 'case_issue_invalid' using errcode = '22023';
  end if;

  select *
    into v_prior_event
  from public.domain_events
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key);
  if found then
    if v_prior_event.event_type <> 'case.issue_corrected'
       or v_prior_event.aggregate_id is distinct from p_case_id
       or v_prior_event.payload ->> 'new_issue' is distinct from p_issue then
      raise exception 'case_issue_idempotency_conflict' using errcode = '23505';
    end if;
    return coalesce(v_prior_event.payload -> 'result', '{}'::jsonb)
      || jsonb_build_object('domain_event_id', v_prior_event.id, 'replayed', true);
  end if;

  select *
    into v_case
  from public.support_payout_cases
  where merchant_id = p_merchant_id
    and id = p_case_id
  for update;
  if not found then
    raise exception 'case_not_found' using errcode = 'P0002';
  end if;
  if v_case.state_version is distinct from p_expected_version then
    raise exception 'case_version_conflict' using errcode = '40001';
  end if;

  v_previous_issue := coalesce(v_case.reason_normalized, v_case.claim_type::text);
  if v_previous_issue = p_issue then
    raise exception 'case_issue_unchanged' using errcode = '22023';
  end if;

  v_claim_type := case p_issue
    when 'item_not_received' then 'item_not_received'::public.claim_type
    when 'missing_item' then 'item_not_received'::public.claim_type
    when 'late_delivery' then 'item_not_received'::public.claim_type
    when 'damaged_item' then 'damaged'::public.claim_type
    when 'wrong_item' then 'wrong_item'::public.claim_type
    when 'not_as_described' then 'not_as_described'::public.claim_type
    when 'refund_request' then 'refund_request'::public.claim_type
    when 'chargeback_related' then 'chargeback'::public.claim_type
    when 'return_abuse' then 'return_abuse'::public.claim_type
    else 'other'::public.claim_type
  end;

  update public.support_payout_cases
  set
    claim_type = v_claim_type,
    reason_normalized = p_issue,
    detection_detail = coalesce(detection_detail, '{}'::jsonb) || jsonb_build_object(
      'issue_corrected_manually', true,
      'issue_correction_rationale', trim(p_rationale),
      'issue_corrected_at', now()
    ),
    recommended_payout_action = null,
    recommended_rule_name = null,
    recommended_rule_id = null,
    payout_decision_state = case
      when payout_decision_state = 'recommendation_ready' then 'undecided'
      else payout_decision_state
    end,
    state_version = state_version + 1,
    updated_at = now()
  where merchant_id = p_merchant_id
    and id = p_case_id;

  v_result := jsonb_build_object(
    'case_id', p_case_id,
    'previous_issue', v_previous_issue,
    'issue', p_issue,
    'claim_type', v_claim_type,
    'new_version', p_expected_version + 1,
    'replayed', false
  );

  select *
    into v_event
  from public.record_domain_event(
    p_merchant_id,
    'case.issue_corrected',
    'case',
    p_case_id,
    trim(p_idempotency_key),
    jsonb_build_object(
      'case_id', p_case_id,
      'previous_issue', v_previous_issue,
      'new_issue', p_issue,
      'claim_type', v_claim_type,
      'rationale', trim(p_rationale),
      'from_version', p_expected_version,
      'to_version', p_expected_version + 1,
      'result', v_result
    ),
    null,
    null,
    null,
    'user',
    p_actor_user_id,
    now(),
    null,
    null,
    array[
      'financialProjection',
      'lossProjection',
      'recoveryProjection',
      'customerProjection',
      'caseProjection',
      'workflowHandler',
      'notificationProjection',
      'auditTimelineProjection'
    ]::text[]
  );

  insert into public.claim_events (
    claim_id, merchant_id, event_type, from_status, to_status,
    note, actor_user_id, metadata
  ) values (
    p_case_id, p_merchant_id, 'issue_corrected', v_case.status, v_case.status,
    trim(p_rationale), p_actor_user_id,
    jsonb_build_object(
      'previous_issue', v_previous_issue,
      'new_issue', p_issue,
      'state_version', p_expected_version + 1,
      'domain_event_id', v_event.id,
      'idempotency_key', trim(p_idempotency_key)
    )
  );

  return v_result || jsonb_build_object('domain_event_id', v_event.id);
end;
$function$;
CREATE FUNCTION public.create_case_investigation(p_merchant_id uuid, p_case_id uuid, p_target_type text, p_target_name text, p_partner_id uuid, p_evidence_gap text, p_recommended_reason text, p_override_rationale text, p_requested_evidence text[], p_request_summary text, p_subject text, p_request_body text, p_recipient text, p_source_channel text, p_due_at timestamp with time zone, p_is_primary boolean, p_actor_user_id uuid, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_investigation public.case_clarification_requests;
  v_existing public.case_clarification_requests;
  v_event public.domain_events;
  v_is_primary boolean;
  v_result jsonb;
begin
  if p_merchant_id is null or p_case_id is null or p_actor_user_id is null then
    raise exception 'investigation_identifiers_required' using errcode = '22023';
  end if;
  if p_idempotency_key is null
     or length(trim(p_idempotency_key)) < 8
     or length(p_idempotency_key) > 180 then
    raise exception 'investigation_idempotency_key_invalid' using errcode = '22023';
  end if;
  if p_target_type not in ('carrier', '3pl', 'warehouse', 'supplier', 'customer', 'internal')
     or coalesce(length(trim(p_evidence_gap)), 0) < 3
     or coalesce(length(trim(p_subject)), 0) < 1
     or coalesce(length(trim(p_request_body)), 0) < 1 then
    raise exception 'investigation_draft_invalid' using errcode = '22023';
  end if;

  select *
    into v_existing
  from public.case_clarification_requests
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key);
  if found then
    if v_existing.support_payout_case_id <> p_case_id
       or v_existing.target_type <> p_target_type
       or v_existing.evidence_gap <> trim(p_evidence_gap) then
      raise exception 'investigation_idempotency_conflict' using errcode = '23505';
    end if;
    return to_jsonb(v_existing) || jsonb_build_object('replayed', true);
  end if;

  perform 1
  from public.support_payout_cases
  where id = p_case_id
    and merchant_id = p_merchant_id
  for update;
  if not found then
    raise exception 'case_not_found' using errcode = 'P0002';
  end if;

  -- A concurrent retry can only pass the first lookup before the first
  -- transaction commits. Re-check after the case lock so the logical retry
  -- returns the original investigation instead of surfacing a unique error.
  select *
    into v_existing
  from public.case_clarification_requests
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key);
  if found then
    if v_existing.support_payout_case_id <> p_case_id
       or v_existing.target_type <> p_target_type
       or v_existing.evidence_gap <> trim(p_evidence_gap) then
      raise exception 'investigation_idempotency_conflict' using errcode = '23505';
    end if;
    return to_jsonb(v_existing) || jsonb_build_object('replayed', true);
  end if;

  if p_partner_id is not null and not exists (
    select 1 from public.partners
    where id = p_partner_id and merchant_id = p_merchant_id
  ) then
    raise exception 'investigation_partner_not_found' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.case_clarification_requests
    where merchant_id = p_merchant_id
      and support_payout_case_id = p_case_id
      and target_type = p_target_type
      and lower(evidence_gap) = lower(trim(p_evidence_gap))
      and status in ('draft', 'sent', 'waiting_response', 'response_received')
  ) then
    raise exception 'duplicate_open_investigation' using errcode = '23505';
  end if;

  v_is_primary := coalesce(p_is_primary, false) or not exists (
    select 1
    from public.case_clarification_requests
    where merchant_id = p_merchant_id
      and support_payout_case_id = p_case_id
      and is_primary
      and status in ('draft', 'sent', 'waiting_response', 'response_received')
  );

  if v_is_primary and exists (
    select 1
    from public.case_clarification_requests
    where merchant_id = p_merchant_id
      and support_payout_case_id = p_case_id
      and is_primary
      and status in ('draft', 'sent', 'waiting_response', 'response_received')
  ) then
    raise exception 'open_primary_investigation_exists' using errcode = '23505';
  end if;

  insert into public.case_clarification_requests (
    merchant_id, support_payout_case_id, partner_id, is_primary,
    target_type, target_name, status, evidence_gap, recommended_reason,
    override_rationale,
    requested_evidence, request_summary, subject, request_body, recipient,
    source_channel, due_at, created_by, idempotency_key
  ) values (
    p_merchant_id, p_case_id, p_partner_id, v_is_primary,
    p_target_type, nullif(trim(p_target_name), ''), 'draft',
    trim(p_evidence_gap), nullif(trim(p_recommended_reason), ''),
    nullif(trim(p_override_rationale), ''),
    coalesce(p_requested_evidence, '{}'::text[]),
    coalesce(nullif(trim(p_request_summary), ''), left(trim(p_request_body), 2000)),
    trim(p_subject), trim(p_request_body), nullif(trim(p_recipient), ''),
    nullif(p_source_channel, ''), p_due_at, p_actor_user_id,
    trim(p_idempotency_key)
  )
  returning * into v_investigation;

  v_result := to_jsonb(v_investigation) || jsonb_build_object('replayed', false);
  select *
    into v_event
  from public.record_domain_event(
    p_merchant_id,
    'investigation.created',
    'case_investigation',
    v_investigation.id,
    trim(p_idempotency_key) || ':event',
    jsonb_build_object(
      'investigation_id', v_investigation.id,
      'case_id', p_case_id,
      'target_type', p_target_type,
      'is_primary', v_is_primary,
      'evidence_gap', trim(p_evidence_gap),
      'result', v_result
    ),
    null, null, null, 'user', p_actor_user_id, now(), null, null,
    array[
      'caseProjection', 'notificationProjection',
      'workflowHandler', 'auditTimelineProjection'
    ]::text[]
  );

  return v_result || jsonb_build_object('domain_event_id', v_event.id);
end;
$function$;
REVOKE ALL ON FUNCTION public.create_merchant_rule_draft_pack(uuid, uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.create_merchant_rule_draft_pack(uuid, uuid, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.create_merchant_rule_draft_pack(uuid, uuid, jsonb) FROM service_role;
REVOKE ALL ON FUNCTION public.create_merchant_rule_draft(uuid, uuid, text, text, jsonb, text, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.create_merchant_rule_draft(uuid, uuid, text, text, jsonb, text, text, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.create_merchant_rule_draft(uuid, uuid, text, text, jsonb, text, text, integer) FROM service_role;
REVOKE ALL ON FUNCTION public.deduct_merchant_credits(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.deduct_merchant_credits(uuid, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.deduct_merchant_credits(uuid, integer) FROM service_role;
REVOKE ALL ON FUNCTION public.discard_merchant_rule_draft(uuid, uuid, uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.discard_merchant_rule_draft(uuid, uuid, uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.discard_merchant_rule_draft(uuid, uuid, uuid, uuid) FROM service_role;
REVOKE ALL ON FUNCTION public.enforce_recovery_case_integrity() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_recovery_case_integrity() FROM authenticated;
REVOKE ALL ON FUNCTION public.enforce_recovery_case_integrity() FROM service_role;
CREATE FUNCTION public.enforce_single_active_merchant_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_merchant_id uuid;
  v_merchant_ids uuid[] := array[]::uuid[];
  v_owner_count integer;
begin
  if tg_op <> 'INSERT' then
    v_merchant_ids := array_append(v_merchant_ids, old.merchant_id);
  end if;
  if tg_op <> 'DELETE' and not (new.merchant_id = any(v_merchant_ids)) then
    v_merchant_ids := array_append(v_merchant_ids, new.merchant_id);
  end if;

  foreach v_merchant_id in array v_merchant_ids loop
    -- A parent merchant deletion cascades its memberships and is allowed.
    if exists (select 1 from public.merchants where id = v_merchant_id) then
      select count(*)::integer
        into v_owner_count
      from public.merchant_users
      where merchant_id = v_merchant_id
        and role = 'owner'::public.member_role
        and invite_status = 'active'::public.invite_status
        and user_id is not null;

      if v_owner_count <> 1 then
        raise exception 'merchant_requires_exactly_one_active_owner'
          using errcode = '23514',
                detail = format('merchant_id=%s active_owner_count=%s', v_merchant_id, v_owner_count),
                hint = 'Use transfer_merchant_ownership for an atomic owner change.';
      end if;
    end if;
  end loop;

  return null;
end;
$function$;
CREATE FUNCTION public.erase_merchant_data_subject(p_merchant_id uuid, p_subject_id uuid, p_actor_user_id uuid, p_idempotency_key text, p_effective_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_existing public.data_subject_erasure_receipts;
  v_receipt_id uuid := gen_random_uuid();
  v_now timestamptz := coalesce(p_effective_at, now());
  v_merchant_customer_id uuid;
  v_source_customer_ids uuid[] := '{}'::uuid[];
  v_order_ids uuid[] := '{}'::uuid[];
  v_ticket_ids uuid[] := '{}'::uuid[];
  v_case_ids uuid[] := '{}'::uuid[];
  v_loss_ids uuid[] := '{}'::uuid[];
  v_recovery_ids uuid[] := '{}'::uuid[];
  v_identity_ids uuid[] := '{}'::uuid[];
  v_evidence_ids uuid[] := '{}'::uuid[];
  v_job_ids uuid[] := '{}'::uuid[];
  v_ingestion_ids uuid[] := '{}'::uuid[];
  v_signal_hashes text[] := '{}'::text[];
  v_storage_paths jsonb := '[]'::jsonb;
  v_counts jsonb;
begin
  if p_merchant_id is null or p_subject_id is null
     or nullif(btrim(p_idempotency_key), '') is null
     or length(p_idempotency_key) > 200 then
    raise exception 'invalid_subject_erasure_request' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'privacy-erasure:' || p_merchant_id::text || ':' || p_idempotency_key, 0
  ));

  select * into v_existing
    from public.data_subject_erasure_receipts
   where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'receipt_id', v_existing.id,
      'subject_reference', v_existing.subject_reference,
      'merchant_customer_reference', v_existing.merchant_customer_reference,
      'counts', v_existing.scope_counts,
      'replayed', true
    );
  end if;

  select id into v_merchant_customer_id
    from public.merchant_customers
   where merchant_id = p_merchant_id and id = p_subject_id
   for update;

  if v_merchant_customer_id is null then
    select merchant_customer_id into v_merchant_customer_id
      from public.source_customers
     where merchant_id = p_merchant_id and id = p_subject_id
     for update;
  end if;

  select coalesce(array_agg(id order by id), '{}'::uuid[])
    into v_source_customer_ids
    from public.source_customers
   where merchant_id = p_merchant_id
     and (
       (v_merchant_customer_id is not null and merchant_customer_id = v_merchant_customer_id)
       or id = p_subject_id
     );

  if v_merchant_customer_id is null and cardinality(v_source_customer_ids) = 0 then
    raise exception 'subject_not_found' using errcode = 'P0002';
  end if;

  if v_merchant_customer_id is not null then
    perform 1 from public.merchant_customers
     where merchant_id = p_merchant_id and id = v_merchant_customer_id
     for update;
    if not found then
      raise exception 'subject_not_found' using errcode = 'P0002';
    end if;
  end if;

  select coalesce(array_agg(id order by id), '{}'::uuid[])
    into v_order_ids
    from public.source_orders
   where merchant_id = p_merchant_id
     and (
       (v_merchant_customer_id is not null and merchant_customer_id = v_merchant_customer_id)
       or source_customer_id = any(v_source_customer_ids)
     );

  select coalesce(array_agg(id order by id), '{}'::uuid[])
    into v_ticket_ids
    from public.source_tickets
   where merchant_id = p_merchant_id
     and (
       (v_merchant_customer_id is not null and merchant_customer_id = v_merchant_customer_id)
       or source_customer_id = any(v_source_customer_ids)
     );

  select coalesce(array_agg(id order by id), '{}'::uuid[])
    into v_case_ids
    from public.support_payout_cases
   where merchant_id = p_merchant_id
     and (
       (v_merchant_customer_id is not null and merchant_customer_id = v_merchant_customer_id)
       or source_order_id = any(v_order_ids)
       or source_ticket_id = any(v_ticket_ids)
     );

  select coalesce(array_agg(id order by id), '{}'::uuid[])
    into v_loss_ids from public.loss_cases
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);
  select coalesce(array_agg(id order by id), '{}'::uuid[])
    into v_recovery_ids from public.recovery_cases
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);

  select coalesce(array_agg(distinct identity_id), '{}'::uuid[])
    into v_identity_ids
    from (
      select identity_id from public.merchant_customers
       where merchant_id = p_merchant_id and id = v_merchant_customer_id
      union all
      select identity_id from public.support_payout_cases
       where merchant_id = p_merchant_id and id = any(v_case_ids)
    ) identities
   where identity_id is not null;

  select coalesce(array_agg(distinct identifier_hash), '{}'::text[])
    into v_signal_hashes
    from (
      select identifier_hash from public.merchant_customer_signals
       where merchant_id = p_merchant_id and merchant_customer_id = v_merchant_customer_id
      union all
      select identifier_hash from public.identity_signals
       where merchant_id = p_merchant_id
         and (source_customer_id = any(v_source_customer_ids)
           or source_order_id = any(v_order_ids)
           or source_ticket_id = any(v_ticket_ids))
    ) hashes
   where nullif(identifier_hash, '') is not null;

  select coalesce(array_agg(distinct evidence_id), '{}'::uuid[])
    into v_evidence_ids
    from (
      select e.id as evidence_id
        from public.evidence_items e
       where e.merchant_id = p_merchant_id and e.claim_id = any(v_case_ids)
      union
      select l.evidence_item_id
        from public.evidence_links l
       where l.merchant_id = p_merchant_id
         and (l.support_payout_case_id = any(v_case_ids)
           or l.source_order_id = any(v_order_ids)
           or l.source_ticket_id = any(v_ticket_ids))
    ) evidence;

  select coalesce(array_agg(distinct job_id), '{}'::uuid[])
    into v_job_ids from public.source_orders
   where merchant_id = p_merchant_id and id = any(v_order_ids) and job_id is not null;

  select coalesce(array_agg(distinct ingestion_event_id), '{}'::uuid[])
    into v_ingestion_ids
    from public.domain_events
   where merchant_id = p_merchant_id
     and ingestion_event_id is not null
     and aggregate_id = any(
       v_source_customer_ids || v_order_ids || v_ticket_ids || v_case_ids || v_loss_ids || v_recovery_ids
     );

  select coalesce(jsonb_agg(jsonb_build_object('bucket', bucket, 'object_path', object_path)), '[]'::jsonb)
    into v_storage_paths
    from (
      select distinct bucket, object_path
      from (
        select 'evidence-packages'::text bucket, storage_path::text object_path
          from public.evidence_items
         where merchant_id = p_merchant_id and id = any(v_evidence_ids)
        union all
        select 'evidence-packages', storage_path
          from public.claim_evidence
         where merchant_id = p_merchant_id and claim_id = any(v_case_ids)
        union all
        select 'evidence-packages', pdf_storage_path
          from public.evidence_packages
         where merchant_id = p_merchant_id
           and (customer_profile_id = any(v_source_customer_ids)
             or generated_for_order_id = any(v_order_ids))
        union all
        select 'pack-confirmation-photos', photo_url
          from public.pack_confirmations
         where merchant_id = p_merchant_id
           and order_id in (
             select coalesce(order_number, external_id) from public.source_orders
              where merchant_id = p_merchant_id and id = any(v_order_ids)
           )
        union all
        select 'merchant-csv-uploads-2', storage_path
          from public.sync_jobs
         where merchant_id = p_merchant_id and id = any(v_job_ids)
      ) paths
      where nullif(object_path, '') is not null
    ) unique_paths;

  -- Suppress ordinary mutation audit fan-out: this transaction writes its own
  -- immutable receipt, and ordinary change events could retain the PII fields
  -- being erased. The append-only event/financial rows are redacted only via
  -- their narrow trigger exceptions below.
  perform set_config('app.allow_subject_erasure', 'on', true);
  perform set_config('app.allow_domain_event_purge', 'on', true);
  perform set_config('app.allow_history_purge', 'on', true);

  delete from public.merchant_customer_signals
   where merchant_id = p_merchant_id and merchant_customer_id = v_merchant_customer_id;
  delete from public.identity_signals
   where merchant_id = p_merchant_id
     and (source_customer_id = any(v_source_customer_ids)
       or source_order_id = any(v_order_ids)
       or source_ticket_id = any(v_ticket_ids));
  delete from public.identity_edges
   where merchant_id = p_merchant_id
     and (left_hash = any(v_signal_hashes) or right_hash = any(v_signal_hashes));
  delete from public.customer_identity_signals
   where merchant_id = p_merchant_id
     and (customer_email_hash = any(v_signal_hashes)
       or phone_hash = any(v_signal_hashes)
       or shipping_address_hash = any(v_signal_hashes)
       or billing_address_hash = any(v_signal_hashes)
       or ip_hash = any(v_signal_hashes));
  delete from public.customer_claim_summary
   where merchant_id = p_merchant_id and customer_email_hash = any(v_signal_hashes);
  delete from public.identity_link_candidates
   where (merchant_id_a = p_merchant_id or merchant_id_b = p_merchant_id)
     and (primary_customer_email_hash = any(v_signal_hashes)
       or linked_customer_email_hash = any(v_signal_hashes));

  update public.merchant_identity_state
     set on_watchlist = false, display_name = null, display_email = null
   where merchant_id = p_merchant_id and identity_id = any(v_identity_ids);
  update public.identity_notes
     set body = '[redacted by data subject erasure]', deleted_at = coalesce(deleted_at, v_now)
   where merchant_id = p_merchant_id and identity_id = any(v_identity_ids);
  update public.access_audit_log
     set queried_hashes = '{}'
   where merchant_id = p_merchant_id and queried_hashes && v_signal_hashes;
  update public.identity_catch_events
     set profile_id = null,
         submitted_identifier_hash = repeat('0', 64),
         linked_identifier_hash = repeat('0', 64),
         submitted_identifier_display = null,
         linked_identifier_display = null,
         matched_signal_types = '{}'
   where merchant_id = p_merchant_id
     and (claim_id = any(v_case_ids) or order_id = any(v_order_ids)
       or profile_id = any(v_identity_ids));

  update public.record_match_candidates
     set evidence = '{"privacy_state":"erased"}'::jsonb, status = 'superseded'
   where merchant_id = p_merchant_id
     and (
       (subject_entity_type = 'source_customer' and subject_entity_id = any(v_source_customer_ids))
       or (subject_entity_type = 'source_order' and subject_entity_id = any(v_order_ids))
       or (subject_entity_type = 'source_ticket' and subject_entity_id = any(v_ticket_ids))
       or (candidate_entity_type = 'merchant_customer' and candidate_entity_id = v_merchant_customer_id)
     );
  update public.record_match_resolutions r
     set reason = '[redacted by data subject erasure]',
         metadata = '{"privacy_state":"erased"}'::jsonb
   where r.merchant_id = p_merchant_id
     and (
       (r.subject_entity_type = 'source_customer' and r.subject_entity_id = any(v_source_customer_ids))
       or (r.subject_entity_type = 'source_order' and r.subject_entity_id = any(v_order_ids))
       or (r.subject_entity_type = 'source_ticket' and r.subject_entity_id = any(v_ticket_ids))
       or r.selected_candidate_id in (
         select id from public.record_match_candidates
          where merchant_id = p_merchant_id
            and candidate_entity_type = 'merchant_customer'
            and candidate_entity_id = v_merchant_customer_id
       )
     );

  update public.source_addresses
     set line1 = null, line2 = null, city = null, region = null,
         postal_code = null, country = null, phone = null, normalized_full = null
   where merchant_id = p_merchant_id and source_customer_id = any(v_source_customer_ids);

  update public.source_customers
     set external_id = 'erased:' || id::text,
         email = null, phone = null, first_name = null, last_name = null,
         verified_email = null, account_created_at = null, orders_count = null,
         total_spent = null, tags = '[]'::jsonb, note = null,
         linked_platform_customer_external_id = null,
         other_emails = '[]'::jsonb,
         raw_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and id = any(v_source_customer_ids);

  update public.source_orders
     set email = null, phone = null, customer_email = null, customer_name = null,
         card_last4 = null, browser_ip = null, user_agent = null,
         accept_language = null, landing_site = null, referring_site = null,
         discount_codes = '[]'::jsonb, note = null, tags = '[]'::jsonb,
         shipping_address_id = null, billing_address_id = null
   where merchant_id = p_merchant_id and id = any(v_order_ids);
  update public.source_order_lines set raw_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and source_order_id = any(v_order_ids);
  update public.source_payments set raw_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id
     and (source_order_id = any(v_order_ids) or source_customer_id = any(v_source_customer_ids));
  update public.source_replacements set raw_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id
     and (source_order_id = any(v_order_ids) or support_payout_case_id = any(v_case_ids));
  update public.source_returns set raw_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id
     and (source_order_id = any(v_order_ids) or support_payout_case_id = any(v_case_ids));
  update public.source_shipments set raw_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and source_order_id = any(v_order_ids);
  update public.source_transactions set raw_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and source_order_id = any(v_order_ids);
  update public.source_tracking_events
     set location_text = null, description = null,
         raw_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and source_shipment_id in (
     select id from public.source_shipments
      where merchant_id = p_merchant_id and source_order_id = any(v_order_ids)
   );

  update public.source_tickets
     set external_url = null, subject = null, tags = '[]'::jsonb,
         linked_order_external_ids = '[]'::jsonb
   where merchant_id = p_merchant_id and id = any(v_ticket_ids);
  update public.source_messages
     set summary = null, body_ref = null, attachment_metadata = '[]'::jsonb,
         raw_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and source_ticket_id = any(v_ticket_ids);
  update public.source_ticket_events
     set summary = null, extracted_identifiers = '{}'::jsonb,
         metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and source_ticket_id = any(v_ticket_ids);

  update public.source_records
     set source_url = null, source_metadata = '{"privacy_state":"erased"}'::jsonb,
         external_id = case when canonical_entity_type in ('customer','source_customer')
           then 'erased:' || id::text else external_id end
   where merchant_id = p_merchant_id
     and canonical_entity_id = any(v_source_customer_ids || v_order_ids || v_ticket_ids);

  update public.ingestion_events
     set payload = null, payload_ref = null, last_error = null, payload_purged_at = v_now
   where merchant_id = p_merchant_id and id = any(v_ingestion_ids);
  delete from public.ingestion_field_errors
   where merchant_id = p_merchant_id and ingestion_event_id = any(v_ingestion_ids);

  update public.support_case_intake
     set external_url = null, customer_email_hash = null, customer_identifier = null,
         claim_reason = null, customer_message_summary = null, agent_notes_summary = null,
         attachments_metadata = '[]'::jsonb, tags = '[]'::jsonb,
         link_metadata = '{"privacy_state":"erased"}'::jsonb,
         macros_used = '[]'::jsonb
   where merchant_id = p_merchant_id
     and (customer_profile_id = any(v_source_customer_ids) or merchant_claim_id = any(v_case_ids));

  update public.support_payout_cases
     set identity_id = null, detection_detail = '{"privacy_state":"erased"}'::jsonb,
         reason_raw = null, recovery_next_action = null, next_action_reason = null,
         manual_reference = null, manual_source_url = null
   where merchant_id = p_merchant_id and id = any(v_case_ids);
  update public.claim_events
     set note = null, metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and claim_id = any(v_case_ids);
  update public.claim_outcomes set notes = null
   where claim_id = any(v_case_ids);
  update public.case_comments
     set body = '[redacted by data subject erasure]', deleted_at = coalesce(deleted_at, v_now)
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);
  update public.case_comment_events
     set body_snapshot = '[redacted by data subject erasure]'
   where merchant_id = p_merchant_id and comment_id in (
     select id from public.case_comments
      where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids)
   );
  update public.case_decisions
     set reason = null,
         rule_snapshot = '{"privacy_state":"erased"}'::jsonb,
         recommendation_snapshot = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);
  update public.case_outcomes
     set reason = null, metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);
  update public.case_financial_entries
     set metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);
  update public.case_exceptions
     set detail = null, context = '{"privacy_state":"erased"}'::jsonb,
         resolution = null
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);
  update public.case_clarification_requests
     set target_name = null, request_summary = '[redacted by data subject erasure]',
         response_summary = null
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);
  update public.accountability_events
     set description = null, metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and claim_id = any(v_case_ids);
  update public.agreement_rule_evaluations
     set evaluation_summary = null, result = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and claim_id = any(v_case_ids);
  update public.rule_evaluations
     set identity_id = null, source_ticket_id = null,
         matched_conditions = '{"privacy_state":"erased"}'::jsonb,
         all_rules_evaluated = '[]'::jsonb, justification_summary = null,
         rule_snapshot = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and claim_id = any(v_case_ids);

  update public.evidence_items
     set title = null, summary = null, raw_payload = null, external_url = null,
         proves = null, source_url = null, storage_path = null,
         structured_value = '{"privacy_state":"erased"}'::jsonb,
         source_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and id = any(v_evidence_ids);
  update public.claim_evidence
     set storage_path = null, metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and claim_id = any(v_case_ids);
  update public.integration_evidence_items
     set title = '[redacted by data subject erasure]', summary = null,
         value = '{"privacy_state":"erased"}'::jsonb, raw_reference = null
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);
  update public.evidence_packages
     set pdf_storage_path = null, narrative_summary = null,
         signal_snapshot = '[]'::jsonb, ce3_qualifying_signals = '[]'::jsonb,
         ce3_prior_transactions = '[]'::jsonb, merchant_notes = null
   where merchant_id = p_merchant_id
     and (customer_profile_id = any(v_source_customer_ids)
       or generated_for_order_id = any(v_order_ids));
  delete from public.profile_view_tokens
   where merchant_id = p_merchant_id and profile_id = any(v_source_customer_ids);
  delete from public.evidence_download_tokens
   where merchant_id = p_merchant_id and evidence_id = any(v_evidence_ids);

  update public.loss_sources
     set evidence_summary = null, accountable_party_name = null
   where merchant_id = p_merchant_id and claim_id = any(v_case_ids);
  update public.loss_cases
     set customer_identity_id = null, counterparty_name = null,
         source_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and id = any(v_loss_ids);
  update public.loss_case_events
     set metadata_json = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and loss_case_id = any(v_loss_ids);
  update public.loss_case_evidence
     set source_thread_id = null, source_url = null,
         value_json = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and loss_case_id = any(v_loss_ids);
  update public.external_correspondence
     set counterparty_name = null, source_thread_id = null, source_url = null,
         subject = null, attachment_hashes = '{}', extracted_facts_json = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and loss_case_id = any(v_loss_ids);
  update public.external_clarification_requests
     set counterparty_name = null, recipient_or_endpoint = null, subject = null,
         source_message_id = null, source_thread_id = null
   where merchant_id = p_merchant_id and loss_case_id = any(v_loss_ids);

  update public.recovery_cases
     set rejection_reason = null, calculation_reason = '{}', excluded_costs = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and id = any(v_recovery_ids);
  update public.recovery_case_events
     set note = null, metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and recovery_case_id = any(v_recovery_ids);
  update public.recovery_tasks
     set owner_name = null, owner_email = null, external_reference = null, notes = null
   where merchant_id = p_merchant_id and claim_id = any(v_case_ids);
  update public.work_tasks
     set title = 'Privacy-redacted task', description = null, blocking_reason = null,
         completion_outcome = '{"privacy_state":"erased"}'::jsonb,
         source_metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id
     and (support_payout_case_id = any(v_case_ids) or loss_case_id = any(v_loss_ids)
       or recovery_case_id = any(v_recovery_ids));
  update public.connector_action_runs
     set payload = '{"privacy_state":"erased"}'::jsonb,
         result = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids);
  update public.context_credit_events
     set ticket_ref = null, order_ref = null, customer_ref = null,
         reason = null, metadata = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id and claim_id = any(v_case_ids);
  update public.notifications
     set title = 'Case activity updated', body = null
   where merchant_id = p_merchant_id and domain_event_id in (
     select id from public.domain_events
      where merchant_id = p_merchant_id and aggregate_id = any(v_case_ids)
   );

  update public.sync_jobs
     set label = null, storage_path = null, column_map = null,
         error_log = '[]'::jsonb, cursor = null, hidden = true
   where merchant_id = p_merchant_id and id = any(v_job_ids);
  update public.sync_job_chunks
     set last_error = null
   where job_id = any(v_job_ids);

  update public.pack_confirmations
     set confirmed_by = null, photo_url = null
   where merchant_id = p_merchant_id
     and order_id in (
       select coalesce(order_number, external_id) from public.source_orders
        where merchant_id = p_merchant_id and id = any(v_order_ids)
     );

  update public.domain_events
     set payload = '{"privacy_state":"erased"}'::jsonb
   where merchant_id = p_merchant_id
     and (
       ingestion_event_id = any(v_ingestion_ids)
       or aggregate_id = any(
         v_source_customer_ids || v_order_ids || v_ticket_ids || v_case_ids || v_loss_ids || v_recovery_ids
       )
     );

  update public.merchant_customers
     set identity_id = null, display_name = null, email = null,
         raw_metadata = '{"privacy_state":"erased"}'::jsonb,
         matcher_version = 'erased-v1', last_resolved_at = null,
         erased_at = coalesce(erased_at, v_now), erasure_receipt_id = v_receipt_id
   where merchant_id = p_merchant_id and id = v_merchant_customer_id;

  -- Remove a now-orphaned global pseudonymous identity only when no merchant
  -- or case still references it. Shared identities remain intact for the other
  -- merchant; this erasure only severs the requesting merchant's links.
  delete from public.identities i
   where i.id = any(v_identity_ids)
     and not exists (select 1 from public.merchant_customers mc where mc.identity_id = i.id)
     and not exists (select 1 from public.support_payout_cases c where c.identity_id = i.id)
     and not exists (select 1 from public.merchant_identity_state s where s.identity_id = i.id);

  v_counts := jsonb_build_object(
    'source_customers', cardinality(v_source_customer_ids),
    'orders_preserved', cardinality(v_order_ids),
    'tickets_preserved', cardinality(v_ticket_ids),
    'cases_preserved', cardinality(v_case_ids),
    'evidence_records_redacted', cardinality(v_evidence_ids),
    'ingestion_payloads_redacted', cardinality(v_ingestion_ids),
    'financial_entries_preserved', (
      select count(*) from public.case_financial_entries
       where merchant_id = p_merchant_id and support_payout_case_id = any(v_case_ids)
    ),
    'audit_events_preserved', (
      select count(*) from public.domain_events
       where merchant_id = p_merchant_id
         and aggregate_id = any(v_case_ids || v_order_ids || v_ticket_ids)
    ),
    'storage_objects_queued', jsonb_array_length(v_storage_paths)
  );

  insert into public.data_subject_erasure_receipts (
    id, merchant_id, subject_reference, merchant_customer_reference,
    requested_by_user_reference, idempotency_key, scope_counts, effective_at
  ) values (
    v_receipt_id, p_merchant_id, p_subject_id, v_merchant_customer_id,
    p_actor_user_id, p_idempotency_key, v_counts, v_now
  );

  insert into public.privacy_storage_cleanup_jobs (
    merchant_id, erasure_receipt_id, bucket, object_path
  )
  select p_merchant_id, v_receipt_id, path.bucket, path.object_path
    from jsonb_to_recordset(v_storage_paths) as path(bucket text, object_path text)
  on conflict (erasure_receipt_id, bucket, object_path) do nothing;

  return jsonb_build_object(
    'receipt_id', v_receipt_id,
    'subject_reference', p_subject_id,
    'merchant_customer_reference', v_merchant_customer_id,
    'counts', v_counts,
    'replayed', false
  );
end;
$function$;
CREATE FUNCTION public.erase_release1_merchant_data_subject(p_merchant_id uuid, p_subject_id uuid, p_actor_user_id uuid, p_idempotency_key text, p_effective_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_result jsonb;
  v_release1_counts jsonb;
begin
  v_result := public.erase_merchant_data_subject(
    p_merchant_id,
    p_subject_id,
    p_actor_user_id,
    p_idempotency_key,
    p_effective_at
  );
  v_release1_counts := public.redact_release1_investigation_subject(
    p_merchant_id,
    p_subject_id,
    (v_result ->> 'receipt_id')::uuid
  );
  return jsonb_set(
    v_result,
    '{counts}',
    coalesce(v_result -> 'counts', '{}'::jsonb) || v_release1_counts,
    true
  );
end;
$function$;
REVOKE ALL ON FUNCTION public.fail_domain_event_delivery(uuid, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.fail_domain_event_delivery(uuid, text, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.fail_domain_event_delivery(uuid, text, integer) FROM service_role;
CREATE FUNCTION public.fail_privacy_storage_cleanup_job(p_job_id uuid, p_worker_id text, p_error text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with failed as (
    update public.privacy_storage_cleanup_jobs
       set status = case when attempts >= max_attempts then 'dead_letter' else 'failed' end,
           last_error = left(coalesce(p_error, 'storage cleanup failed'), 1000),
           next_attempt_at = now() + make_interval(secs => least(3600, greatest(5, attempts * attempts * 5))),
           leased_by = null, leased_until = null
     where id = p_job_id and status = 'processing' and leased_by = p_worker_id
    returning 1
  ) select exists(select 1 from failed);
$function$;
REVOKE ALL ON FUNCTION public.fail_processing_job_chunk(uuid, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.fail_processing_job_chunk(uuid, integer, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.fail_processing_job_chunk(uuid, integer, text) FROM service_role;
CREATE FUNCTION public.finalize_due_prevention_observations(p_limit integer DEFAULT 500, p_now timestamp with time zone DEFAULT now())
 RETURNS TABLE(confirmed integer, cancelled integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_observation public.case_prevention_observations;
  v_event public.domain_events;
  v_confirmed integer := 0;
  v_cancelled integer := 0;
begin
  for v_observation in
    select *
    from public.case_prevention_observations
    where status = 'pending' and eligible_at <= p_now
    order by eligible_at, id
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 500), 5000))
  loop
    if exists (
      select 1
      from public.case_financial_entries e
      where e.merchant_id = v_observation.merchant_id
        and e.support_payout_case_id = v_observation.support_payout_case_id
        and e.currency = v_observation.currency
        and e.state = 'paid'
        and e.reverses_entry_id is null
        and e.effective_at >= v_observation.decision_at
    ) or exists (
      select 1
      from public.case_outcomes o
      where o.merchant_id = v_observation.merchant_id
        and o.support_payout_case_id = v_observation.support_payout_case_id
        and o.currency = v_observation.currency
        and o.effective_at >= v_observation.decision_at
        and o.reverses_outcome_id is null
        and o.metadata ->> 'action' in (
          'refund', 'partial_refund', 'full_refund', 'reship',
          'replacement', 'store_credit', 'discount'
        )
        and not exists (
          select 1
          from public.case_outcomes reversal
          where reversal.merchant_id = o.merchant_id
            and reversal.reverses_outcome_id = o.id
        )
    ) then
      update public.case_prevention_observations
      set status = 'cancelled', cancelled_at = p_now,
          cancellation_reason = 'later_payout_observed', updated_at = p_now
      where id = v_observation.id;
      v_cancelled := v_cancelled + 1;
    else
      select * into v_event
      from public.record_domain_event(
        v_observation.merchant_id,
        'case.prevention_confirmed',
        'case',
        v_observation.support_payout_case_id,
        'prevention-observation:' || v_observation.id::text,
        jsonb_build_object(
          'observation_id', v_observation.id,
          'decision_id', v_observation.decision_id,
          'amount_minor', v_observation.exposure_minor,
          'currency', v_observation.currency,
          'decision_at', v_observation.decision_at,
          'eligible_at', v_observation.eligible_at,
          'policy_version', v_observation.policy_version,
          'window_basis', v_observation.window_basis
        ),
        null, null, null, 'system', null, p_now, null, null,
        array['financialProjection', 'caseProjection', 'notificationProjection', 'auditTimelineProjection']
      );
      update public.case_prevention_observations
      set status = 'confirmed', confirmed_at = p_now,
          domain_event_id = v_event.id, updated_at = p_now
      where id = v_observation.id;
      v_confirmed := v_confirmed + 1;
    end if;
  end loop;
  return query select v_confirmed, v_cancelled;
end;
$function$;
CREATE FUNCTION public.flag_aged_payout_case(p_merchant_id uuid, p_case_id uuid, p_cutoff timestamp with time zone, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_case public.support_payout_cases;
  v_event public.domain_events;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'aged_case_idempotency_key_required' using errcode = '22023';
  end if;

  select * into v_event
  from public.domain_events
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('flagged', true, 'domain_event_id', v_event.id, 'replayed', true);
  end if;

  select * into v_case
  from public.support_payout_cases
  where merchant_id = p_merchant_id and id = p_case_id
  for update;
  if not found or v_case.status <> 'pending' or v_case.updated_at >= p_cutoff then
    return jsonb_build_object('flagged', false, 'replayed', false);
  end if;

  insert into public.case_exceptions (
    merchant_id, support_payout_case_id, exception_type, confidence, status,
    title, detail, context, subject_entity_type, subject_entity_id,
    source_system, dedup_key
  ) values (
    p_merchant_id, p_case_id, 'other', 'probable', 'open',
    'Pending case needs attention',
    'This case has remained pending beyond the configured attention threshold. Its business lifecycle was not changed.',
    jsonb_build_object('attention_state', 'overdue', 'cutoff', p_cutoff),
    'case', p_case_id::text, 'system_attention_job',
    'aged-pending-case:' || p_case_id::text
  )
  on conflict (merchant_id, dedup_key) do update
  set
    status = 'open',
    detail = excluded.detail,
    context = excluded.context,
    updated_at = now();

  select * into v_event
  from public.record_domain_event(
    p_merchant_id,
    'case.attention_overdue',
    'case',
    p_case_id,
    p_idempotency_key,
    jsonb_build_object(
      'case_id', p_case_id,
      'status', v_case.status,
      'attention_state', 'overdue',
      'cutoff', p_cutoff
    ),
    null, null, null, 'system', null, now(), null, null,
    array['caseProjection', 'notificationProjection', 'auditTimelineProjection']
  );

  insert into public.claim_events (
    claim_id, merchant_id, event_type, from_status, to_status,
    note, metadata
  ) values (
    p_case_id, p_merchant_id, 'case_attention_overdue',
    v_case.status, v_case.status,
    'Pending case needs attention.',
    jsonb_build_object(
      'attention_state', 'overdue',
      'cutoff', p_cutoff,
      'domain_event_id', v_event.id,
      'idempotency_key', p_idempotency_key
    )
  );

  return jsonb_build_object('flagged', true, 'domain_event_id', v_event.id, 'replayed', false);
end;
$function$;
CREATE FUNCTION public.forbid_account_deletion_receipt_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception 'account_deletion_audit_receipts is append-only (% not allowed)', tg_op;
end;
$function$;
CREATE FUNCTION public.forbid_data_subject_erasure_receipt_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_privacy_receipt_purge', true), '') = 'on' then
    return old;
  end if;
  raise exception 'data_subject_erasure_receipts is append-only (% not allowed)', tg_op;
end;
$function$;
CREATE OR REPLACE FUNCTION public.forbid_domain_event_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_domain_event_purge', true), '') = 'on' then
    return old;
  end if;
  if tg_op = 'UPDATE'
     and coalesce(current_setting('app.allow_subject_erasure', true), '') = 'on'
     and (to_jsonb(new) - 'payload') = (to_jsonb(old) - 'payload')
     and new.payload = '{"privacy_state":"erased"}'::jsonb then
    return new;
  end if;
  raise exception 'domain_events is append-only (% not allowed)', tg_op;
end;
$function$;
CREATE OR REPLACE FUNCTION public.forbid_financial_entry_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_financial_purge', true), '') = 'on' then
    return old;
  end if;
  if tg_op = 'UPDATE'
     and coalesce(current_setting('app.allow_subject_erasure', true), '') = 'on'
     and (to_jsonb(new) - 'metadata') = (to_jsonb(old) - 'metadata')
     and new.metadata = '{"privacy_state":"erased"}'::jsonb then
    return new;
  end if;
  raise exception 'case_financial_entries is append-only (% not allowed)', tg_op;
end;
$function$;
CREATE OR REPLACE FUNCTION public.forbid_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_history_purge', true), '') = 'on' then
    return old;
  end if;
  if tg_op = 'UPDATE'
     and coalesce(current_setting('app.allow_subject_erasure', true), '') = 'on' then
    if tg_table_name = 'case_comment_events'
       and (to_jsonb(new) - 'body_snapshot') = (to_jsonb(old) - 'body_snapshot') then
      return new;
    end if;
    if tg_table_name = 'claim_events'
       and (to_jsonb(new) - array['note','metadata'])
         = (to_jsonb(old) - array['note','metadata']) then
      return new;
    end if;
    if tg_table_name = 'loss_case_events'
       and (to_jsonb(new) - 'metadata_json') = (to_jsonb(old) - 'metadata_json') then
      return new;
    end if;
    if tg_table_name = 'recovery_case_events'
       and (to_jsonb(new) - array['note','metadata'])
         = (to_jsonb(old) - array['note','metadata']) then
      return new;
    end if;
  end if;
  raise exception '% is append-only', tg_table_name;
end;
$function$;
CREATE OR REPLACE FUNCTION public.forbid_phase7_history_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_history_purge', true), '') = 'on' then
    return old;
  end if;
  if tg_op = 'UPDATE'
     and coalesce(current_setting('app.allow_subject_erasure', true), '') = 'on' then
    if tg_table_name = 'case_decisions'
       and (to_jsonb(new) - array['reason','rule_snapshot','recommendation_snapshot'])
         = (to_jsonb(old) - array['reason','rule_snapshot','recommendation_snapshot']) then
      return new;
    end if;
    if tg_table_name = 'case_outcomes'
       and (to_jsonb(new) - array['reason','metadata'])
         = (to_jsonb(old) - array['reason','metadata']) then
      return new;
    end if;
  end if;
  raise exception '% is append-only (% not allowed)', tg_table_name, tg_op;
end;
$function$;
CREATE FUNCTION public.forbid_user_action_log_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- GDPR/account deletion may remove the parent merchant and its audit rows in
  -- one cascading transaction.  Direct history rewrites remain forbidden.
  if tg_op = 'DELETE'
     and (
       coalesce(current_setting('app.allow_audit_purge', true), '') = 'on'
       or coalesce(current_setting('app.allow_domain_event_purge', true), '') = 'on'
       or not exists (select 1 from public.merchants where id = old.merchant_id)
     ) then
    return old;
  end if;
  raise exception 'user_action_log is append-only (% not allowed)', tg_op;
end;
$function$;
REVOKE ALL ON FUNCTION public.generate_evidence_reference() FROM anon;
REVOKE ALL ON FUNCTION public.generate_evidence_reference() FROM authenticated;
REVOKE ALL ON FUNCTION public.generate_evidence_reference() FROM service_role;
REVOKE ALL ON FUNCTION public.get_automation_analytics(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM anon;
REVOKE ALL ON FUNCTION public.get_automation_analytics(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM authenticated;
REVOKE ALL ON FUNCTION public.get_automation_analytics(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM service_role;
REVOKE ALL ON FUNCTION public.get_evidence_analytics(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM anon;
REVOKE ALL ON FUNCTION public.get_evidence_analytics(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM authenticated;
REVOKE ALL ON FUNCTION public.get_evidence_analytics(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM service_role;
REVOKE ALL ON FUNCTION public.get_financial_analytics_records(uuid, uuid, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone, integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.get_financial_analytics_records(uuid, uuid, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone, integer, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.get_financial_analytics_records(uuid, uuid, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone, integer, integer) FROM service_role;
REVOKE ALL ON FUNCTION public.get_financial_analytics(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM anon;
REVOKE ALL ON FUNCTION public.get_financial_analytics(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM authenticated;
REVOKE ALL ON FUNCTION public.get_financial_analytics(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM service_role;
CREATE FUNCTION public.get_financial_report_records(p_merchant_id uuid, p_cutoff timestamp with time zone DEFAULT NULL::timestamp with time zone, p_currency text DEFAULT NULL::text, p_metric text DEFAULT 'exposed'::text, p_category text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(support_payout_case_id uuid, case_status text, claim_type text, submitted_at timestamp with time zone, updated_at timestamp with time zone, currency text, amount_minor bigint, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_currency text := upper(trim(p_currency));
begin
  if p_merchant_id is null then
    raise exception 'financial_report_merchant_required' using errcode = '22023';
  end if;
  if p_metric not in (
    'requested', 'exposed', 'approved', 'paid', 'estimated_loss',
    'prevented', 'confirmed_loss', 'recoverable', 'recovered',
    'outstanding', 'written_off', 'final_net_loss'
  ) then
    raise exception 'financial_report_metric_invalid' using errcode = '22023';
  end if;
  if p_currency is not null and v_currency !~ '^[A-Z]{3}$' then
    raise exception 'financial_report_currency_invalid' using errcode = '22023';
  end if;
  if p_category is not null and p_category not in (
    'delivery_loss', 'chargeback_or_payment_dispute',
    'fulfilment_or_warehouse_error', 'supplier_or_vendor_issue'
  ) then
    raise exception 'financial_report_category_invalid' using errcode = '22023';
  end if;

  return query
  with eligible as (
    select
      summary.support_payout_case_id,
      payout_case.status::text as case_status,
      payout_case.claim_type::text as claim_type,
      coalesce(payout_case.submitted_at, payout_case.created_at) as submitted_at,
      summary.updated_at,
      summary.currency::text as currency,
      case p_metric
        when 'requested' then summary.requested_minor
        when 'exposed' then summary.exposed_minor
        when 'approved' then summary.approved_minor
        when 'paid' then summary.paid_minor
        when 'estimated_loss' then summary.estimated_loss_minor
        when 'prevented' then summary.prevented_minor
        when 'confirmed_loss' then summary.confirmed_loss_minor
        when 'recoverable' then summary.recoverable_minor
        when 'recovered' then summary.recovered_minor
        when 'outstanding' then greatest(
          summary.recoverable_minor - summary.recovered_minor - summary.written_off_minor,
          0
        )
        when 'written_off' then summary.written_off_minor
        when 'final_net_loss' then greatest(
          summary.confirmed_loss_minor - summary.recovered_minor,
          0
        )
      end::bigint as amount_minor
    from public.case_financial_summaries summary
    join public.support_payout_cases payout_case
      on payout_case.id = summary.support_payout_case_id
     and payout_case.merchant_id = summary.merchant_id
    where summary.merchant_id = p_merchant_id
      and (
        p_cutoff is null
        or coalesce(payout_case.submitted_at, payout_case.created_at) >= p_cutoff
      )
      and (p_currency is null or summary.currency = v_currency)
      and (
        (p_metric = 'outstanding' and summary.known_states @> array['recoverable']::text[])
        or (
          p_metric = 'final_net_loss'
          and summary.known_states @> array['confirmed_loss']::text[]
        )
        or (
          p_metric not in ('outstanding', 'final_net_loss')
          and summary.known_states @> array[p_metric]::text[]
        )
      )
      and (
        p_category is null
        or (
          p_category = 'delivery_loss'
          and coalesce(
            nullif(trim(payout_case.reason_normalized), ''),
            payout_case.claim_type::text
          ) in ('item_not_received', 'missing_parcel')
        )
        or (
          p_category = 'chargeback_or_payment_dispute'
          and coalesce(
            nullif(trim(payout_case.reason_normalized), ''),
            payout_case.claim_type::text
          ) = 'chargeback'
        )
        or (
          p_category = 'fulfilment_or_warehouse_error'
          and coalesce(
            nullif(trim(payout_case.reason_normalized), ''),
            payout_case.claim_type::text
          ) in ('missing_item', 'wrong_item', 'damaged', 'not_as_described')
        )
        or (
          p_category = 'supplier_or_vendor_issue'
          and coalesce(
            nullif(trim(payout_case.reason_normalized), ''),
            payout_case.claim_type::text,
            'unknown'
          ) not in (
            'item_not_received', 'missing_parcel', 'chargeback',
            'missing_item', 'wrong_item', 'damaged', 'not_as_described'
          )
        )
      )
  )
  select
    eligible.support_payout_case_id,
    eligible.case_status,
    eligible.claim_type,
    eligible.submitted_at,
    eligible.updated_at,
    eligible.currency,
    eligible.amount_minor,
    count(*) over()::bigint as total_count
  from eligible
  order by eligible.submitted_at desc nulls last,
           eligible.updated_at desc,
           eligible.support_payout_case_id
  limit greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$function$;
REVOKE ALL ON FUNCTION public.get_recovery_analytics(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM anon;
REVOKE ALL ON FUNCTION public.get_recovery_analytics(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM authenticated;
REVOKE ALL ON FUNCTION public.get_recovery_analytics(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM service_role;
REVOKE ALL ON FUNCTION public.get_source_health_analytics(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM anon;
REVOKE ALL ON FUNCTION public.get_source_health_analytics(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM authenticated;
REVOKE ALL ON FUNCTION public.get_source_health_analytics(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM service_role;
REVOKE ALL ON FUNCTION public.get_work_analytics(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM anon;
REVOKE ALL ON FUNCTION public.get_work_analytics(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM authenticated;
REVOKE ALL ON FUNCTION public.get_work_analytics(uuid, uuid, text, timestamp with time zone, timestamp with time zone, text, text, text, timestamp with time zone) FROM service_role;
REVOKE ALL ON FUNCTION public.increment_api_key_minute_count(uuid, bigint) FROM anon;
REVOKE ALL ON FUNCTION public.increment_api_key_minute_count(uuid, bigint) FROM authenticated;
REVOKE ALL ON FUNCTION public.increment_api_key_minute_count(uuid, bigint) FROM service_role;
REVOKE ALL ON FUNCTION public.increment_job_progress(uuid, integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.increment_job_progress(uuid, integer, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.increment_job_progress(uuid, integer, integer) FROM service_role;
REVOKE ALL ON FUNCTION public.increment_rate_limit(text, timestamp with time zone) FROM anon;
REVOKE ALL ON FUNCTION public.increment_rate_limit(text, timestamp with time zone) FROM authenticated;
REVOKE ALL ON FUNCTION public.increment_rate_limit(text, timestamp with time zone) FROM service_role;
REVOKE ALL ON FUNCTION public.ingest_identity_observations(uuid, jsonb, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.ingest_identity_observations(uuid, jsonb, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.ingest_identity_observations(uuid, jsonb, jsonb) FROM service_role;
CREATE FUNCTION public.investigation_case_status(p_target_type text)
 RETURNS public.claim_status
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case p_target_type
    when 'carrier' then 'awaiting_carrier_response'::public.claim_status
    when '3pl' then 'awaiting_3pl_response'::public.claim_status
    when 'warehouse' then 'awaiting_3pl_response'::public.claim_status
    when 'supplier' then 'awaiting_supplier_response'::public.claim_status
    when 'customer' then 'awaiting_customer_evidence'::public.claim_status
    else 'manual_review'::public.claim_status
  end;
$function$;
REVOKE ALL ON FUNCTION public.is_merchant_member(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_merchant_member(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.is_merchant_member(uuid) FROM service_role;
REVOKE ALL ON FUNCTION public.lookup_network_identity(uuid, jsonb, inet) FROM anon;
REVOKE ALL ON FUNCTION public.lookup_network_identity(uuid, jsonb, inet) FROM authenticated;
REVOKE ALL ON FUNCTION public.lookup_network_identity(uuid, jsonb, inet) FROM service_role;
REVOKE ALL ON FUNCTION public.merchant_role(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.merchant_role(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.merchant_role(uuid) FROM service_role;
REVOKE ALL ON FUNCTION public.next_pending_processing_chunk_index(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.next_pending_processing_chunk_index(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.next_pending_processing_chunk_index(uuid) FROM service_role;
REVOKE ALL ON FUNCTION public.protect_case_outcome_history() FROM anon;
REVOKE ALL ON FUNCTION public.protect_case_outcome_history() FROM authenticated;
REVOKE ALL ON FUNCTION public.protect_case_outcome_history() FROM service_role;
CREATE FUNCTION public.protect_confirmed_case_responsibility()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if old.responsibility_confirmation_state <> 'unconfirmed'
     and coalesce(
       current_setting('app.allow_responsibility_projection_write', true),
       ''
     ) <> 'on'
     and (
       new.loss_attribution is distinct from old.loss_attribution
       or new.attribution_confidence is distinct from old.attribution_confidence
       or new.recoverability is distinct from old.recoverability
       or new.recovery_owner is distinct from old.recovery_owner
       or new.recovery_required_evidence is distinct from old.recovery_required_evidence
       or new.recovery_next_action is distinct from old.recovery_next_action
       or new.responsibility_confirmation_state is distinct from old.responsibility_confirmation_state
       or new.responsibility_confirmed_at is distinct from old.responsibility_confirmed_at
       or new.responsibility_confirmed_by is distinct from old.responsibility_confirmed_by
       or new.responsibility_event_id is distinct from old.responsibility_event_id
     ) then
    raise exception 'confirmed_case_responsibility_is_protected'
      using errcode = '22023';
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION public.protect_partner_recovery_rule_history() FROM anon;
REVOKE ALL ON FUNCTION public.protect_partner_recovery_rule_history() FROM authenticated;
REVOKE ALL ON FUNCTION public.protect_partner_recovery_rule_history() FROM service_role;
REVOKE ALL ON FUNCTION public.protect_published_rule_version_payload() FROM anon;
REVOKE ALL ON FUNCTION public.protect_published_rule_version_payload() FROM authenticated;
REVOKE ALL ON FUNCTION public.protect_published_rule_version_payload() FROM service_role;
REVOKE ALL ON FUNCTION public.protect_published_workflow_payload() FROM anon;
REVOKE ALL ON FUNCTION public.protect_published_workflow_payload() FROM authenticated;
REVOKE ALL ON FUNCTION public.protect_published_workflow_payload() FROM service_role;
REVOKE ALL ON FUNCTION public.protect_reconciliation_snapshot_history() FROM anon;
REVOKE ALL ON FUNCTION public.protect_reconciliation_snapshot_history() FROM authenticated;
REVOKE ALL ON FUNCTION public.protect_reconciliation_snapshot_history() FROM service_role;
REVOKE ALL ON FUNCTION public.protect_recovery_claim_history() FROM anon;
REVOKE ALL ON FUNCTION public.protect_recovery_claim_history() FROM authenticated;
REVOKE ALL ON FUNCTION public.protect_recovery_claim_history() FROM service_role;
CREATE FUNCTION public.protect_sent_case_investigation_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(current_setting('app.allow_subject_erasure', true), '') = 'on' then
    return new;
  end if;
  if old.status <> 'draft' and (
    new.target_type is distinct from old.target_type
    or new.target_name is distinct from old.target_name
    or new.partner_id is distinct from old.partner_id
    or new.evidence_gap is distinct from old.evidence_gap
    or new.requested_evidence is distinct from old.requested_evidence
    or new.subject is distinct from old.subject
    or new.request_body is distinct from old.request_body
    or new.recipient is distinct from old.recipient
    or new.source_channel is distinct from old.source_channel
  ) then
    raise exception 'sent_investigation_snapshot_is_immutable' using errcode = '22023';
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION public.publish_merchant_rule_version(uuid, uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.publish_merchant_rule_version(uuid, uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.publish_merchant_rule_version(uuid, uuid, uuid) FROM service_role;
REVOKE ALL ON FUNCTION public.publish_workflow_definition(uuid, uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.publish_workflow_definition(uuid, uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.publish_workflow_definition(uuid, uuid, uuid) FROM service_role;
CREATE FUNCTION public.purge_expired_ingestion_payloads(p_limit integer DEFAULT 500)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ids uuid[] := '{}'::uuid[];
  v_purged integer := 0;
  v_errors_deleted integer := 0;
  v_external_refs_blocked integer := 0;
begin
  select coalesce(array_agg(id), '{}'::uuid[])
    into v_ids
    from (
      select id
        from public.ingestion_events
       where retention_deadline is not null
         and retention_deadline <= now()
         and payload_purged_at is null
         and payload_ref is null
         and status in ('normalized','dead_letter','ignored')
       order by retention_deadline, id
       for update skip locked
       limit least(greatest(p_limit, 1), 5000)
    ) due;

  delete from public.ingestion_field_errors where ingestion_event_id = any(v_ids);
  get diagnostics v_errors_deleted = row_count;

  update public.ingestion_events
     set payload = null, last_error = null, payload_purged_at = now()
   where id = any(v_ids);
  get diagnostics v_purged = row_count;

  select count(*) into v_external_refs_blocked
    from public.ingestion_events
   where retention_deadline is not null
     and retention_deadline <= now()
     and payload_purged_at is null
     and payload_ref is not null
     and status in ('normalized','dead_letter','ignored');

  return jsonb_build_object(
    'payloads_purged', v_purged,
    'field_errors_deleted', v_errors_deleted,
    'external_payload_refs_blocked', v_external_refs_blocked
  );
end;
$function$;
CREATE FUNCTION public.purge_merchant_audit_projection(p_merchant_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform set_config('app.allow_audit_purge', 'on', true);
  delete from public.user_action_log where merchant_id = p_merchant_id;
end;
$function$;
CREATE FUNCTION public.purge_merchant_privacy_records(p_merchant_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform set_config('app.allow_privacy_receipt_purge', 'on', true);
  delete from public.data_subject_erasure_receipts where merchant_id = p_merchant_id;
end;
$function$;
REVOKE ALL ON FUNCTION public.purge_merchant_reconciliation_history(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.purge_merchant_reconciliation_history(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.purge_merchant_reconciliation_history(uuid) FROM service_role;
REVOKE ALL ON FUNCTION public.purge_merchant_source_agnostic(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.purge_merchant_source_agnostic(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.purge_merchant_source_agnostic(uuid) FROM service_role;
CREATE FUNCTION public.recompute_case_financial_summary(p_merchant_id uuid, p_case_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_rows integer := 0;
begin
  insert into public.case_financial_summaries (
    merchant_id,
    support_payout_case_id,
    currency,
    requested_minor,
    exposed_minor,
    approved_minor,
    paid_minor,
    estimated_loss_minor,
    confirmed_loss_minor,
    recoverable_minor,
    recovered_minor,
    prevented_minor,
    written_off_minor,
    known_states,
    last_event_id,
    updated_at
  )
  select
    e.merchant_id,
    e.support_payout_case_id,
    e.currency,
    coalesce(sum(case when e.state = 'requested' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    coalesce(sum(case when e.state = 'exposed' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    coalesce(sum(case when e.state = 'approved' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    coalesce(sum(case when e.state = 'paid' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    coalesce(sum(case when e.state = 'estimated_loss' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    coalesce(sum(case when e.state = 'confirmed_loss' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    coalesce(sum(case when e.state = 'recoverable' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    coalesce(sum(case when e.state = 'recovered' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    coalesce(sum(case when e.state = 'prevented' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    coalesce(sum(case when e.state = 'written_off' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    array_agg(distinct e.state order by e.state),
    (array_agg(e.id order by e.effective_at desc, e.recorded_at desc, e.id desc))[1],
    now()
  from public.case_financial_entries e
  where e.merchant_id = p_merchant_id
    and e.support_payout_case_id = p_case_id
  group by e.merchant_id, e.support_payout_case_id, e.currency
  on conflict (merchant_id, support_payout_case_id, currency) do update
  set
    requested_minor = excluded.requested_minor,
    exposed_minor = excluded.exposed_minor,
    approved_minor = excluded.approved_minor,
    paid_minor = excluded.paid_minor,
    estimated_loss_minor = excluded.estimated_loss_minor,
    confirmed_loss_minor = excluded.confirmed_loss_minor,
    recoverable_minor = excluded.recoverable_minor,
    recovered_minor = excluded.recovered_minor,
    prevented_minor = excluded.prevented_minor,
    written_off_minor = excluded.written_off_minor,
    known_states = excluded.known_states,
    last_event_id = excluded.last_event_id,
    updated_at = excluded.updated_at;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$function$;
CREATE FUNCTION public.record_case_decision(p_merchant_id uuid, p_case_id uuid, p_expected_version bigint, p_decision text, p_action text, p_amount_minor bigint, p_currency text, p_reason text, p_actor_user_id uuid, p_recommendation_snapshot jsonb, p_followed_recommendation boolean, p_related_source_object jsonb, p_idempotency_key text, p_reversal boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_case public.support_payout_cases;
  v_prior_decision public.case_decisions;
  v_existing_decision public.case_decisions;
  v_decision_id uuid := gen_random_uuid();
  v_outcome_id uuid;
  v_effective_at timestamptz := now();
  v_transition jsonb;
  v_currency text;
  v_observation_end timestamptz;
  v_request jsonb;
  v_fingerprint text;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'case_decision_idempotency_key_required' using errcode = '22023';
  end if;
  select * into v_existing_decision
  from public.case_decisions
  where merchant_id = p_merchant_id
    and idempotency_key = p_idempotency_key;
  if found then
    if v_existing_decision.recommendation_snapshot ->> 'request_fingerprint' is distinct from encode(
      extensions.digest(convert_to(jsonb_build_object(
        'merchant_id', p_merchant_id, 'case_id', p_case_id,
        'expected_version', p_expected_version, 'decision', p_decision,
        'action', p_action, 'amount_minor', p_amount_minor,
        'currency', upper(p_currency), 'reason', p_reason,
        'actor_user_id', p_actor_user_id, 'recommendation_snapshot', coalesce(p_recommendation_snapshot, '{}'::jsonb),
        'followed_recommendation', p_followed_recommendation,
        'related_source_object', coalesce(p_related_source_object, '{}'::jsonb),
        'reversal', p_reversal
      )::text, 'UTF8'), 'sha256'), 'hex'
    ) then
      raise exception 'case_decision_idempotency_conflict' using errcode = '22023';
    end if;
    select id into v_outcome_id from public.claim_outcomes where claim_id = p_case_id;
    return jsonb_build_object(
      'decision_id', v_existing_decision.id,
      'outcome_id', v_outcome_id,
      'case_id', p_case_id,
      'replayed', true
    );
  end if;

  select * into v_case
  from public.support_payout_cases
  where merchant_id = p_merchant_id and id = p_case_id
  for update;
  if not found then raise exception 'case_not_found' using errcode = 'P0002'; end if;
  if v_case.state_version is distinct from p_expected_version then
    raise exception 'case_version_conflict' using errcode = '40001';
  end if;

  perform p_decision::public.claim_decision;
  if p_action is null or trim(p_action) = '' then
    raise exception 'case_decision_action_required' using errcode = '22023';
  end if;
  if p_action in ('approved', 'partial_refund', 'full_refund', 'refund', 'reship', 'replacement', 'denied', 'no_action')
    and (p_amount_minor is null or p_amount_minor < 0 or p_currency is null) then
    raise exception 'case_decision_amount_and_currency_required' using errcode = '22023';
  end if;
  if p_amount_minor is not null and p_amount_minor < 0 then
    raise exception 'case_decision_amount_must_be_nonnegative' using errcode = '22023';
  end if;
  if p_decision in ('denied', 'escalated', 'no_action') and coalesce(length(trim(p_reason)), 0) < 3 then
    raise exception 'case_decision_reason_required' using errcode = '22023';
  end if;
  if p_followed_recommendation is false and coalesce(length(trim(p_reason)), 0) < 3 then
    raise exception 'case_decision_override_reason_required' using errcode = '22023';
  end if;

  v_currency := case when p_amount_minor is null then null else upper(trim(p_currency)) end;
  if v_currency is not null and v_currency !~ '^[A-Z]{3}$' then
    raise exception 'case_decision_currency_invalid' using errcode = '22023';
  end if;

  select * into v_prior_decision
  from public.case_decisions
  where merchant_id = p_merchant_id
    and support_payout_case_id = p_case_id
  order by effective_at desc, recorded_at desc, id desc
  limit 1;
  if p_reversal and v_prior_decision.id is null then
    raise exception 'case_decision_reversal_requires_prior_decision' using errcode = '22023';
  end if;

  v_request := jsonb_build_object(
    'merchant_id', p_merchant_id, 'case_id', p_case_id,
    'expected_version', p_expected_version, 'decision', p_decision,
    'action', p_action, 'amount_minor', p_amount_minor,
    'currency', v_currency, 'reason', p_reason,
    'actor_user_id', p_actor_user_id, 'recommendation_snapshot', coalesce(p_recommendation_snapshot, '{}'::jsonb),
    'followed_recommendation', p_followed_recommendation,
    'related_source_object', coalesce(p_related_source_object, '{}'::jsonb),
    'reversal', p_reversal
  );
  v_fingerprint := encode(extensions.digest(convert_to(v_request::text, 'UTF8'), 'sha256'), 'hex');

  insert into public.case_decisions (
    id, merchant_id, support_payout_case_id, decision, action,
    amount_minor, currency, recommendation_snapshot, followed_recommendation,
    reason, actor_type, actor_user_id, effective_at,
    reverses_decision_id, supersedes_decision_id, idempotency_key
  ) values (
    v_decision_id, p_merchant_id, p_case_id, p_decision,
    p_action, p_amount_minor, v_currency,
    coalesce(p_recommendation_snapshot, '{}'::jsonb) || jsonb_build_object(
      'request_fingerprint', v_fingerprint,
      'related_source_object', coalesce(p_related_source_object, '{}'::jsonb)
    ),
    p_followed_recommendation, p_reason,
    case when p_actor_user_id is null then 'system' else 'user' end,
    p_actor_user_id, v_effective_at,
    case when p_reversal then v_prior_decision.id else null end,
    v_prior_decision.id,
    p_idempotency_key
  );

  insert into public.claim_outcomes (
    claim_id, decision, outcome, amount_refunded, amount_recovered,
    notes, decided_by, decided_at, updated_at,
    recommended_payout_action, followed_recommendation
  ) values (
    p_case_id, p_decision::public.claim_decision, 'pending',
    null, null, p_reason, p_actor_user_id, v_effective_at, v_effective_at,
    p_recommendation_snapshot ->> 'recommended_payout_action',
    p_followed_recommendation
  )
  on conflict (claim_id) do update
  set
    decision = excluded.decision,
    outcome = 'pending',
    amount_refunded = null,
    amount_recovered = null,
    notes = excluded.notes,
    decided_by = excluded.decided_by,
    decided_at = excluded.decided_at,
    updated_at = excluded.updated_at,
    recommended_payout_action = excluded.recommended_payout_action,
    followed_recommendation = excluded.followed_recommendation
  returning id into v_outcome_id;

  if p_reversal then
    update public.case_prevention_observations
    set status = 'cancelled', cancelled_at = now(),
        cancellation_reason = 'decision_reversed', updated_at = now()
    where merchant_id = p_merchant_id
      and decision_id = v_prior_decision.id
      and status = 'pending';
  end if;

  if p_action in ('denied', 'no_action') and coalesce(p_amount_minor, 0) > 0 then
    begin
      v_observation_end := nullif(p_related_source_object ->> 'observation_ends_at', '')::timestamptz;
    exception when invalid_datetime_format then
      raise exception 'case_decision_observation_end_invalid' using errcode = '22023';
    end;
    insert into public.case_prevention_observations (
      merchant_id, support_payout_case_id, decision_id, currency,
      exposure_minor, decision_at, eligible_at, window_basis
    ) values (
      p_merchant_id, p_case_id, v_decision_id, v_currency,
      p_amount_minor, v_effective_at,
      greatest(v_effective_at + interval '30 days', coalesce(v_observation_end, v_effective_at + interval '30 days')),
      case when v_observation_end is null then 'default_30_calendar_days' else 'later_source_window' end
    );
  end if;

  v_transition := public.transition_payout_case(
    p_merchant_id,
    p_case_id,
    p_expected_version,
    jsonb_build_object(
      'status', case when p_decision = 'escalated' then 'manual_review' else 'decision_recorded' end,
      'payout_decision_state', case when p_reversal then 'reversed' else 'decision_recorded' end
    ),
    p_reason,
    p_actor_user_id,
    'merchant_manual',
    'case.decision_recorded',
    jsonb_build_object(
      'decision_id', v_decision_id,
      'action', p_action,
      'amount_minor', p_amount_minor,
      'currency', v_currency,
      'reversal', p_reversal,
      'reverses_decision_id', case when p_reversal then v_prior_decision.id else null end,
      'related_source_object', coalesce(p_related_source_object, '{}'::jsonb)
    ),
    array['financialProjection', 'lossProjection', 'recoveryProjection', 'customerProjection', 'caseProjection', 'notificationProjection', 'auditTimelineProjection'],
    case when p_reversal then 'decision_reversed' else 'outcome_added' end,
    jsonb_build_object(
      'decision_id', v_decision_id,
      'compatibility_outcome_id', v_outcome_id,
      'previous_decision', v_prior_decision.decision,
      'new_decision', p_decision,
      'amount_minor', p_amount_minor,
      'currency', v_currency
    ),
    'case-decision:' || p_idempotency_key,
    false,
    p_reversal,
    false
  );

  return v_transition || jsonb_build_object(
    'decision_id', v_decision_id,
    'outcome_id', v_outcome_id,
    'replayed', false
  );
end;
$function$;
CREATE FUNCTION public.record_case_responsibility(p_merchant_id uuid, p_case_id uuid, p_expected_version bigint, p_loss_attribution text, p_attribution_confidence text, p_recovery_owner text, p_recoverability text, p_supporting_evidence_ids uuid[], p_conflicting_evidence_ids uuid[], p_rationale text, p_actor_user_id uuid, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_case public.support_payout_cases;
  v_prior_event public.domain_events;
  v_event public.domain_events;
  v_state text;
  v_is_correction boolean;
  v_result jsonb;
  v_evidence_ids uuid[];
begin
  if p_merchant_id is null or p_case_id is null or p_actor_user_id is null then
    raise exception 'responsibility_identifiers_required' using errcode = '22023';
  end if;
  if p_expected_version is null or p_expected_version < 1 then
    raise exception 'responsibility_expected_version_required' using errcode = '22023';
  end if;
  if p_idempotency_key is null
     or length(trim(p_idempotency_key)) < 8
     or length(p_idempotency_key) > 180 then
    raise exception 'responsibility_idempotency_key_invalid' using errcode = '22023';
  end if;
  if p_loss_attribution not in (
    'customer_claim', 'carrier_loss', 'carrier_damage',
    'delivery_confirmed_evidence', 'warehouse_mispick',
    'warehouse_missing_item', 'three_pl_late_dispatch', 'supplier_defect',
    'packaging_failure', 'merchant_policy', 'unknown', 'repeat_claimant',
    'policy_override'
  ) then
    raise exception 'responsibility_attribution_invalid' using errcode = '22023';
  end if;
  if p_attribution_confidence not in (
    'high', 'medium', 'low', 'needs_more_evidence'
  ) then
    raise exception 'responsibility_confidence_invalid' using errcode = '22023';
  end if;
  if p_recovery_owner not in (
    'carrier', 'three_pl', 'warehouse', 'supplier', 'merchant', 'unknown'
  ) then
    raise exception 'responsibility_owner_invalid' using errcode = '22023';
  end if;
  if p_recoverability not in (
    'recoverable', 'possibly_recoverable', 'not_recoverable',
    'needs_more_evidence', 'unknown'
  ) then
    raise exception 'responsibility_recoverability_invalid' using errcode = '22023';
  end if;

  select *
    into v_prior_event
  from public.domain_events
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key) || ':event';
  if found then
    if v_prior_event.aggregate_id is distinct from p_case_id
       or v_prior_event.event_type not in (
         'case.responsibility_confirmed', 'case.responsibility_corrected'
       ) then
      raise exception 'responsibility_idempotency_conflict' using errcode = '23505';
    end if;
    return coalesce(v_prior_event.payload -> 'result', '{}'::jsonb)
      || jsonb_build_object('domain_event_id', v_prior_event.id, 'replayed', true);
  end if;

  select *
    into v_case
  from public.support_payout_cases
  where id = p_case_id
    and merchant_id = p_merchant_id
  for update;
  if not found then
    raise exception 'case_not_found' using errcode = 'P0002';
  end if;

  select *
    into v_prior_event
  from public.domain_events
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key) || ':event';
  if found then
    if v_prior_event.aggregate_id is distinct from p_case_id
       or v_prior_event.event_type not in (
         'case.responsibility_confirmed', 'case.responsibility_corrected'
       ) then
      raise exception 'responsibility_idempotency_conflict' using errcode = '23505';
    end if;
    return coalesce(v_prior_event.payload -> 'result', '{}'::jsonb)
      || jsonb_build_object('domain_event_id', v_prior_event.id, 'replayed', true);
  end if;

  if v_case.state_version is distinct from p_expected_version then
    raise exception 'responsibility_version_conflict' using errcode = '40001';
  end if;

  v_evidence_ids := array(
    select distinct evidence_id
    from unnest(
      coalesce(p_supporting_evidence_ids, '{}'::uuid[])
      || coalesce(p_conflicting_evidence_ids, '{}'::uuid[])
    ) evidence_id
  );
  if exists (
    select 1
    from unnest(coalesce(p_supporting_evidence_ids, '{}'::uuid[])) supporting(id)
    join unnest(coalesce(p_conflicting_evidence_ids, '{}'::uuid[])) conflicting(id)
      using (id)
  ) then
    raise exception 'responsibility_evidence_cannot_support_and_conflict'
      using errcode = '22023';
  end if;
  if exists (
    select 1
    from unnest(v_evidence_ids) requested(id)
    left join public.evidence_items evidence
      on evidence.id = requested.id
     and evidence.merchant_id = p_merchant_id
     and evidence.claim_id = p_case_id
    where evidence.id is null
  ) then
    raise exception 'responsibility_evidence_not_found' using errcode = 'P0002';
  end if;

  v_is_correction :=
    v_case.responsibility_confirmation_state <> 'unconfirmed'
    or v_case.loss_attribution::text is distinct from p_loss_attribution
    or v_case.attribution_confidence::text is distinct from p_attribution_confidence
    or v_case.recovery_owner::text is distinct from p_recovery_owner
    or v_case.recoverability::text is distinct from p_recoverability;
  if v_is_correction and coalesce(length(trim(p_rationale)), 0) < 5 then
    raise exception 'responsibility_correction_rationale_required'
      using errcode = '22023';
  end if;
  if length(coalesce(p_rationale, '')) > 4000 then
    raise exception 'responsibility_rationale_too_long' using errcode = '22023';
  end if;
  v_state := case when v_is_correction then 'corrected' else 'confirmed' end;

  v_result := jsonb_build_object(
    'case_id', p_case_id,
    'state_version', p_expected_version + 1,
    'responsibility_confirmation_state', v_state,
    'loss_attribution', p_loss_attribution,
    'attribution_confidence', p_attribution_confidence,
    'recovery_owner', p_recovery_owner,
    'recoverability', p_recoverability,
    'supporting_evidence_ids', coalesce(p_supporting_evidence_ids, '{}'::uuid[]),
    'conflicting_evidence_ids', coalesce(p_conflicting_evidence_ids, '{}'::uuid[]),
    'rationale', nullif(trim(p_rationale), ''),
    'replayed', false
  );

  select *
    into v_event
  from public.record_domain_event(
    p_merchant_id,
    case
      when v_is_correction then 'case.responsibility_corrected'
      else 'case.responsibility_confirmed'
    end,
    'case',
    p_case_id,
    trim(p_idempotency_key) || ':event',
    jsonb_build_object(
      'case_id', p_case_id,
      'previous', jsonb_build_object(
        'responsibility_confirmation_state', v_case.responsibility_confirmation_state,
        'loss_attribution', v_case.loss_attribution,
        'attribution_confidence', v_case.attribution_confidence,
        'recovery_owner', v_case.recovery_owner,
        'recoverability', v_case.recoverability
      ),
      'result', v_result
    ),
    null, null, null, 'user', p_actor_user_id, now(), null, null,
    array[
      'caseProjection', 'notificationProjection',
      'workflowHandler', 'auditTimelineProjection'
    ]::text[]
  );

  perform set_config('app.allow_responsibility_projection_write', 'on', true);
  update public.support_payout_cases
  set
    loss_attribution = p_loss_attribution::public.loss_attribution,
    attribution_confidence = p_attribution_confidence::public.attribution_confidence,
    recovery_owner = p_recovery_owner::public.recovery_owner,
    recoverability = p_recoverability::public.recoverability,
    responsibility_confirmation_state = v_state,
    responsibility_confirmed_at = now(),
    responsibility_confirmed_by = p_actor_user_id,
    responsibility_event_id = v_event.id,
    state_version = state_version + 1,
    updated_at = now()
  where id = p_case_id
    and merchant_id = p_merchant_id;
  perform set_config('app.allow_responsibility_projection_write', '', true);

  insert into public.claim_events (
    claim_id, merchant_id, event_type, from_status, to_status,
    note, actor_user_id, metadata
  ) values (
    p_case_id, p_merchant_id,
    case
      when v_is_correction then 'responsibility_corrected'
      else 'responsibility_confirmed'
    end,
    v_case.status, v_case.status, nullif(trim(p_rationale), ''),
    p_actor_user_id,
    jsonb_build_object(
      'domain_event_id', v_event.id,
      'idempotency_key', trim(p_idempotency_key),
      'loss_attribution', p_loss_attribution,
      'attribution_confidence', p_attribution_confidence,
      'recovery_owner', p_recovery_owner,
      'recoverability', p_recoverability,
      'supporting_evidence_ids', coalesce(p_supporting_evidence_ids, '{}'::uuid[]),
      'conflicting_evidence_ids', coalesce(p_conflicting_evidence_ids, '{}'::uuid[])
    )
  );

  return v_result || jsonb_build_object('domain_event_id', v_event.id);
end;
$function$;
CREATE FUNCTION public.record_case_source_outcome(p_merchant_id uuid, p_case_id uuid, p_outcome_type text, p_action text, p_amount_minor bigint, p_confirmed_loss_minor bigint, p_currency text, p_reason text, p_source_record_id uuid, p_source_metadata jsonb, p_occurred_at timestamp with time zone, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_case public.support_payout_cases;
  v_prior public.case_outcomes;
  v_existing public.case_outcomes;
  v_outcome public.case_outcomes;
  v_latest_decision public.case_decisions;
  v_event public.domain_events;
  v_currency text := upper(trim(p_currency));
  v_is_reversal boolean := coalesce((p_source_metadata ->> 'reversal')::boolean, false);
  v_fingerprint text;
  v_payload jsonb;
  v_conflict_reason text;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'case_outcome_idempotency_key_required' using errcode = '22023';
  end if;
  if p_action is null or trim(p_action) = '' or p_outcome_type is null or trim(p_outcome_type) = '' then
    raise exception 'case_outcome_type_and_action_required' using errcode = '22023';
  end if;
  if p_amount_minor is null or p_amount_minor < 0 or v_currency !~ '^[A-Z]{3}$' then
    raise exception 'case_outcome_amount_or_currency_invalid' using errcode = '22023';
  end if;
  if p_confirmed_loss_minor is not null and (p_confirmed_loss_minor < 0 or p_confirmed_loss_minor > p_amount_minor) then
    raise exception 'case_outcome_confirmed_loss_invalid' using errcode = '22023';
  end if;

  v_payload := jsonb_build_object(
    'merchant_id', p_merchant_id, 'case_id', p_case_id,
    'outcome_type', p_outcome_type, 'action', p_action,
    'amount_minor', p_amount_minor, 'confirmed_loss_minor', p_confirmed_loss_minor,
    'currency', v_currency, 'reason', p_reason,
    'source_record_id', p_source_record_id,
    'source_metadata', coalesce(p_source_metadata, '{}'::jsonb),
    'occurred_at', coalesce(p_occurred_at, now())
  );
  v_fingerprint := encode(extensions.digest(convert_to(v_payload::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_existing
  from public.case_outcomes
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.metadata ->> 'request_fingerprint' is distinct from v_fingerprint then
      raise exception 'case_outcome_idempotency_conflict' using errcode = '22023';
    end if;
    select * into v_event from public.domain_events
    where merchant_id = p_merchant_id and idempotency_key = 'case-outcome:' || p_idempotency_key;
    return jsonb_build_object('outcome_id', v_existing.id, 'domain_event_id', v_event.id, 'replayed', true);
  end if;

  select * into v_case from public.support_payout_cases
  where merchant_id = p_merchant_id and id = p_case_id
  for update;
  if not found then raise exception 'case_not_found' using errcode = 'P0002'; end if;

  if v_is_reversal then
    if nullif(p_source_metadata ->> 'reverses_outcome_id', '') is not null then
      select * into v_prior
      from public.case_outcomes
      where merchant_id = p_merchant_id
        and support_payout_case_id = p_case_id
        and id = (p_source_metadata ->> 'reverses_outcome_id')::uuid;
    else
      select * into v_prior
      from public.case_outcomes candidate
      where candidate.merchant_id = p_merchant_id
        and candidate.support_payout_case_id = p_case_id
        and candidate.reverses_outcome_id is null
        and not exists (
          select 1 from public.case_outcomes prior_reversal
          where prior_reversal.merchant_id = candidate.merchant_id
            and prior_reversal.reverses_outcome_id = candidate.id
        )
      order by candidate.effective_at desc, candidate.recorded_at desc, candidate.id desc
      limit 1;
    end if;
    if not found then
      raise exception 'case_outcome_reversal_requires_active_prior_outcome' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.case_outcomes prior_reversal
      where prior_reversal.merchant_id = p_merchant_id
        and prior_reversal.reverses_outcome_id = v_prior.id
    ) then
      raise exception 'case_outcome_already_reversed' using errcode = '22023';
    end if;
    if v_prior.amount_minor is distinct from p_amount_minor
       or v_prior.currency is distinct from v_currency
       or v_prior.metadata ->> 'action' is distinct from p_action
       or nullif(v_prior.metadata ->> 'confirmed_loss_minor', '')::bigint
          is distinct from p_confirmed_loss_minor then
      raise exception 'case_outcome_reversal_must_mirror_prior_outcome' using errcode = '22023';
    end if;
  end if;

  insert into public.case_outcomes (
    merchant_id, support_payout_case_id, outcome_type, amount_minor,
    currency, reason, metadata, actor_type, effective_at,
    reverses_outcome_id, idempotency_key
  ) values (
    p_merchant_id, p_case_id, p_outcome_type, p_amount_minor,
    v_currency, p_reason,
    coalesce(p_source_metadata, '{}'::jsonb) || jsonb_build_object(
      'request_fingerprint', v_fingerprint,
      'source_record_id', p_source_record_id,
      'action', p_action,
      'confirmed_loss_minor', p_confirmed_loss_minor
    ),
    'source', coalesce(p_occurred_at, now()),
    case when v_is_reversal then v_prior.id else null end,
    p_idempotency_key
  ) returning * into v_outcome;

  select * into v_event
  from public.record_domain_event(
    p_merchant_id,
    'case.outcome_reconciled',
    'case',
    p_case_id,
    'case-outcome:' || p_idempotency_key,
    jsonb_build_object(
      'outcome_id', v_outcome.id,
      'outcome_type', p_outcome_type,
      'action', p_action,
      'amount_minor', p_amount_minor,
      'confirmed_loss_minor', p_confirmed_loss_minor,
      'currency', v_currency,
      'reason', p_reason,
      'source_record_id', p_source_record_id,
      'source_metadata', coalesce(p_source_metadata, '{}'::jsonb),
      'reversal', v_outcome.reverses_outcome_id is not null,
      'reverses_outcome_id', v_outcome.reverses_outcome_id,
      'request_fingerprint', v_fingerprint
    ),
    p_source_record_id,
    null,
    null,
    'source',
    null,
    coalesce(p_occurred_at, now()),
    null,
    null,
    array['financialProjection', 'lossProjection', 'recoveryProjection', 'customerProjection', 'caseProjection', 'notificationProjection', 'auditTimelineProjection']
  );

  insert into public.claim_events (
    claim_id, merchant_id, event_type, from_status, to_status,
    note, metadata
  ) values (
    p_case_id, p_merchant_id, 'outcome_added', v_case.status, v_case.status,
    p_reason,
    jsonb_build_object(
      'outcome_id', v_outcome.id,
      'domain_event_id', v_event.id,
      'source_record_id', p_source_record_id,
      'idempotency_key', p_idempotency_key,
      'triggered_by', 'source_reconciliation',
      'triggered_at', coalesce(p_occurred_at, now())
    )
  );

  select * into v_latest_decision
  from public.case_decisions decision_row
  where decision_row.merchant_id = p_merchant_id
    and decision_row.support_payout_case_id = p_case_id
  order by decision_row.effective_at desc, decision_row.recorded_at desc, decision_row.id desc
  limit 1;
  if found and not v_is_reversal then
    if v_latest_decision.action in ('denied', 'no_action')
       and p_action in ('refund', 'partial_refund', 'full_refund', 'reship', 'replacement', 'store_credit', 'discount')
       and p_amount_minor > 0 then
      v_conflict_reason := 'A source payout was observed after a no-payout merchant decision.';
    elsif v_latest_decision.action in ('approved', 'partial_refund', 'full_refund')
       and p_action not in ('refund', 'partial_refund', 'full_refund', 'reship', 'replacement', 'store_credit', 'discount') then
      v_conflict_reason := 'The source outcome differs from the recorded payout authorization.';
    elsif v_latest_decision.amount_minor is not null
       and p_amount_minor > v_latest_decision.amount_minor then
      v_conflict_reason := 'The observed source payout exceeds the recorded authorized amount.';
    elsif v_latest_decision.currency is not null
       and v_latest_decision.currency <> v_currency then
      v_conflict_reason := 'The observed source outcome currency differs from the recorded decision currency.';
    end if;
  end if;

  if v_conflict_reason is not null then
    insert into public.case_exceptions (
      merchant_id, support_payout_case_id, exception_type, confidence, status,
      title, detail, context, subject_entity_type, subject_entity_id,
      source_system, dedup_key
    ) values (
      p_merchant_id, p_case_id, 'conflicting_financials', 'probable', 'open',
      'Source outcome differs from the merchant decision', v_conflict_reason,
      jsonb_build_object(
        'decision_id', v_latest_decision.id,
        'decision_action', v_latest_decision.action,
        'authorized_amount_minor', v_latest_decision.amount_minor,
        'authorized_currency', v_latest_decision.currency,
        'outcome_id', v_outcome.id,
        'source_action', p_action,
        'source_amount_minor', p_amount_minor,
        'source_currency', v_currency,
        'domain_event_id', v_event.id
      ),
      'case', p_case_id::text, 'source_outcome_reconciliation',
      'source-decision-conflict:' || v_outcome.id::text
    );
  end if;

  return jsonb_build_object('outcome_id', v_outcome.id, 'domain_event_id', v_event.id, 'replayed', false);
end;
$function$;
REVOKE ALL ON FUNCTION public.record_domain_event(uuid, text, text, uuid, text, jsonb, uuid, uuid, uuid, text, uuid, timestamp with time zone, uuid, uuid, text[]) FROM anon;
REVOKE ALL ON FUNCTION public.record_domain_event(uuid, text, text, uuid, text, jsonb, uuid, uuid, uuid, text, uuid, timestamp with time zone, uuid, uuid, text[]) FROM authenticated;
REVOKE ALL ON FUNCTION public.record_domain_event(uuid, text, text, uuid, text, jsonb, uuid, uuid, uuid, text, uuid, timestamp with time zone, uuid, uuid, text[]) FROM service_role;
REVOKE ALL ON FUNCTION public.record_recovery_claim_pack(uuid, uuid, uuid, uuid, text, text, text, jsonb, jsonb, text, text, text, text, uuid, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.record_recovery_claim_pack(uuid, uuid, uuid, uuid, text, text, text, jsonb, jsonb, text, text, text, text, uuid, text, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.record_recovery_claim_pack(uuid, uuid, uuid, uuid, text, text, text, jsonb, jsonb, text, text, text, text, uuid, text, uuid) FROM service_role;
REVOKE ALL ON FUNCTION public.record_recovery_claim_submission(uuid, uuid, uuid, text, text, text, text, bigint, text, timestamp with time zone, uuid, uuid, uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.record_recovery_claim_submission(uuid, uuid, uuid, text, text, text, text, bigint, text, timestamp with time zone, uuid, uuid, uuid, text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.record_recovery_claim_submission(uuid, uuid, uuid, text, text, text, text, bigint, text, timestamp with time zone, uuid, uuid, uuid, text, text) FROM service_role;
REVOKE ALL ON FUNCTION public.record_recovery_provider_response(uuid, uuid, uuid, text, text, text, bigint, bigint, bigint, text, text, text, uuid, uuid, timestamp with time zone, uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.record_recovery_provider_response(uuid, uuid, uuid, text, text, text, bigint, bigint, bigint, text, text, text, uuid, uuid, timestamp with time zone, uuid, text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.record_recovery_provider_response(uuid, uuid, uuid, text, text, text, bigint, bigint, bigint, text, text, text, uuid, uuid, timestamp with time zone, uuid, text, text) FROM service_role;
CREATE FUNCTION public.redact_release1_investigation_subject(p_merchant_id uuid, p_subject_id uuid, p_erasure_receipt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_merchant_customer_id uuid;
  v_source_customer_ids uuid[] := '{}'::uuid[];
  v_order_ids uuid[] := '{}'::uuid[];
  v_ticket_ids uuid[] := '{}'::uuid[];
  v_case_ids uuid[] := '{}'::uuid[];
  v_investigation_ids uuid[] := '{}'::uuid[];
  v_investigations_redacted integer := 0;
  v_attachments_redacted integer := 0;
  v_dispatches_redacted integer := 0;
  v_events_redacted integer := 0;
  v_storage_objects_queued integer := 0;
begin
  if p_merchant_id is null
     or p_subject_id is null
     or p_erasure_receipt_id is null then
    raise exception 'release1_erasure_identifiers_required' using errcode = '22023';
  end if;

  select receipt.merchant_customer_reference
    into v_merchant_customer_id
  from public.data_subject_erasure_receipts receipt
  where receipt.id = p_erasure_receipt_id
    and receipt.merchant_id = p_merchant_id
    and receipt.subject_reference = p_subject_id;
  if not found then
    raise exception 'release1_erasure_receipt_not_found' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(customer.id order by customer.id), '{}'::uuid[])
    into v_source_customer_ids
  from public.source_customers customer
  where customer.merchant_id = p_merchant_id
    and (
      customer.id = p_subject_id
      or (
        v_merchant_customer_id is not null
        and customer.merchant_customer_id = v_merchant_customer_id
      )
    );

  select coalesce(array_agg(source_order.id order by source_order.id), '{}'::uuid[])
    into v_order_ids
  from public.source_orders source_order
  where source_order.merchant_id = p_merchant_id
    and (
      source_order.source_customer_id = any(v_source_customer_ids)
      or (
        v_merchant_customer_id is not null
        and source_order.merchant_customer_id = v_merchant_customer_id
      )
    );

  select coalesce(array_agg(ticket.id order by ticket.id), '{}'::uuid[])
    into v_ticket_ids
  from public.source_tickets ticket
  where ticket.merchant_id = p_merchant_id
    and (
      ticket.source_customer_id = any(v_source_customer_ids)
      or (
        v_merchant_customer_id is not null
        and ticket.merchant_customer_id = v_merchant_customer_id
      )
    );

  select coalesce(array_agg(payout_case.id order by payout_case.id), '{}'::uuid[])
    into v_case_ids
  from public.support_payout_cases payout_case
  where payout_case.merchant_id = p_merchant_id
    and (
      payout_case.source_order_id = any(v_order_ids)
      or payout_case.source_ticket_id = any(v_ticket_ids)
      or (
        v_merchant_customer_id is not null
        and payout_case.merchant_customer_id = v_merchant_customer_id
      )
    );

  select coalesce(array_agg(investigation.id order by investigation.id), '{}'::uuid[])
    into v_investigation_ids
  from public.case_clarification_requests investigation
  where investigation.merchant_id = p_merchant_id
    and investigation.support_payout_case_id = any(v_case_ids);

  perform set_config('app.allow_subject_erasure', 'on', true);
  perform set_config('app.allow_domain_event_purge', 'on', true);

  insert into public.privacy_storage_cleanup_jobs (
    merchant_id,
    erasure_receipt_id,
    bucket,
    object_path
  )
  select
    p_merchant_id,
    p_erasure_receipt_id,
    'investigation-evidence',
    attachment.file_path
  from public.case_investigation_attachments attachment
  where attachment.merchant_id = p_merchant_id
    and attachment.investigation_id = any(v_investigation_ids)
    and nullif(attachment.file_path, '') is not null
    and attachment.file_path not like 'privacy-erased/%'
  on conflict (erasure_receipt_id, bucket, object_path) do nothing;
  get diagnostics v_storage_objects_queued = row_count;

  update public.case_investigation_dispatches dispatch
  set
    idempotency_key = 'privacy-erased:' || dispatch.id::text,
    last_error = null
  where dispatch.merchant_id = p_merchant_id
    and dispatch.investigation_id = any(v_investigation_ids);
  get diagnostics v_dispatches_redacted = row_count;

  update public.case_investigation_attachments attachment
  set
    file_path = 'privacy-erased/' || attachment.id::text,
    external_url = null,
    original_filename = null,
    safe_filename = null,
    content_type = null,
    size_bytes = null,
    content_hash = null,
    safety_status = 'rejected',
    safety_detail = 'Redacted by data subject erasure',
    idempotency_key = 'privacy-erased:' || attachment.id::text
  where attachment.merchant_id = p_merchant_id
    and attachment.investigation_id = any(v_investigation_ids);
  get diagnostics v_attachments_redacted = row_count;

  update public.case_clarification_requests investigation
  set
    target_name = null,
    evidence_gap = '[redacted by data subject erasure]',
    recommended_reason = null,
    override_rationale = null,
    requested_evidence = array['privacy_redacted']::text[],
    request_summary = '[redacted by data subject erasure]',
    subject = '[redacted by data subject erasure]',
    request_body = '[redacted by data subject erasure]',
    recipient = null,
    external_reference = null,
    external_url = null,
    response_body = null,
    response_summary = null,
    responder_name = null,
    closure_reason = null,
    idempotency_key = 'privacy-erased:' || investigation.id::text,
    metadata = '{"privacy_state":"erased"}'::jsonb
  where investigation.merchant_id = p_merchant_id
    and investigation.id = any(v_investigation_ids);
  get diagnostics v_investigations_redacted = row_count;

  update public.notifications notification
  set
    title = 'Case activity updated',
    body = null
  where notification.merchant_id = p_merchant_id
    and notification.domain_event_id in (
      select event.id
      from public.domain_events event
      where event.merchant_id = p_merchant_id
        and event.aggregate_type = 'case_investigation'
        and event.aggregate_id = any(v_investigation_ids)
    );

  update public.domain_events event
  set payload = '{"privacy_state":"erased"}'::jsonb
  where event.merchant_id = p_merchant_id
    and event.aggregate_type = 'case_investigation'
    and event.aggregate_id = any(v_investigation_ids);
  get diagnostics v_events_redacted = row_count;

  return jsonb_build_object(
    'investigations_redacted', v_investigations_redacted,
    'investigation_attachments_redacted', v_attachments_redacted,
    'investigation_dispatches_redacted', v_dispatches_redacted,
    'investigation_events_redacted', v_events_redacted,
    'investigation_storage_objects_queued', v_storage_objects_queued
  );
end;
$function$;
REVOKE ALL ON FUNCTION public.refresh_audit_customer_summaries(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.refresh_audit_customer_summaries(uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.refresh_audit_customer_summaries(uuid, uuid) FROM service_role;
REVOKE ALL ON FUNCTION public.register_processing_job_chunks(uuid, uuid, integer, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.register_processing_job_chunks(uuid, uuid, integer, text, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.register_processing_job_chunks(uuid, uuid, integer, text, jsonb) FROM service_role;
REVOKE ALL ON FUNCTION public.reorder_merchant_rules(uuid, uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.reorder_merchant_rules(uuid, uuid, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.reorder_merchant_rules(uuid, uuid, jsonb) FROM service_role;
REVOKE ALL ON FUNCTION public.reset_merchant_monthly_credits(uuid, integer, timestamp with time zone) FROM anon;
REVOKE ALL ON FUNCTION public.reset_merchant_monthly_credits(uuid, integer, timestamp with time zone) FROM authenticated;
REVOKE ALL ON FUNCTION public.reset_merchant_monthly_credits(uuid, integer, timestamp with time zone) FROM service_role;
CREATE FUNCTION public.revoke_merchant_api_key(p_merchant_id uuid, p_api_key_id uuid, p_revoked_at timestamp with time zone DEFAULT clock_timestamp())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_key public.merchant_api_keys;
  v_widget_count integer := 0;
  v_replayed boolean := false;
begin
  if p_merchant_id is null or p_api_key_id is null then
    raise exception 'api_key_revoke_identifiers_required' using errcode = '22023';
  end if;

  select *
    into v_key
  from public.merchant_api_keys
  where id = p_api_key_id
    and merchant_id = p_merchant_id
  for update;

  if not found then
    raise exception 'api_key_not_found' using errcode = 'P0002';
  end if;

  if v_key.revoked_at is null then
    update public.merchant_api_keys
    set revoked_at = coalesce(p_revoked_at, clock_timestamp())
    where id = p_api_key_id
      and merchant_id = p_merchant_id;
  else
    v_replayed := true;
  end if;

  update public.merchant_widget_tokens
  set revoked_at = coalesce(
    revoked_at,
    v_key.revoked_at,
    p_revoked_at,
    clock_timestamp()
  )
  where api_key_id = p_api_key_id
    and merchant_id = p_merchant_id
    and revoked_at is null;
  get diagnostics v_widget_count = row_count;

  return jsonb_build_object(
    'api_key_id', p_api_key_id,
    'merchant_id', p_merchant_id,
    'revoked_at', coalesce(v_key.revoked_at, p_revoked_at),
    'widget_tokens_revoked', v_widget_count,
    'replayed', v_replayed
  );
end;
$function$;
REVOKE ALL ON FUNCTION public.set_checkout_signal_cross_merchant_hits(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.set_checkout_signal_cross_merchant_hits(uuid, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.set_checkout_signal_cross_merchant_hits(uuid, integer) FROM service_role;
REVOKE ALL ON FUNCTION public.set_merchant_monthly_credits(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.set_merchant_monthly_credits(uuid, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.set_merchant_monthly_credits(uuid, integer) FROM service_role;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM service_role;
CREATE FUNCTION public.settle_case_exception_v1(p_merchant_id uuid, p_exception_id uuid, p_status text, p_resolution text DEFAULT NULL::text, p_resolved_by uuid DEFAULT NULL::uuid, p_expected_state_version bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_exception public.case_exceptions%rowtype;
begin
  if p_status not in ('resolved', 'dismissed') then
    raise exception 'exception_status_invalid' using errcode = '22023';
  end if;

  select * into v_exception
  from public.case_exceptions
  where merchant_id = p_merchant_id
    and id = p_exception_id
  for update;

  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if v_exception.status <> 'open' then
    raise exception 'already_settled' using errcode = '40001';
  end if;
  if p_expected_state_version is not null
     and coalesce(v_exception.state_version, 1) <> p_expected_state_version then
    raise exception 'version_conflict' using errcode = '40001';
  end if;

  update public.case_exceptions
  set status = p_status,
      resolution = p_resolution,
      resolved_by = p_resolved_by,
      resolved_at = now(),
      updated_at = now()
  where merchant_id = p_merchant_id
    and id = p_exception_id;

  select * into v_exception
  from public.case_exceptions
  where merchant_id = p_merchant_id
    and id = p_exception_id;

  return jsonb_build_object('exception', to_jsonb(v_exception));
end;
$function$;
CREATE FUNCTION public.transfer_merchant_ownership(p_merchant_id uuid, p_actor_user_id uuid, p_new_owner_member_id uuid, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_current_owner public.merchant_users;
  v_new_owner public.merchant_users;
  v_existing_event public.domain_events;
  v_event public.domain_events;
  v_now timestamptz := clock_timestamp();
begin
  if p_merchant_id is null
     or p_actor_user_id is null
     or p_new_owner_member_id is null then
    raise exception 'ownership_transfer_identifiers_required' using errcode = '22023';
  end if;
  if p_idempotency_key is null
     or length(trim(p_idempotency_key)) < 8
     or length(p_idempotency_key) > 200 then
    raise exception 'ownership_transfer_idempotency_key_invalid' using errcode = '22023';
  end if;

  -- Serialize transfers for one merchant and make a lost-response retry safe.
  perform 1
  from public.merchants
  where id = p_merchant_id
  for update;
  if not found then
    raise exception 'ownership_transfer_merchant_not_found' using errcode = 'P0002';
  end if;

  select *
    into v_existing_event
  from public.domain_events
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key);

  if found then
    if v_existing_event.event_type <> 'workspace.ownership_transferred'
       or v_existing_event.actor_id is distinct from p_actor_user_id
       or v_existing_event.payload ->> 'new_owner_member_id' is distinct from p_new_owner_member_id::text then
      raise exception 'ownership_transfer_idempotency_conflict' using errcode = '23505';
    end if;
    return jsonb_build_object(
      'merchant_id', p_merchant_id,
      'previous_owner_member_id', v_existing_event.payload ->> 'previous_owner_member_id',
      'new_owner_member_id', p_new_owner_member_id,
      'domain_event_id', v_existing_event.id,
      'replayed', true
    );
  end if;

  select *
    into v_current_owner
  from public.merchant_users
  where merchant_id = p_merchant_id
    and role = 'owner'::public.member_role
    and invite_status = 'active'::public.invite_status
    and user_id is not null
  for update;

  if not found or v_current_owner.user_id is distinct from p_actor_user_id then
    raise exception 'ownership_transfer_current_owner_required' using errcode = '42501';
  end if;
  if v_current_owner.id = p_new_owner_member_id then
    raise exception 'ownership_transfer_target_is_current_owner' using errcode = '22023';
  end if;

  select *
    into v_new_owner
  from public.merchant_users
  where id = p_new_owner_member_id
    and merchant_id = p_merchant_id
  for update;

  if not found then
    raise exception 'ownership_transfer_target_not_found' using errcode = 'P0002';
  end if;
  if v_new_owner.invite_status <> 'active'::public.invite_status
     or v_new_owner.user_id is null then
    raise exception 'ownership_transfer_target_must_be_active' using errcode = '22023';
  end if;

  -- The former owner remains an administrator; both changes and their durable
  -- trigger-backed audit events commit or roll back together.
  update public.merchant_users
     set role = 'admin'::public.member_role
   where id = v_current_owner.id
     and merchant_id = p_merchant_id;

  update public.merchant_users
     set role = 'owner'::public.member_role
   where id = v_new_owner.id
     and merchant_id = p_merchant_id;

  select *
    into v_event
  from public.record_domain_event(
    p_merchant_id => p_merchant_id,
    p_event_type => 'workspace.ownership_transferred',
    p_aggregate_type => 'merchant',
    p_aggregate_id => p_merchant_id,
    p_idempotency_key => trim(p_idempotency_key),
    p_payload => jsonb_build_object(
      'previous_owner_member_id', v_current_owner.id,
      'new_owner_member_id', v_new_owner.id,
      'previous_owner_new_role', 'admin',
      'new_owner_previous_role', v_new_owner.role,
      'effective_at', v_now
    ),
    p_actor_type => 'user',
    p_actor_id => p_actor_user_id,
    p_occurred_at => v_now
  );

  return jsonb_build_object(
    'merchant_id', p_merchant_id,
    'previous_owner_member_id', v_current_owner.id,
    'new_owner_member_id', v_new_owner.id,
    'domain_event_id', v_event.id,
    'replayed', false
  );
end;
$function$;
CREATE FUNCTION public.transition_case_investigation(p_merchant_id uuid, p_case_id uuid, p_investigation_id uuid, p_expected_version bigint, p_action text, p_patch jsonb, p_actor_user_id uuid, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_investigation public.case_clarification_requests;
  v_updated public.case_clarification_requests;
  v_promoted public.case_clarification_requests;
  v_case public.support_payout_cases;
  v_prior_event public.domain_events;
  v_event public.domain_events;
  v_event_type text;
  v_new_status text;
  v_due_at timestamptz;
  v_case_status public.claim_status;
  v_case_expected_version bigint;
  v_case_transition jsonb;
  v_result jsonb;
  v_task_key text;
begin
  if p_merchant_id is null or p_case_id is null or p_investigation_id is null
     or p_actor_user_id is null then
    raise exception 'investigation_transition_identifiers_required' using errcode = '22023';
  end if;
  if p_expected_version is null or p_expected_version < 1 then
    raise exception 'investigation_expected_version_required' using errcode = '22023';
  end if;
  if p_idempotency_key is null
     or length(trim(p_idempotency_key)) < 8
     or length(p_idempotency_key) > 180 then
    raise exception 'investigation_transition_idempotency_key_invalid' using errcode = '22023';
  end if;
  if p_action not in ('update', 'mark_sent', 'send_accepted', 'chase', 'response', 'close', 'cancel') then
    raise exception 'investigation_action_invalid' using errcode = '22023';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'investigation_patch_invalid' using errcode = '22023';
  end if;

  select *
    into v_prior_event
  from public.domain_events
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key) || ':event';
  if found then
    if v_prior_event.aggregate_id is distinct from p_investigation_id
       or v_prior_event.payload ->> 'action' is distinct from p_action then
      raise exception 'investigation_transition_idempotency_conflict' using errcode = '23505';
    end if;
    return coalesce(v_prior_event.payload -> 'result', '{}'::jsonb)
      || jsonb_build_object('domain_event_id', v_prior_event.id, 'replayed', true);
  end if;

  select *
    into v_investigation
  from public.case_clarification_requests
  where id = p_investigation_id
    and merchant_id = p_merchant_id
    and support_payout_case_id = p_case_id
  for update;
  if not found then
    raise exception 'investigation_not_found' using errcode = 'P0002';
  end if;

  -- Re-check after the row lock. This is the concurrency-safe replay path for
  -- a retry that arrived before the first transaction recorded its event.
  select *
    into v_prior_event
  from public.domain_events
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key) || ':event';
  if found then
    if v_prior_event.aggregate_id is distinct from p_investigation_id
       or v_prior_event.payload ->> 'action' is distinct from p_action then
      raise exception 'investigation_transition_idempotency_conflict' using errcode = '23505';
    end if;
    return coalesce(v_prior_event.payload -> 'result', '{}'::jsonb)
      || jsonb_build_object('domain_event_id', v_prior_event.id, 'replayed', true);
  end if;

  if v_investigation.state_version is distinct from p_expected_version then
    raise exception 'investigation_version_conflict' using errcode = '40001';
  end if;

  select *
    into v_case
  from public.support_payout_cases
  where id = p_case_id
    and merchant_id = p_merchant_id
  for update;
  if not found then
    raise exception 'case_not_found' using errcode = 'P0002';
  end if;

  if p_action = 'update' then
    if v_investigation.status <> 'draft' then
      raise exception 'only_draft_investigations_are_editable' using errcode = '22023';
    end if;
    if exists (
      select 1
      from public.case_clarification_requests other_request
      where other_request.merchant_id = p_merchant_id
        and other_request.support_payout_case_id = p_case_id
        and other_request.id <> p_investigation_id
        and other_request.target_type =
          coalesce(nullif(p_patch ->> 'target_type', ''), v_investigation.target_type)
        and lower(other_request.evidence_gap) = lower(
          coalesce(
            nullif(trim(p_patch ->> 'evidence_gap'), ''),
            v_investigation.evidence_gap
          )
        )
        and other_request.status in (
          'draft', 'sent', 'waiting_response', 'response_received'
        )
    ) then
      raise exception 'duplicate_open_investigation' using errcode = '23505';
    end if;
    update public.case_clarification_requests
    set
      target_type = coalesce(nullif(p_patch ->> 'target_type', ''), target_type),
      target_name = case when p_patch ? 'target_name' then nullif(trim(p_patch ->> 'target_name'), '') else target_name end,
      partner_id = case when p_patch ? 'partner_id' then nullif(p_patch ->> 'partner_id', '')::uuid else partner_id end,
      evidence_gap = coalesce(nullif(trim(p_patch ->> 'evidence_gap'), ''), evidence_gap),
      recommended_reason = case when p_patch ? 'recommended_reason' then nullif(trim(p_patch ->> 'recommended_reason'), '') else recommended_reason end,
      requested_evidence = case
        when p_patch ? 'requested_evidence'
          then array(select jsonb_array_elements_text(p_patch -> 'requested_evidence'))
        else requested_evidence
      end,
      request_summary = coalesce(nullif(trim(p_patch ->> 'request_summary'), ''), request_summary),
      subject = coalesce(nullif(trim(p_patch ->> 'subject'), ''), subject),
      request_body = coalesce(nullif(trim(p_patch ->> 'request_body'), ''), request_body),
      recipient = case when p_patch ? 'recipient' then nullif(trim(p_patch ->> 'recipient'), '') else recipient end,
      source_channel = case when p_patch ? 'source_channel' then nullif(p_patch ->> 'source_channel', '') else source_channel end,
      due_at = case when p_patch ? 'due_at' then nullif(p_patch ->> 'due_at', '')::timestamptz else due_at end,
      state_version = state_version + 1
    where id = p_investigation_id
      and merchant_id = p_merchant_id
    returning * into v_updated;
    v_event_type := 'investigation.updated';

  elsif p_action in ('mark_sent', 'send_accepted') then
    if v_investigation.status <> 'draft' then
      raise exception 'investigation_must_be_draft_to_send' using errcode = '22023';
    end if;
    v_due_at := coalesce(
      nullif(p_patch ->> 'due_at', '')::timestamptz,
      v_investigation.due_at
    );
    if v_due_at is null or v_due_at <= now() then
      raise exception 'investigation_future_due_at_required' using errcode = '22023';
    end if;
    if p_action = 'send_accepted'
       and coalesce(nullif(p_patch ->> 'provider_message_id', ''), '') = '' then
      raise exception 'accepted_email_provider_message_id_required' using errcode = '22023';
    end if;

    update public.case_clarification_requests
    set
      status = 'waiting_response',
      source_channel = coalesce(nullif(p_patch ->> 'source_channel', ''), source_channel, 'manual'),
      external_reference = case when p_patch ? 'external_reference' then nullif(trim(p_patch ->> 'external_reference'), '') else external_reference end,
      external_url = case when p_patch ? 'external_url' then nullif(trim(p_patch ->> 'external_url'), '') else external_url end,
      due_at = v_due_at,
      sent_at = coalesce(nullif(p_patch ->> 'sent_at', '')::timestamptz, now()),
      sent_by = p_actor_user_id,
      metadata = metadata || jsonb_strip_nulls(jsonb_build_object(
        'provider_message_id', nullif(p_patch ->> 'provider_message_id', '')
      )),
      state_version = state_version + 1
    where id = p_investigation_id
      and merchant_id = p_merchant_id
    returning * into v_updated;
    v_event_type := 'investigation.sent';

    v_task_key := 'investigation:' || p_investigation_id::text || ':response';
    insert into public.work_tasks (
      merchant_id, support_payout_case_id, title, description,
      due_at, priority, status, source, source_metadata
    ) values (
      p_merchant_id, p_case_id,
      'Investigation response due',
      'Review or chase the response for ' || coalesce(v_updated.target_name, v_updated.target_type) || '.',
      v_due_at, 'high', 'open', 'investigation',
      jsonb_build_object(
        'migration_key', v_task_key,
        'investigation_id', p_investigation_id,
        'task_kind', 'response_due'
      )
    ) on conflict do nothing;

    if v_investigation.is_primary
       and v_case.status::text not in (
         'closed', 'resolved_refunded', 'resolved_won', 'resolved_lost',
         'resolved_denied', 'resolved_exchanged', 'voided'
       ) then
      v_case_expected_version := nullif(p_patch ->> 'case_version', '')::bigint;
      if v_case_expected_version is null then
        raise exception 'case_expected_version_required' using errcode = '22023';
      end if;
      v_case_status := public.investigation_case_status(v_updated.target_type);
      v_case_transition := public.transition_payout_case(
        p_merchant_id, p_case_id, v_case_expected_version,
        jsonb_build_object('status', v_case_status::text),
        'Primary investigation sent', p_actor_user_id,
        'merchant_manual', 'case.investigation_waiting',
        jsonb_build_object(
          'case_id', p_case_id,
          'investigation_id', p_investigation_id,
          'target_type', v_updated.target_type
        ),
        array[
          'caseProjection', 'notificationProjection',
          'workflowHandler', 'auditTimelineProjection'
        ]::text[],
        'status_changed',
        jsonb_build_object('investigation_id', p_investigation_id),
        trim(p_idempotency_key) || ':case',
        false, false, false, false
      );
    end if;

  elsif p_action = 'chase' then
    if v_investigation.status <> 'waiting_response' then
      raise exception 'only_waiting_investigations_can_be_chased' using errcode = '22023';
    end if;
    if coalesce(length(trim(p_patch ->> 'note')), 0) < 3 then
      raise exception 'investigation_chase_note_required' using errcode = '22023';
    end if;
    v_due_at := coalesce(
      nullif(p_patch ->> 'due_at', '')::timestamptz,
      v_investigation.due_at
    );
    update public.case_clarification_requests
    set
      due_at = v_due_at,
      metadata = metadata || jsonb_build_object(
        'last_chased_at', now(),
        'last_chase_note', trim(p_patch ->> 'note'),
        'chase_count', coalesce((metadata ->> 'chase_count')::integer, 0) + 1
      ),
      state_version = state_version + 1
    where id = p_investigation_id
      and merchant_id = p_merchant_id
    returning * into v_updated;
    v_event_type := 'investigation.chased';

    v_task_key := 'investigation:' || p_investigation_id::text || ':response';
    update public.work_tasks
    set due_at = v_due_at, updated_at = now()
    where merchant_id = p_merchant_id
      and source_metadata ->> 'migration_key' = v_task_key
      and status in ('open', 'in_progress', 'blocked');

  elsif p_action = 'response' then
    if v_investigation.status <> 'waiting_response' then
      raise exception 'investigation_must_be_waiting_for_response' using errcode = '22023';
    end if;
    if p_patch ->> 'response_outcome' not in (
      'issue_confirmed', 'no_issue_found', 'inconclusive', 'referred_elsewhere'
    ) or coalesce(length(trim(p_patch ->> 'response_summary')), 0) < 3 then
      raise exception 'investigation_response_invalid' using errcode = '22023';
    end if;
    update public.case_clarification_requests
    set
      status = 'response_received',
      response_outcome = p_patch ->> 'response_outcome',
      response_summary = trim(p_patch ->> 'response_summary'),
      response_body = nullif(p_patch ->> 'response_body', ''),
      responder_name = nullif(trim(p_patch ->> 'responder_name'), ''),
      external_reference = coalesce(nullif(trim(p_patch ->> 'external_reference'), ''), external_reference),
      external_url = coalesce(nullif(trim(p_patch ->> 'external_url'), ''), external_url),
      response_received_at = coalesce(
        nullif(p_patch ->> 'response_received_at', '')::timestamptz,
        now()
      ),
      response_recorded_by = p_actor_user_id,
      state_version = state_version + 1
    where id = p_investigation_id
      and merchant_id = p_merchant_id
    returning * into v_updated;
    v_event_type := 'investigation.response_recorded';

    update public.work_tasks
    set
      status = 'completed',
      completion_outcome = jsonb_build_object('outcome', 'response_received'),
      completed_at = now(),
      completed_by = p_actor_user_id,
      updated_at = now()
    where merchant_id = p_merchant_id
      and source_metadata ->> 'migration_key' =
        'investigation:' || p_investigation_id::text || ':response'
      and status in ('open', 'in_progress', 'blocked');

    insert into public.work_tasks (
      merchant_id, support_payout_case_id, title, description,
      due_at, priority, status, source, source_metadata
    ) values (
      p_merchant_id, p_case_id,
      'Review investigation response',
      'Apply the structured response to the case evidence and responsibility assessment.',
      now(), 'high', 'open', 'investigation',
      jsonb_build_object(
        'migration_key', 'investigation:' || p_investigation_id::text || ':review',
        'investigation_id', p_investigation_id,
        'task_kind', 'response_review'
      )
    ) on conflict do nothing;

    if v_investigation.is_primary
       and v_case.status::text not in (
         'closed', 'resolved_refunded', 'resolved_won', 'resolved_lost',
         'resolved_denied', 'resolved_exchanged', 'voided'
       ) then
      v_case_expected_version := nullif(p_patch ->> 'case_version', '')::bigint;
      if v_case_expected_version is null then
        raise exception 'case_expected_version_required' using errcode = '22023';
      end if;
      v_case_transition := public.transition_payout_case(
        p_merchant_id, p_case_id, v_case_expected_version,
        jsonb_build_object('status', 'manual_review'),
        'Investigation response received', p_actor_user_id,
        'merchant_manual', 'case.investigation_response_received',
        jsonb_build_object(
          'case_id', p_case_id,
          'investigation_id', p_investigation_id,
          'response_outcome', v_updated.response_outcome
        ),
        array[
          'caseProjection', 'notificationProjection',
          'workflowHandler', 'auditTimelineProjection'
        ]::text[],
        'status_changed',
        jsonb_build_object('investigation_id', p_investigation_id),
        trim(p_idempotency_key) || ':case',
        false, false, false, false
      );
    end if;

  elsif p_action in ('close', 'cancel') then
    if v_investigation.status in ('closed', 'cancelled') then
      raise exception 'investigation_already_final' using errcode = '22023';
    end if;
    if p_action = 'cancel'
       and coalesce(length(trim(p_patch ->> 'closure_reason')), 0) < 5 then
      raise exception 'investigation_cancellation_reason_required' using errcode = '22023';
    end if;
    if p_action = 'close'
       and v_investigation.status = 'waiting_response'
       and (
         p_patch ->> 'response_outcome' <> 'no_response'
         or coalesce(length(trim(p_patch ->> 'closure_reason')), 0) < 5
       ) then
      raise exception 'explicit_no_response_closure_required' using errcode = '22023';
    end if;
    if p_action = 'close'
       and v_investigation.status not in ('waiting_response', 'response_received') then
      raise exception 'investigation_not_reviewable_for_close' using errcode = '22023';
    end if;

    v_new_status := case when p_action = 'cancel' then 'cancelled' else 'closed' end;
    update public.case_clarification_requests
    set
      status = v_new_status,
      response_outcome = case
        when p_action = 'close' and status = 'waiting_response' then 'no_response'
        else response_outcome
      end,
      closure_reason = nullif(trim(p_patch ->> 'closure_reason'), ''),
      closed_at = now(),
      closed_by = p_actor_user_id,
      is_primary = false,
      state_version = state_version + 1
    where id = p_investigation_id
      and merchant_id = p_merchant_id
    returning * into v_updated;
    v_event_type := case
      when p_action = 'cancel' then 'investigation.cancelled'
      else 'investigation.closed'
    end;

    update public.work_tasks
    set
      status = case when p_action = 'cancel' then 'cancelled' else 'completed' end,
      completion_outcome = jsonb_build_object('outcome', v_new_status),
      completed_at = now(),
      completed_by = p_actor_user_id,
      updated_at = now()
    where merchant_id = p_merchant_id
      and source_metadata ->> 'investigation_id' = p_investigation_id::text
      and status in ('open', 'in_progress', 'blocked');

    if v_investigation.is_primary then
      select *
        into v_promoted
      from public.case_clarification_requests
      where merchant_id = p_merchant_id
        and support_payout_case_id = p_case_id
        and id <> p_investigation_id
        and status in ('draft', 'sent', 'waiting_response', 'response_received')
      order by
        case status
          when 'waiting_response' then 0
          when 'response_received' then 1
          else 2
        end,
        coalesce(sent_at, created_at),
        id
      limit 1
      for update;
      if found then
        update public.case_clarification_requests
        set is_primary = true, state_version = state_version + 1
        where id = v_promoted.id
          and merchant_id = p_merchant_id
        returning * into v_promoted;
      end if;

      if v_case.status::text not in (
        'closed', 'resolved_refunded', 'resolved_won', 'resolved_lost',
        'resolved_denied', 'resolved_exchanged', 'voided'
      ) then
        v_case_expected_version := nullif(p_patch ->> 'case_version', '')::bigint;
        if v_case_expected_version is null then
          raise exception 'case_expected_version_required' using errcode = '22023';
        end if;
        v_case_status := case
          when v_promoted.id is null then 'ready_for_decision'::public.claim_status
          when v_promoted.status in ('waiting_response', 'sent')
            then public.investigation_case_status(v_promoted.target_type)
          else 'manual_review'::public.claim_status
        end;
        v_case_transition := public.transition_payout_case(
          p_merchant_id, p_case_id, v_case_expected_version,
          jsonb_build_object('status', v_case_status::text),
          'Primary investigation completed', p_actor_user_id,
          'merchant_manual', 'case.investigation_primary_changed',
          jsonb_build_object(
            'case_id', p_case_id,
            'closed_investigation_id', p_investigation_id,
            'promoted_investigation_id', v_promoted.id
          ),
          array[
            'caseProjection', 'notificationProjection',
            'workflowHandler', 'auditTimelineProjection'
          ]::text[],
          'status_changed',
          jsonb_build_object(
            'investigation_id', p_investigation_id,
            'promoted_investigation_id', v_promoted.id
          ),
          trim(p_idempotency_key) || ':case',
          false, false, false, false
        );
      end if;
    end if;
  end if;

  v_result := to_jsonb(v_updated)
    || jsonb_build_object(
      'replayed', false,
      'case_transition', v_case_transition,
      'promoted_investigation_id', v_promoted.id
    );

  select *
    into v_event
  from public.record_domain_event(
    p_merchant_id,
    v_event_type,
    'case_investigation',
    p_investigation_id,
    trim(p_idempotency_key) || ':event',
    jsonb_build_object(
      'action', p_action,
      'investigation_id', p_investigation_id,
      'case_id', p_case_id,
      'from_status', v_investigation.status,
      'to_status', v_updated.status,
      'target_type', v_updated.target_type,
      'is_primary', v_updated.is_primary,
      'due_at', v_updated.due_at,
      'response_outcome', v_updated.response_outcome,
      'result', v_result
    ),
    null, null, null, 'user', p_actor_user_id, now(), null, null,
    array[
      'caseProjection', 'notificationProjection',
      'workflowHandler', 'auditTimelineProjection'
    ]::text[]
  );

  insert into public.claim_events (
    claim_id, merchant_id, event_type, from_status, to_status,
    note, actor_user_id, metadata
  ) values (
    p_case_id, p_merchant_id, replace(v_event_type, 'investigation.', 'investigation_'),
    v_case.status, coalesce((v_case_transition ->> 'status')::public.claim_status, v_case.status),
    coalesce(nullif(p_patch ->> 'note', ''), nullif(p_patch ->> 'closure_reason', '')),
    p_actor_user_id,
    jsonb_build_object(
      'investigation_id', p_investigation_id,
      'action', p_action,
      'domain_event_id', v_event.id,
      'idempotency_key', trim(p_idempotency_key)
    )
  );

  return v_result || jsonb_build_object('domain_event_id', v_event.id);
end;
$function$;
CREATE FUNCTION public.transition_payout_case(p_merchant_id uuid, p_case_id uuid, p_expected_version bigint, p_patch jsonb, p_reason text, p_actor_user_id uuid, p_triggered_by text, p_event_type text, p_event_payload jsonb, p_handler_names text[], p_claim_event_type text, p_claim_event_metadata jsonb, p_idempotency_key text, p_allow_reopen boolean DEFAULT false, p_allow_decision_reversal boolean DEFAULT false, p_allow_snooze boolean DEFAULT false, p_allow_closure_exception boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_case public.support_payout_cases;
  v_prior_event public.domain_events;
  v_event public.domain_events;
  v_request jsonb;
  v_fingerprint text;
  v_result jsonb;
  v_new_status text;
  v_new_decision_state text;
  v_new_recovery_state text;
  v_handler text;
  v_closure_blockers text[] := '{}';
  v_latest_decision public.case_decisions;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'case_transition_idempotency_key_required' using errcode = '22023';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'case_transition_patch_must_be_object' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_object_keys(p_patch) as key_name
    where key_name <> all (array[
      'status', 'payout_decision_state', 'recovery_state',
      'assigned_to', 'assigned_at', 'snoozed_until',
      'loss_attribution', 'attribution_confidence'
    ])
  ) then
    raise exception 'case_transition_patch_contains_unsupported_field' using errcode = '22023';
  end if;

  v_request := jsonb_build_object(
    'merchant_id', p_merchant_id,
    'case_id', p_case_id,
    'expected_version', p_expected_version,
    'patch', p_patch,
    'reason', p_reason,
    'actor_user_id', p_actor_user_id,
    'triggered_by', coalesce(p_triggered_by, 'system'),
    'event_type', coalesce(p_event_type, 'case.updated'),
    'event_payload', coalesce(p_event_payload, '{}'::jsonb),
    'claim_event_type', coalesce(p_claim_event_type, 'status_changed'),
    'claim_event_metadata', coalesce(p_claim_event_metadata, '{}'::jsonb),
    'allow_reopen', p_allow_reopen,
    'allow_decision_reversal', p_allow_decision_reversal,
    'allow_snooze', p_allow_snooze,
    'allow_closure_exception', p_allow_closure_exception
  );
  v_fingerprint := encode(extensions.digest(convert_to(v_request::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_prior_event
  from public.domain_events
  where merchant_id = p_merchant_id
    and idempotency_key = p_idempotency_key;
  if found then
    if v_prior_event.payload ->> 'request_fingerprint' is distinct from v_fingerprint then
      raise exception 'case_transition_idempotency_conflict' using errcode = '22023';
    end if;
    return coalesce(v_prior_event.payload -> 'transition_result', '{}'::jsonb)
      || jsonb_build_object('domain_event_id', v_prior_event.id, 'replayed', true);
  end if;

  select * into v_case
  from public.support_payout_cases
  where merchant_id = p_merchant_id
    and id = p_case_id
  for update;
  if not found then
    raise exception 'case_not_found' using errcode = 'P0002';
  end if;

  -- A concurrent caller may have completed this exact operation while this
  -- transaction waited for the case row lock.
  select * into v_prior_event
  from public.domain_events
  where merchant_id = p_merchant_id
    and idempotency_key = p_idempotency_key;
  if found then
    if v_prior_event.payload ->> 'request_fingerprint' is distinct from v_fingerprint then
      raise exception 'case_transition_idempotency_conflict' using errcode = '22023';
    end if;
    return coalesce(v_prior_event.payload -> 'transition_result', '{}'::jsonb)
      || jsonb_build_object('domain_event_id', v_prior_event.id, 'replayed', true);
  end if;

  if v_case.state_version is distinct from p_expected_version then
    raise exception 'case_version_conflict' using errcode = '40001';
  end if;

  v_new_status := coalesce(p_patch ->> 'status', v_case.status::text);
  v_new_decision_state := coalesce(p_patch ->> 'payout_decision_state', v_case.payout_decision_state);
  v_new_recovery_state := coalesce(p_patch ->> 'recovery_state', v_case.recovery_state);

  -- Status validation mirrors the canonical application state machine. The
  -- enum cast additionally rejects unknown values.
  perform v_new_status::public.claim_status;
  if v_new_status <> v_case.status::text then
    if v_new_status = 'stale' then
      raise exception 'case_transition_rejected:status' using errcode = '22023';
    end if;
    if v_new_status = 'pending' and not p_allow_snooze then
      raise exception 'case_transition_rejected:status' using errcode = '22023';
    end if;
    if v_case.status::text = 'escalated' and v_new_status not in ('resolved_won', 'resolved_lost', 'voided') then
      raise exception 'case_transition_rejected:status' using errcode = '22023';
    end if;
    if v_case.status::text in (
      'closed', 'resolved_refunded', 'resolved_won', 'resolved_lost',
      'resolved_denied', 'resolved_exchanged', 'voided', 'stale'
    ) and not (
      p_allow_reopen and v_new_status in ('open', 'new')
    ) and v_new_status <> 'voided' then
      raise exception 'case_transition_rejected:status' using errcode = '22023';
    end if;
  end if;

  if v_new_decision_state not in ('undecided', 'recommendation_ready', 'decision_recorded', 'reversed') then
    raise exception 'case_transition_rejected:payout_decision_state' using errcode = '22023';
  end if;
  if v_new_decision_state <> v_case.payout_decision_state then
    if v_case.payout_decision_state = 'decision_recorded'
      and v_new_decision_state <> 'reversed'
      and not p_allow_decision_reversal then
      raise exception 'case_transition_rejected:payout_decision_state' using errcode = '22023';
    end if;
    if v_new_decision_state = 'reversed'
      and v_case.payout_decision_state <> 'decision_recorded'
      and not p_allow_decision_reversal then
      raise exception 'case_transition_rejected:payout_decision_state' using errcode = '22023';
    end if;
  end if;

  if v_new_recovery_state not in (
    'no_recovery_needed', 'recovery_possible', 'recovery_opened',
    'recovery_submitted', 'recovery_paid', 'closed_unrecoverable'
  ) then
    raise exception 'case_transition_rejected:recovery_state' using errcode = '22023';
  end if;
  if v_new_recovery_state <> v_case.recovery_state then
    if v_case.recovery_state in ('recovery_paid', 'closed_unrecoverable') then
      raise exception 'case_transition_rejected:recovery_state' using errcode = '22023';
    end if;
    if v_new_recovery_state = 'recovery_paid' and v_case.recovery_state <> 'recovery_submitted' then
      raise exception 'case_transition_rejected:recovery_state' using errcode = '22023';
    end if;
    if v_new_recovery_state = 'recovery_submitted' and v_case.recovery_state <> 'recovery_opened' then
      raise exception 'case_transition_rejected:recovery_state' using errcode = '22023';
    end if;
    if v_new_recovery_state = 'recovery_opened' and v_case.recovery_state <> 'recovery_possible' then
      raise exception 'case_transition_rejected:recovery_state' using errcode = '22023';
    end if;
    if v_new_recovery_state = 'closed_unrecoverable' and v_case.recovery_state = 'no_recovery_needed' then
      raise exception 'case_transition_rejected:recovery_state' using errcode = '22023';
    end if;
  end if;

  if v_new_status in (
    'closed', 'resolved_refunded', 'resolved_won', 'resolved_lost',
    'resolved_denied', 'resolved_exchanged'
  ) and v_new_status <> v_case.status::text then
    if v_new_decision_state <> 'decision_recorded' then
      v_closure_blockers := array_append(v_closure_blockers, 'payout_decision');
    end if;
    if v_new_recovery_state not in ('no_recovery_needed', 'recovery_paid', 'closed_unrecoverable') then
      v_closure_blockers := array_append(v_closure_blockers, 'recovery_state');
    end if;
    if exists (
      select 1 from public.case_exceptions exception_row
      where exception_row.merchant_id = p_merchant_id
        and exception_row.support_payout_case_id = p_case_id
        and exception_row.status = 'open'
        and exception_row.exception_type in (
          'conflicting_financials', 'missing_recovery_result',
          'write_off_reason', 'responsibility_judgement'
        )
    ) then
      v_closure_blockers := array_append(v_closure_blockers, 'financial_exception');
    end if;
    if exists (
      select 1 from public.recovery_cases recovery_row
      where recovery_row.merchant_id = p_merchant_id
        and recovery_row.support_payout_case_id = p_case_id
        and recovery_row.status not in ('paid', 'closed_unrecoverable')
    ) then
      v_closure_blockers := array_append(v_closure_blockers, 'recovery_work');
    end if;
    if exists (
      select 1 from public.case_prevention_observations observation_row
      where observation_row.merchant_id = p_merchant_id
        and observation_row.support_payout_case_id = p_case_id
        and observation_row.status = 'pending'
    ) then
      v_closure_blockers := array_append(v_closure_blockers, 'prevention_observation');
    end if;

    select * into v_latest_decision
    from public.case_decisions decision_row
    where decision_row.merchant_id = p_merchant_id
      and decision_row.support_payout_case_id = p_case_id
    order by decision_row.effective_at desc, decision_row.recorded_at desc, decision_row.id desc
    limit 1;
    if v_new_decision_state = 'decision_recorded' and not found then
      v_closure_blockers := array_append(v_closure_blockers, 'decision_history');
    elsif found and v_latest_decision.action in ('approved', 'partial_refund', 'full_refund')
      and not exists (
        select 1 from public.case_outcomes outcome_row
        where outcome_row.merchant_id = p_merchant_id
          and outcome_row.support_payout_case_id = p_case_id
          and outcome_row.effective_at >= v_latest_decision.effective_at
          and outcome_row.reverses_outcome_id is null
          and not exists (
            select 1 from public.case_outcomes reversal_row
            where reversal_row.merchant_id = outcome_row.merchant_id
              and reversal_row.reverses_outcome_id = outcome_row.id
          )
      ) then
      v_closure_blockers := array_append(v_closure_blockers, 'source_outcome');
    end if;

    if coalesce(array_length(v_closure_blockers, 1), 0) > 0 then
      if not p_allow_closure_exception then
        raise exception 'case_closure_blocked:%', array_to_string(v_closure_blockers, ',')
          using errcode = '22023';
      end if;
      if coalesce(length(trim(p_reason)), 0) < 10 then
        raise exception 'case_closure_exception_reason_required' using errcode = '22023';
      end if;
    end if;
  end if;

  update public.support_payout_cases
  set
    status = v_new_status::public.claim_status,
    payout_decision_state = v_new_decision_state,
    recovery_state = v_new_recovery_state,
    assigned_to = case when p_patch ? 'assigned_to' then nullif(p_patch ->> 'assigned_to', '')::uuid else assigned_to end,
    assigned_at = case when p_patch ? 'assigned_at' then nullif(p_patch ->> 'assigned_at', '')::timestamptz else assigned_at end,
    snoozed_until = case when p_patch ? 'snoozed_until' then nullif(p_patch ->> 'snoozed_until', '')::timestamptz else snoozed_until end,
    loss_attribution = case when p_patch ? 'loss_attribution' then nullif(p_patch ->> 'loss_attribution', '')::public.loss_attribution else loss_attribution end,
    attribution_confidence = case when p_patch ? 'attribution_confidence' then nullif(p_patch ->> 'attribution_confidence', '')::public.attribution_confidence else attribution_confidence end,
    state_version = state_version + 1,
    updated_at = now()
  where merchant_id = p_merchant_id
    and id = p_case_id;

  v_result := jsonb_build_object(
    'case_id', p_case_id,
    'new_version', p_expected_version + 1,
    'status', v_new_status,
    'payout_decision_state', v_new_decision_state,
    'recovery_state', v_new_recovery_state,
    'replayed', false
  );

  select * into v_event
  from public.record_domain_event(
    p_merchant_id,
    coalesce(p_event_type, 'case.updated'),
    'case',
    p_case_id,
    p_idempotency_key,
    coalesce(p_event_payload, '{}'::jsonb) || jsonb_build_object(
      'case_id', p_case_id,
      'from_version', p_expected_version,
      'to_version', p_expected_version + 1,
      'patch', p_patch,
      'reason', p_reason,
      'request_fingerprint', v_fingerprint,
      'transition_result', v_result
    ),
    null,
    null,
    null,
    case when p_actor_user_id is null then 'system' else 'user' end,
    p_actor_user_id,
    now(),
    null,
    null,
    coalesce(p_handler_names, '{}')
  );

  insert into public.claim_events (
    claim_id, merchant_id, event_type, from_status, to_status,
    note, actor_user_id, metadata
  ) values (
    p_case_id,
    p_merchant_id,
    coalesce(p_claim_event_type, 'status_changed'),
    v_case.status,
    v_new_status::public.claim_status,
    p_reason,
    p_actor_user_id,
    coalesce(p_claim_event_metadata, '{}'::jsonb) || jsonb_build_object(
      'state_version', p_expected_version + 1,
      'domain_event_id', v_event.id,
      'idempotency_key', p_idempotency_key,
      'triggered_by', coalesce(p_triggered_by, 'system'),
      'triggered_at', now()
    )
  );

  if p_allow_closure_exception and coalesce(array_length(v_closure_blockers, 1), 0) > 0 then
    insert into public.case_exceptions (
      merchant_id, support_payout_case_id, exception_type, confidence, status,
      title, detail, context, subject_entity_type, subject_entity_id,
      source_system, dedup_key, resolution, resolved_by, resolved_at
    ) values (
      p_merchant_id, p_case_id, 'other', 'probable', 'resolved',
      'Case closed with a documented exception', p_reason,
      jsonb_build_object(
        'closure_blockers', to_jsonb(v_closure_blockers),
        'domain_event_id', v_event.id,
        'state_version', p_expected_version + 1
      ),
      'case', p_case_id::text, 'merchant_manual',
      'case-closure-exception:' || p_case_id::text || ':v' || (p_expected_version + 1)::text,
      p_reason, p_actor_user_id, now()
    );
  end if;

  return v_result || jsonb_build_object('domain_event_id', v_event.id);
end;
$function$;
CREATE FUNCTION public.transition_recovery_case(p_merchant_id uuid, p_recovery_case_id uuid, p_status public.recovery_case_status, p_event_type public.recovery_case_event_type, p_note text, p_amount_minor bigint, p_actor_user_id uuid, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_case public.recovery_cases;
  v_existing_event public.recovery_case_events;
  v_new_status public.recovery_case_status := p_status;
  v_approved bigint;
  v_recovered bigint;
  v_written_off bigint;
  v_delta bigint := 0;
  v_financial_event_type text := 'recovery.status_changed';
  v_domain_event public.domain_events;
  v_request jsonb;
  v_fingerprint text;
  v_result jsonb;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'recovery_idempotency_key_required' using errcode = '22023';
  end if;
  v_request := jsonb_build_object(
    'merchant_id', p_merchant_id,
    'recovery_case_id', p_recovery_case_id,
    'status', p_status,
    'event_type', p_event_type,
    'note', p_note,
    'amount_minor', p_amount_minor,
    'actor_user_id', p_actor_user_id
  );
  v_fingerprint := encode(extensions.digest(convert_to(v_request::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_existing_event
  from public.recovery_case_events
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing_event.metadata ->> 'request_fingerprint' is distinct from v_fingerprint then
      raise exception 'recovery_idempotency_conflict' using errcode = '22023';
    end if;
    return coalesce(v_existing_event.metadata -> 'transition_result', '{}'::jsonb)
      || jsonb_build_object('replayed', true);
  end if;

  select * into v_case
  from public.recovery_cases
  where merchant_id = p_merchant_id and id = p_recovery_case_id
  for update;
  if not found then raise exception 'recovery_case_not_found' using errcode = 'P0002'; end if;

  select * into v_existing_event
  from public.recovery_case_events
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing_event.metadata ->> 'request_fingerprint' is distinct from v_fingerprint then
      raise exception 'recovery_idempotency_conflict' using errcode = '22023';
    end if;
    return coalesce(v_existing_event.metadata -> 'transition_result', '{}'::jsonb)
      || jsonb_build_object('replayed', true);
  end if;

  v_approved := v_case.amount_approved_minor;
  v_recovered := v_case.amount_recovered_minor;
  v_written_off := v_case.amount_written_off_minor;

  if p_event_type in ('approved', 'partially_approved') then
    if p_amount_minor is null or p_amount_minor < 0 or p_amount_minor > v_case.amount_sought_minor then
      raise exception 'recovery_approved_amount_invalid' using errcode = '22023';
    end if;
    v_approved := p_amount_minor;
  elsif p_event_type = 'paid' then
    if p_amount_minor is null or p_amount_minor < v_recovered or p_amount_minor > v_case.amount_sought_minor then
      raise exception 'recovery_received_amount_invalid' using errcode = '22023';
    end if;
    if v_approved > 0 and p_amount_minor > v_approved then
      raise exception 'recovery_received_exceeds_approved' using errcode = '22023';
    end if;
    v_delta := p_amount_minor - v_recovered;
    v_recovered := p_amount_minor;
    v_financial_event_type := 'recovery.completed';
    if v_recovered + v_written_off < v_case.amount_sought_minor then
      v_new_status := 'partially_approved';
    else
      v_new_status := 'paid';
    end if;
  elsif p_event_type = 'closed' then
    if coalesce(length(trim(p_note)), 0) < 3 then
      raise exception 'recovery_close_reason_required' using errcode = '22023';
    end if;
    v_delta := greatest(v_case.amount_sought_minor - v_recovered - v_written_off, 0);
    v_written_off := v_written_off + v_delta;
    v_new_status := 'closed_unrecoverable';
    v_financial_event_type := 'loss.written_off';
  elsif p_amount_minor is not null then
    raise exception 'recovery_amount_not_allowed_for_action' using errcode = '22023';
  end if;

  if v_recovered + v_written_off > v_case.amount_sought_minor then
    raise exception 'recovery_amounts_exceed_sought' using errcode = '22023';
  end if;

  update public.recovery_cases
  set
    status = v_new_status,
    amount_approved_minor = v_approved,
    amount_recovered_minor = v_recovered,
    amount_written_off_minor = v_written_off,
    amount_recovered = v_recovered::numeric / 100,
    rejection_reason = case when v_new_status = 'rejected' then p_note else rejection_reason end,
    next_chase_at = case
      when v_new_status = 'submitted' then now() + interval '7 days'
      when v_new_status in ('paid', 'closed_unrecoverable') then null
      else next_chase_at
    end,
    last_chased_at = case when p_event_type = 'chased' then now() else last_chased_at end,
    updated_at = now()
  where id = v_case.id and merchant_id = p_merchant_id;

  if p_event_type = 'chased' then
    update public.recovery_cases
    set status = 'waiting_response', next_chase_at = now() + interval '7 days', updated_at = now()
    where id = v_case.id and merchant_id = p_merchant_id;
    v_new_status := 'waiting_response';
  end if;

  update public.support_payout_cases
  set
    recovery_state = case
      when v_new_status = 'submitted' then 'recovery_submitted'
      when v_new_status = 'paid' then 'recovery_paid'
      when v_new_status = 'closed_unrecoverable' then 'closed_unrecoverable'
      else recovery_state
    end,
    state_version = state_version + 1,
    updated_at = now()
  where merchant_id = p_merchant_id
    and id = v_case.support_payout_case_id;

  v_result := jsonb_build_object(
    'recovery_case_id', v_case.id,
    'status', v_new_status,
    'amount_sought_minor', v_case.amount_sought_minor,
    'amount_approved_minor', v_approved,
    'amount_recovered_minor', v_recovered,
    'amount_written_off_minor', v_written_off,
    'replayed', false
  );

  insert into public.recovery_case_events (
    merchant_id, recovery_case_id, event_type, from_status, to_status,
    note, metadata, idempotency_key
  ) values (
    p_merchant_id, v_case.id, p_event_type, v_case.status, v_new_status,
    p_note,
    jsonb_build_object(
      'request_fingerprint', v_fingerprint,
      'transition_result', v_result,
      'amount_delta_minor', v_delta,
      'amount_approved_minor', v_approved,
      'amount_recovered_minor', v_recovered,
      'amount_written_off_minor', v_written_off,
      'actor_user_id', p_actor_user_id
    ),
    p_idempotency_key
  );

  select * into v_domain_event
  from public.record_domain_event(
    p_merchant_id,
    v_financial_event_type,
    'recovery_case',
    v_case.support_payout_case_id,
    'recovery-action:' || p_idempotency_key,
    jsonb_build_object(
      'recovery_case_id', v_case.id,
      'loss_case_id', v_case.loss_case_id,
      'amount_minor', v_delta,
      'cumulative_amount_minor', case when p_event_type = 'paid' then v_recovered else v_written_off end,
      'currency', upper(v_case.currency),
      'status', v_new_status,
      'reason', p_note,
      'source', 'merchant_recovery_workflow'
    ),
    null, null, null,
    case when p_actor_user_id is null then 'system' else 'user' end,
    p_actor_user_id,
    now(), null, null,
    array['financialProjection', 'caseProjection', 'notificationProjection', 'auditTimelineProjection']
  );

  return v_result || jsonb_build_object('domain_event_id', v_domain_event.id);
end;
$function$;
REVOKE ALL ON FUNCTION public.try_claim_job_finalize(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.try_claim_job_finalize(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.try_claim_job_finalize(uuid) FROM service_role;
CREATE FUNCTION public.work_view_counts(p_merchant_id uuid, p_user_id uuid, p_now timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with active_tasks as (
    select *
    from public.work_tasks
    where merchant_id = p_merchant_id
      and status not in ('completed', 'cancelled')
  ),
  open_exceptions as (
    select *
    from public.case_exceptions
    where merchant_id = p_merchant_id
      and status = 'open'
  )
  select jsonb_build_object(
    'open', (select count(*) from active_tasks) + (select count(*) from open_exceptions),
    'mine', (select count(*) from active_tasks where owner_user_id = p_user_id),
    'unassigned', (select count(*) from active_tasks where owner_user_id is null),
    'due_today', (select count(*) from active_tasks where due_at >= date_trunc('day', p_now) and due_at < date_trunc('day', p_now) + interval '1 day')
      + (select count(*) from open_exceptions where due_at >= date_trunc('day', p_now) and due_at < date_trunc('day', p_now) + interval '1 day'),
    'no_sla', (select count(*) from active_tasks where due_at is null) + (select count(*) from open_exceptions where due_at is null),
    'blocked', (select count(*) from active_tasks where status = 'blocked'),
    'evidence_needed', (select count(*) from active_tasks where blocking_reason ilike '%evidence%'),
    'decision_needed', (select count(*) from active_tasks where title ilike '%decision%' or blocking_reason ilike '%decision%'),
    'integration_exceptions', (select count(*) from open_exceptions),
    'completed', (select count(*) from public.work_tasks where merchant_id = p_merchant_id and status = 'completed'),
    'overdue', (select count(*) from active_tasks where due_at < p_now)
      + (select count(*) from open_exceptions where due_at < p_now),
    'upcoming', (select count(*) from active_tasks where due_at >= date_trunc('day', p_now) + interval '1 day')
      + (select count(*) from open_exceptions where due_at >= date_trunc('day', p_now) + interval '1 day'),
    'unscheduled', (select count(*) from active_tasks where due_at is null) + (select count(*) from open_exceptions where due_at is null)
  );
$function$;
CREATE FUNCTION public.write_off_loss_case(p_merchant_id uuid, p_loss_case_id uuid, p_reason text, p_actor_user_id uuid, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_loss public.loss_cases;
  v_existing public.case_financial_entries;
  v_currency text;
  v_amount bigint;
  v_entry public.case_financial_entries;
  v_event public.domain_events;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'loss_writeoff_idempotency_key_required' using errcode = '22023';
  end if;
  if coalesce(length(trim(p_reason)), 0) < 3 then
    raise exception 'loss_writeoff_reason_required' using errcode = '22023';
  end if;

  select * into v_existing
  from public.case_financial_entries
  where merchant_id = p_merchant_id
    and idempotency_key = 'loss-writeoff:' || p_idempotency_key;
  if found then
    return jsonb_build_object('loss_case_id', p_loss_case_id, 'financial_entry_id', v_existing.id, 'replayed', true);
  end if;

  select * into v_loss
  from public.loss_cases
  where merchant_id = p_merchant_id and id = p_loss_case_id
  for update;
  if not found then raise exception 'loss_case_not_found' using errcode = 'P0002'; end if;
  if v_loss.written_off_at is not null then
    raise exception 'loss_already_written_off' using errcode = '22023';
  end if;

  v_currency := upper(v_loss.currency);
  if v_currency is null or v_currency !~ '^[A-Z]{3}$' then
    raise exception 'loss_writeoff_currency_unknown' using errcode = '22023';
  end if;
  select greatest(
    coalesce(sum(case when state = 'recoverable' then case when reverses_entry_id is null then amount_minor else -amount_minor end end), 0)
      - coalesce(sum(case when state = 'recovered' then case when reverses_entry_id is null then amount_minor else -amount_minor end end), 0)
      - coalesce(sum(case when state = 'written_off' then case when reverses_entry_id is null then amount_minor else -amount_minor end end), 0),
    0
  ) into v_amount
  from public.case_financial_entries
  where merchant_id = p_merchant_id
    and support_payout_case_id = v_loss.support_payout_case_id
    and currency = v_currency;
  if v_amount <= 0 then
    raise exception 'loss_writeoff_requires_outstanding_recovery' using errcode = '22023';
  end if;

  insert into public.case_financial_entries (
    merchant_id, support_payout_case_id, loss_case_id,
    state, amount_minor, currency, direction, effective_at,
    idempotency_key, metadata
  ) values (
    p_merchant_id, v_loss.support_payout_case_id, v_loss.id,
    'written_off', v_amount, v_currency, 'memo', now(),
    'loss-writeoff:' || p_idempotency_key,
    jsonb_build_object('reason', p_reason, 'actor_user_id', p_actor_user_id)
  ) returning * into v_entry;

  update public.loss_cases
  set status = 'closed_unrecoverable', written_off_at = now(), updated_at = now()
  where id = v_loss.id and merchant_id = p_merchant_id;

  insert into public.loss_case_events (
    merchant_id, loss_case_id, event_type, metadata_json
  ) values (
    p_merchant_id, v_loss.id, 'case_closed',
    jsonb_build_object(
      'action', 'write_off', 'reason', p_reason,
      'actor_user_id', p_actor_user_id,
      'amount_minor', v_amount, 'currency', v_currency,
      'financial_entry_id', v_entry.id,
      'idempotency_key', p_idempotency_key
    )
  );

  perform public.recompute_case_financial_summary(p_merchant_id, v_loss.support_payout_case_id);
  select * into v_event
  from public.record_domain_event(
    p_merchant_id, 'loss.written_off', 'loss_case', v_loss.id,
    'loss-writeoff-event:' || p_idempotency_key,
    jsonb_build_object(
      'loss_case_id', v_loss.id,
      'case_id', v_loss.support_payout_case_id,
      'amount_minor', v_amount,
      'currency', v_currency,
      'financial_entry_id', v_entry.id,
      'reason', p_reason
    ),
    null, null, null,
    case when p_actor_user_id is null then 'system' else 'user' end,
    p_actor_user_id, now(), null, null,
    array['caseProjection', 'notificationProjection', 'auditTimelineProjection']
  );

  return jsonb_build_object(
    'loss_case_id', v_loss.id,
    'financial_entry_id', v_entry.id,
    'domain_event_id', v_event.id,
    'amount_minor', v_amount,
    'currency', v_currency,
    'replayed', false
  );
end;
$function$;
-- Legacy access rows predate request-IP capture. Preserve them explicitly as
-- unavailable rather than inventing a client address, then enforce the
-- canonical non-null contract for future writes.
ALTER TABLE public.network_access_log DISABLE TRIGGER trg_network_access_log_noupd;
UPDATE public.network_access_log
SET request_ip = '0.0.0.0'::inet
WHERE request_ip IS NULL;
ALTER TABLE public.network_access_log ENABLE TRIGGER trg_network_access_log_noupd;
ALTER TABLE public.network_access_log ALTER COLUMN request_ip SET NOT NULL;
REVOKE ALL ON public.access_audit_log FROM anon;
REVOKE ALL ON public.access_audit_log FROM authenticated;
REVOKE ALL ON public.access_audit_log FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.access_audit_log FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
CREATE TABLE public.account_deletion_audit_receipts (id uuid DEFAULT gen_random_uuid() NOT NULL, merchant_reference uuid NOT NULL, actor_user_reference uuid NOT NULL, action text NOT NULL, correlation_id uuid NOT NULL, idempotency_reference text NOT NULL, effective_at timestamp with time zone NOT NULL, recorded_at timestamp with time zone DEFAULT now() NOT NULL, meaning text NOT NULL, metadata jsonb DEFAULT '{}'::jsonb NOT NULL);
CREATE FUNCTION public.record_account_deletion_receipt(p_merchant_id uuid, p_actor_user_id uuid, p_action text, p_correlation_id uuid, p_idempotency_reference text, p_effective_at timestamp with time zone DEFAULT now())
 RETURNS public.account_deletion_audit_receipts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_row public.account_deletion_audit_receipts;
begin
  insert into public.account_deletion_audit_receipts (
    merchant_reference, actor_user_reference, action, correlation_id,
    idempotency_reference, effective_at, meaning
  ) values (
    p_merchant_id, p_actor_user_id, p_action, p_correlation_id,
    p_idempotency_reference, coalesce(p_effective_at, now()),
    case p_action
      when 'account_deletion_requested' then 'Merchant account deletion requested'
      when 'auth_deletion_requested' then 'Authentication identity deletion requested'
      else 'Account deletion operation requested'
    end
  )
  on conflict (idempotency_reference) do nothing
  returning * into v_row;
  if v_row.id is null then
    select * into v_row from public.account_deletion_audit_receipts
      where idempotency_reference = p_idempotency_reference;
  end if;
  return v_row;
end;
$function$;
ALTER TABLE public.account_deletion_audit_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_audit_receipts ADD CONSTRAINT account_deletion_audit_receipts_action_check CHECK (action = ANY (ARRAY['account_deletion_requested'::text, 'auth_deletion_requested'::text]));
ALTER TABLE public.account_deletion_audit_receipts ADD CONSTRAINT account_deletion_audit_receipts_idempotency_reference_key UNIQUE (idempotency_reference);
ALTER TABLE public.account_deletion_audit_receipts ADD CONSTRAINT account_deletion_audit_receipts_pkey PRIMARY KEY (id);
CREATE TRIGGER trg_account_deletion_receipts_immutable BEFORE DELETE OR UPDATE ON public.account_deletion_audit_receipts FOR EACH ROW EXECUTE FUNCTION public.forbid_account_deletion_receipt_mutation();
REVOKE ALL ON public.accountability_events FROM anon;
REVOKE ALL ON public.accountability_events FROM authenticated;
REVOKE ALL ON public.accountability_events FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.accountability_events FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
REVOKE ALL ON public.agreement_clauses FROM anon;
REVOKE ALL ON public.agreement_clauses FROM authenticated;
REVOKE ALL ON public.agreement_clauses FROM service_role;
REVOKE ALL ON public.agreement_rule_evaluations FROM anon;
REVOKE ALL ON public.agreement_rule_evaluations FROM authenticated;
REVOKE ALL ON public.agreement_rule_evaluations FROM service_role;
REVOKE ALL ON public.agreement_rules FROM anon;
REVOKE ALL ON public.agreement_rules FROM authenticated;
REVOKE ALL ON public.agreement_rules FROM service_role;
REVOKE ALL ON public.agreements FROM anon;
REVOKE ALL ON public.agreements FROM authenticated;
REVOKE ALL ON public.agreements FROM service_role;
ALTER TABLE public.api_key_minute_counts DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_key_minute_counts FROM anon;
REVOKE ALL ON public.api_key_minute_counts FROM authenticated;
REVOKE ALL ON public.api_key_minute_counts FROM service_role;
REVOKE ALL ON public.audit_customer_summaries FROM anon;
REVOKE ALL ON public.audit_customer_summaries FROM authenticated;
REVOKE ALL ON public.audit_customer_summaries FROM service_role;
REVOKE ALL ON public.audit_result_summaries FROM anon;
REVOKE ALL ON public.audit_result_summaries FROM authenticated;
REVOKE ALL ON public.audit_result_summaries FROM service_role;
REVOKE ALL ON public.billing_events_log FROM anon;
REVOKE ALL ON public.billing_events_log FROM authenticated;
REVOKE ALL ON public.billing_events_log FROM service_role;
REVOKE ALL ON public.case_claimed_items FROM anon;
REVOKE ALL ON public.case_claimed_items FROM authenticated;
REVOKE ALL ON public.case_claimed_items FROM service_role;
ALTER TABLE public.case_clarification_requests ADD CONSTRAINT case_investigations_response_outcome_check CHECK (response_outcome IS NULL OR (response_outcome = ANY (ARRAY['issue_confirmed'::text, 'no_issue_found'::text, 'inconclusive'::text, 'referred_elsewhere'::text, 'no_response'::text])));
ALTER TABLE public.case_clarification_requests ADD CONSTRAINT case_investigations_source_channel_check CHECK (source_channel IS NULL OR (source_channel = ANY (ARRAY['email'::text, 'api'::text, 'manual'::text, 'portal'::text, 'gorgias'::text])));
ALTER TABLE public.case_clarification_requests ADD CONSTRAINT case_investigations_state_version_check CHECK (state_version >= 1);
ALTER TABLE public.case_clarification_requests ADD CONSTRAINT case_investigations_status_check CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'waiting_response'::text, 'response_received'::text, 'closed'::text, 'cancelled'::text]));
ALTER TABLE public.case_clarification_requests ADD CONSTRAINT case_investigations_target_type_check CHECK (target_type = ANY (ARRAY['carrier'::text, '3pl'::text, 'warehouse'::text, 'supplier'::text, 'customer'::text, 'internal'::text]));
ALTER TABLE public.case_clarification_requests ADD CONSTRAINT case_investigations_text_lengths_check CHECK (char_length(evidence_gap) >= 3 AND char_length(evidence_gap) <= 2000 AND char_length(subject) >= 1 AND char_length(subject) <= 500 AND char_length(request_body) >= 1 AND char_length(request_body) <= 20000 AND (recommended_reason IS NULL OR char_length(recommended_reason) <= 2000) AND (override_rationale IS NULL OR char_length(override_rationale) >= 5 AND char_length(override_rationale) <= 2000) AND (response_body IS NULL OR char_length(response_body) <= 50000) AND (response_summary IS NULL OR char_length(response_summary) <= 10000) AND (closure_reason IS NULL OR char_length(closure_reason) <= 2000));
REVOKE ALL ON public.case_clarification_requests FROM anon;
REVOKE ALL ON public.case_clarification_requests FROM authenticated;
REVOKE ALL ON public.case_clarification_requests FROM service_role;
CREATE INDEX case_investigations_waiting_idx ON public.case_clarification_requests (merchant_id, status, due_at) WHERE status = 'waiting_response'::text;
CREATE UNIQUE INDEX case_investigations_id_merchant_key ON public.case_clarification_requests (id, merchant_id);
CREATE UNIQUE INDEX case_investigations_one_open_primary ON public.case_clarification_requests (merchant_id, support_payout_case_id) WHERE is_primary AND (status = ANY (ARRAY['draft'::text, 'sent'::text, 'waiting_response'::text, 'response_received'::text]));
CREATE TRIGGER trg_case_investigation_snapshot BEFORE UPDATE ON public.case_clarification_requests FOR EACH ROW EXECUTE FUNCTION public.protect_sent_case_investigation_snapshot();
CREATE TRIGGER trg_case_investigations_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.case_clarification_requests FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
CREATE POLICY case_investigations_member_select ON public.case_clarification_requests FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id));
CREATE POLICY case_investigations_service_all ON public.case_clarification_requests TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.case_comment_events FROM anon;
REVOKE ALL ON public.case_comment_events FROM authenticated;
REVOKE ALL ON public.case_comment_events FROM service_role;
REVOKE ALL ON public.case_comments FROM anon;
REVOKE ALL ON public.case_comments FROM authenticated;
REVOKE ALL ON public.case_comments FROM service_role;
REVOKE ALL ON public.case_decisions FROM anon;
REVOKE ALL ON public.case_decisions FROM authenticated;
REVOKE ALL ON public.case_decisions FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.case_decisions FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
CREATE POLICY case_decisions_member_select ON public.case_decisions FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id));
ALTER TABLE public.case_exceptions ADD COLUMN priority text DEFAULT 'high'::text NOT NULL;
ALTER TABLE public.case_exceptions ADD CONSTRAINT case_exceptions_priority_check CHECK (priority = ANY (ARRAY['urgent'::text, 'high'::text, 'medium'::text, 'low'::text])) NOT VALID;
ALTER TABLE public.case_exceptions ADD COLUMN due_at timestamp with time zone;
ALTER TABLE public.case_exceptions ADD COLUMN deadline_kind text;
ALTER TABLE public.case_exceptions ADD CONSTRAINT case_exceptions_deadline_kind_check CHECK (deadline_kind IS NULL OR (deadline_kind = ANY (ARRAY['source'::text, 'partner'::text, 'merchant'::text, 'internal'::text]))) NOT VALID;
ALTER TABLE public.case_exceptions ADD COLUMN state_version bigint DEFAULT 1 NOT NULL;
REVOKE ALL ON public.case_exceptions FROM anon;
REVOKE ALL ON public.case_exceptions FROM authenticated;
REVOKE ALL ON public.case_exceptions FROM service_role;
CREATE INDEX case_exceptions_work_queue_idx ON public.case_exceptions (merchant_id, status, priority, due_at, created_at DESC);
CREATE TRIGGER trg_case_exceptions_state_version BEFORE UPDATE ON public.case_exceptions FOR EACH ROW EXECUTE FUNCTION public.bump_case_exception_state_version();
ALTER TABLE public.case_financial_entries ADD COLUMN idempotency_key text;
REVOKE ALL ON public.case_financial_entries FROM anon;
REVOKE ALL ON public.case_financial_entries FROM authenticated;
REVOKE ALL ON public.case_financial_entries FROM service_role;
CREATE UNIQUE INDEX case_financial_entries_merchant_idempotency_unique ON public.case_financial_entries (merchant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.case_financial_entries FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
ALTER TABLE public.case_financial_summaries ADD COLUMN known_states text[] DEFAULT '{}'::text[] NOT NULL;
REVOKE ALL ON public.case_financial_summaries FROM anon;
REVOKE ALL ON public.case_financial_summaries FROM authenticated;
REVOKE ALL ON public.case_financial_summaries FROM service_role;
CREATE TABLE public.case_investigation_attachments (id uuid DEFAULT gen_random_uuid() NOT NULL, merchant_id uuid NOT NULL, support_payout_case_id uuid NOT NULL, investigation_id uuid NOT NULL, file_path text, external_url text, original_filename text, safe_filename text, content_type text, size_bytes bigint, content_hash text, safety_status text DEFAULT 'pending'::text NOT NULL, safety_detail text, evidence_item_id uuid, created_by uuid, idempotency_key text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public.case_investigation_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_investigation_attachments ADD CONSTRAINT case_investigation_attachments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.case_investigation_attachments ADD CONSTRAINT case_investigation_attachments_evidence_item_id_fkey FOREIGN KEY (evidence_item_id) REFERENCES public.evidence_items(id) ON DELETE SET NULL;
ALTER TABLE public.case_investigation_attachments ADD CONSTRAINT case_investigation_attachments_hash_check CHECK (content_hash IS NULL OR content_hash ~ '^[0-9a-f]{64}$'::text);
ALTER TABLE public.case_investigation_attachments ADD CONSTRAINT case_investigation_attachments_investigation_merchant_fkey FOREIGN KEY (investigation_id, merchant_id) REFERENCES public.case_clarification_requests(id, merchant_id) ON DELETE CASCADE;
ALTER TABLE public.case_investigation_attachments ADD CONSTRAINT case_investigation_attachments_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
ALTER TABLE public.case_investigation_attachments ADD CONSTRAINT case_investigation_attachments_merchant_id_idempotency_key_key UNIQUE (merchant_id, idempotency_key);
ALTER TABLE public.case_investigation_attachments ADD CONSTRAINT case_investigation_attachments_pkey PRIMARY KEY (id);
ALTER TABLE public.case_investigation_attachments ADD CONSTRAINT case_investigation_attachments_size_check CHECK (size_bytes IS NULL OR size_bytes >= 1 AND size_bytes <= 10485760);
ALTER TABLE public.case_investigation_attachments ADD CONSTRAINT case_investigation_attachments_source_check CHECK (file_path IS NOT NULL AND external_url IS NULL OR file_path IS NULL AND external_url IS NOT NULL);
ALTER TABLE public.case_investigation_attachments ADD CONSTRAINT case_investigation_attachments_status_check CHECK (safety_status = ANY (ARRAY['pending'::text, 'clean'::text, 'rejected'::text, 'failed'::text]));
CREATE INDEX case_investigation_attachments_investigation_idx ON public.case_investigation_attachments (merchant_id, investigation_id, created_at DESC);
CREATE INDEX case_investigation_attachments_scan_idx ON public.case_investigation_attachments (safety_status, created_at) WHERE safety_status = 'pending'::text;
CREATE TRIGGER trg_case_investigation_attachments_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.case_investigation_attachments FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
CREATE TRIGGER trg_case_investigation_attachments_updated BEFORE UPDATE ON public.case_investigation_attachments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY case_investigation_attachments_member_select ON public.case_investigation_attachments FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id));
CREATE POLICY case_investigation_attachments_service_all ON public.case_investigation_attachments TO service_role USING (true) WITH CHECK (true);
CREATE TABLE public.case_investigation_dispatches (id uuid DEFAULT gen_random_uuid() NOT NULL, merchant_id uuid NOT NULL, investigation_id uuid NOT NULL, dispatch_kind text NOT NULL, channel text NOT NULL, idempotency_key text NOT NULL, request_hash text NOT NULL, status text DEFAULT 'requested'::text NOT NULL, lease_token uuid, leased_until timestamp with time zone, provider_message_id text, attempt_count integer DEFAULT 0 NOT NULL, last_error text, accepted_at timestamp with time zone, created_by uuid, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public.case_investigation_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_investigation_dispatches ADD CONSTRAINT case_investigation_dispatches_attempt_count_check CHECK (attempt_count >= 0);
ALTER TABLE public.case_investigation_dispatches ADD CONSTRAINT case_investigation_dispatches_channel_check CHECK (channel = ANY (ARRAY['email'::text, 'manual'::text, 'portal'::text, 'api'::text]));
ALTER TABLE public.case_investigation_dispatches ADD CONSTRAINT case_investigation_dispatches_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.case_investigation_dispatches ADD CONSTRAINT case_investigation_dispatches_investigation_merchant_fkey FOREIGN KEY (investigation_id, merchant_id) REFERENCES public.case_clarification_requests(id, merchant_id) ON DELETE CASCADE;
ALTER TABLE public.case_investigation_dispatches ADD CONSTRAINT case_investigation_dispatches_kind_check CHECK (dispatch_kind = ANY (ARRAY['initial_request'::text, 'chase'::text]));
ALTER TABLE public.case_investigation_dispatches ADD CONSTRAINT case_investigation_dispatches_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
ALTER TABLE public.case_investigation_dispatches ADD CONSTRAINT case_investigation_dispatches_merchant_id_idempotency_key_key UNIQUE (merchant_id, idempotency_key);
ALTER TABLE public.case_investigation_dispatches ADD CONSTRAINT case_investigation_dispatches_pkey PRIMARY KEY (id);
ALTER TABLE public.case_investigation_dispatches ADD CONSTRAINT case_investigation_dispatches_request_hash_check CHECK (request_hash ~ '^[0-9a-f]{64}$'::text);
ALTER TABLE public.case_investigation_dispatches ADD CONSTRAINT case_investigation_dispatches_status_check CHECK (status = ANY (ARRAY['requested'::text, 'processing'::text, 'accepted'::text, 'failed'::text]));
CREATE INDEX case_investigation_dispatches_investigation_idx ON public.case_investigation_dispatches (merchant_id, investigation_id, created_at DESC);
CREATE INDEX case_investigation_dispatches_retry_idx ON public.case_investigation_dispatches (status, leased_until) WHERE status = ANY (ARRAY['requested'::text, 'processing'::text, 'failed'::text]);
CREATE TRIGGER trg_case_investigation_dispatches_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.case_investigation_dispatches FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
CREATE TRIGGER trg_case_investigation_dispatches_updated BEFORE UPDATE ON public.case_investigation_dispatches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY case_investigation_dispatches_member_select ON public.case_investigation_dispatches FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id));
CREATE POLICY case_investigation_dispatches_service_all ON public.case_investigation_dispatches TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.case_outcome_events FROM anon;
REVOKE ALL ON public.case_outcome_events FROM authenticated;
REVOKE ALL ON public.case_outcome_events FROM service_role;
REVOKE ALL ON public.case_outcomes FROM anon;
REVOKE ALL ON public.case_outcomes FROM authenticated;
REVOKE ALL ON public.case_outcomes FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.case_outcomes FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
CREATE POLICY case_outcomes_member_select ON public.case_outcomes FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id));
REVOKE ALL ON public.case_prevention_observations FROM anon;
REVOKE ALL ON public.case_prevention_observations FROM authenticated;
REVOKE ALL ON public.case_prevention_observations FROM service_role;
REVOKE ALL ON public.case_recommendation_snapshots FROM anon;
REVOKE ALL ON public.case_recommendation_snapshots FROM authenticated;
REVOKE ALL ON public.case_recommendation_snapshots FROM service_role;
REVOKE ALL ON public.category_applicability FROM anon;
REVOKE ALL ON public.category_applicability FROM authenticated;
REVOKE ALL ON public.category_applicability FROM service_role;
ALTER TABLE public.checkout_signal_order_links DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_signal_order_links FROM anon;
REVOKE ALL ON public.checkout_signal_order_links FROM authenticated;
REVOKE ALL ON public.checkout_signal_order_links FROM service_role;
ALTER TABLE public.checkout_signals ADD COLUMN idempotency_key text;
REVOKE ALL ON public.checkout_signals FROM anon;
REVOKE ALL ON public.checkout_signals FROM authenticated;
REVOKE ALL ON public.checkout_signals FROM service_role;
CREATE UNIQUE INDEX checkout_signals_merchant_idempotency_key_idx ON public.checkout_signals (merchant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
REVOKE ALL ON public.claim_events FROM anon;
REVOKE ALL ON public.claim_events FROM authenticated;
REVOKE ALL ON public.claim_events FROM service_role;
REVOKE ALL ON public.claim_evidence FROM anon;
REVOKE ALL ON public.claim_evidence FROM authenticated;
REVOKE ALL ON public.claim_evidence FROM service_role;
REVOKE ALL ON public.claim_outcomes FROM anon;
REVOKE ALL ON public.claim_outcomes FROM authenticated;
REVOKE ALL ON public.claim_outcomes FROM service_role;
REVOKE ALL ON public.comment_mentions FROM anon;
REVOKE ALL ON public.comment_mentions FROM authenticated;
REVOKE ALL ON public.comment_mentions FROM service_role;
REVOKE ALL ON public.connector_action_runs FROM anon;
REVOKE ALL ON public.connector_action_runs FROM authenticated;
REVOKE ALL ON public.connector_action_runs FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.connector_action_runs FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
REVOKE ALL ON public.context_credit_events FROM anon;
REVOKE ALL ON public.context_credit_events FROM authenticated;
REVOKE ALL ON public.context_credit_events FROM service_role;
REVOKE ALL ON public.correspondence_automation_settings FROM anon;
REVOKE ALL ON public.correspondence_automation_settings FROM authenticated;
REVOKE ALL ON public.correspondence_automation_settings FROM service_role;
REVOKE ALL ON public.credit_topup_log FROM anon;
REVOKE ALL ON public.credit_topup_log FROM authenticated;
REVOKE ALL ON public.credit_topup_log FROM service_role;
REVOKE ALL ON public.customer_claim_summary FROM anon;
REVOKE ALL ON public.customer_claim_summary FROM authenticated;
REVOKE ALL ON public.customer_claim_summary FROM service_role;
REVOKE ALL ON public.customer_identity_signals FROM anon;
REVOKE ALL ON public.customer_identity_signals FROM authenticated;
REVOKE ALL ON public.customer_identity_signals FROM service_role;
CREATE TABLE public.data_subject_erasure_receipts (id uuid DEFAULT gen_random_uuid() NOT NULL, merchant_id uuid NOT NULL, subject_reference uuid NOT NULL, merchant_customer_reference uuid, requested_by_user_reference uuid, idempotency_key text NOT NULL, scope_counts jsonb DEFAULT '{}'::jsonb NOT NULL, effective_at timestamp with time zone NOT NULL, recorded_at timestamp with time zone DEFAULT now() NOT NULL, meaning text DEFAULT 'Merchant-scoped data subject erasure completed'::text NOT NULL);
ALTER TABLE public.data_subject_erasure_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_subject_erasure_receipts ADD CONSTRAINT data_subject_erasure_receipts_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
ALTER TABLE public.data_subject_erasure_receipts ADD CONSTRAINT data_subject_erasure_receipts_merchant_id_idempotency_key_key UNIQUE (merchant_id, idempotency_key);
ALTER TABLE public.data_subject_erasure_receipts ADD CONSTRAINT data_subject_erasure_receipts_pkey PRIMARY KEY (id);
CREATE TRIGGER trg_data_subject_erasure_receipts_immutable BEFORE DELETE OR UPDATE ON public.data_subject_erasure_receipts FOR EACH ROW EXECUTE FUNCTION public.forbid_data_subject_erasure_receipt_mutation();
REVOKE ALL ON public.default_rule_templates FROM anon;
REVOKE ALL ON public.default_rule_templates FROM authenticated;
REVOKE ALL ON public.default_rule_templates FROM service_role;
REVOKE ALL ON public.document_upload_jobs FROM anon;
REVOKE ALL ON public.document_upload_jobs FROM authenticated;
REVOKE ALL ON public.document_upload_jobs FROM service_role;
REVOKE ALL ON public.domain_event_deliveries FROM anon;
REVOKE ALL ON public.domain_event_deliveries FROM authenticated;
REVOKE ALL ON public.domain_event_deliveries FROM service_role;
CREATE INDEX domain_event_deliveries_expired_lease_idx ON public.domain_event_deliveries (handler_name, leased_until) WHERE status = 'processing'::text;
REVOKE ALL ON public.domain_events FROM anon;
REVOKE ALL ON public.domain_events FROM authenticated;
REVOKE ALL ON public.domain_events FROM service_role;
REVOKE ALL ON public.entity_relationships FROM anon;
REVOKE ALL ON public.entity_relationships FROM authenticated;
REVOKE ALL ON public.entity_relationships FROM service_role;
ALTER TABLE public.evidence_download_tokens DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.evidence_download_tokens FROM anon;
REVOKE ALL ON public.evidence_download_tokens FROM authenticated;
REVOKE ALL ON public.evidence_download_tokens FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.evidence_download_tokens FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
REVOKE ALL ON public.evidence_items FROM anon;
REVOKE ALL ON public.evidence_items FROM authenticated;
REVOKE ALL ON public.evidence_items FROM service_role;
REVOKE ALL ON public.evidence_links FROM anon;
REVOKE ALL ON public.evidence_links FROM authenticated;
REVOKE ALL ON public.evidence_links FROM service_role;
CREATE POLICY evidence_links_member_select ON public.evidence_links FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id));
REVOKE ALL ON public.evidence_packages FROM anon;
REVOKE ALL ON public.evidence_packages FROM authenticated;
REVOKE ALL ON public.evidence_packages FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.evidence_packages FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
CREATE POLICY evidence_packages_member_select ON public.evidence_packages FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id));
REVOKE ALL ON public.external_clarification_requests FROM anon;
REVOKE ALL ON public.external_clarification_requests FROM authenticated;
REVOKE ALL ON public.external_clarification_requests FROM service_role;
REVOKE ALL ON public.external_correspondence FROM anon;
REVOKE ALL ON public.external_correspondence FROM authenticated;
REVOKE ALL ON public.external_correspondence FROM service_role;
REVOKE ALL ON public.extracted_partner_terms FROM anon;
REVOKE ALL ON public.extracted_partner_terms FROM authenticated;
REVOKE ALL ON public.extracted_partner_terms FROM service_role;
ALTER TABLE public.founding_merchant_applications DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.founding_merchant_applications FROM anon;
REVOKE ALL ON public.founding_merchant_applications FROM authenticated;
REVOKE ALL ON public.founding_merchant_applications FROM service_role;
REVOKE ALL ON public.helpdesk_connections FROM anon;
REVOKE ALL ON public.helpdesk_connections FROM authenticated;
REVOKE ALL ON public.helpdesk_connections FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.helpdesk_connections FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
REVOKE ALL ON public.identities FROM anon;
REVOKE ALL ON public.identities FROM authenticated;
REVOKE ALL ON public.identities FROM service_role;
REVOKE ALL ON public.identity_catch_events FROM anon;
REVOKE ALL ON public.identity_catch_events FROM authenticated;
REVOKE ALL ON public.identity_catch_events FROM service_role;
REVOKE ALL ON public.identity_edges FROM anon;
REVOKE ALL ON public.identity_edges FROM authenticated;
REVOKE ALL ON public.identity_edges FROM service_role;
REVOKE ALL ON public.identity_evidence_scores FROM anon;
REVOKE ALL ON public.identity_evidence_scores FROM authenticated;
REVOKE ALL ON public.identity_evidence_scores FROM service_role;
REVOKE ALL ON public.identity_link_candidates FROM anon;
REVOKE ALL ON public.identity_link_candidates FROM authenticated;
REVOKE ALL ON public.identity_link_candidates FROM service_role;
REVOKE ALL ON public.identity_members FROM anon;
REVOKE ALL ON public.identity_members FROM authenticated;
REVOKE ALL ON public.identity_members FROM service_role;
REVOKE ALL ON public.identity_notes FROM anon;
REVOKE ALL ON public.identity_notes FROM authenticated;
REVOKE ALL ON public.identity_notes FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.identity_notes FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
CREATE POLICY identity_notes_member_select ON public.identity_notes FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id));
REVOKE ALL ON public.identity_profiles FROM anon;
REVOKE ALL ON public.identity_profiles FROM authenticated;
REVOKE ALL ON public.identity_profiles FROM service_role;
REVOKE ALL ON public.identity_resolution_events FROM anon;
REVOKE ALL ON public.identity_resolution_events FROM authenticated;
REVOKE ALL ON public.identity_resolution_events FROM service_role;
REVOKE ALL ON public.identity_signals FROM anon;
REVOKE ALL ON public.identity_signals FROM authenticated;
REVOKE ALL ON public.identity_signals FROM service_role;
ALTER TABLE public.ingest_rate_limits DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ingest_rate_limits FROM anon;
REVOKE ALL ON public.ingest_rate_limits FROM authenticated;
REVOKE ALL ON public.ingest_rate_limits FROM service_role;
ALTER TABLE public.ingestion_events ADD COLUMN payload_purged_at timestamp with time zone;
REVOKE ALL ON public.ingestion_events FROM anon;
REVOKE ALL ON public.ingestion_events FROM authenticated;
REVOKE ALL ON public.ingestion_events FROM service_role;
CREATE INDEX ingestion_events_explicit_retention_idx ON public.ingestion_events (retention_deadline, status) WHERE retention_deadline IS NOT NULL AND payload_purged_at IS NULL;
REVOKE ALL ON public.ingestion_field_errors FROM anon;
REVOKE ALL ON public.ingestion_field_errors FROM authenticated;
REVOKE ALL ON public.ingestion_field_errors FROM service_role;
REVOKE ALL ON public.integration_credentials FROM anon;
REVOKE ALL ON public.integration_credentials FROM authenticated;
REVOKE ALL ON public.integration_credentials FROM service_role;
REVOKE ALL ON public.integration_documents FROM anon;
REVOKE ALL ON public.integration_documents FROM authenticated;
REVOKE ALL ON public.integration_documents FROM service_role;
REVOKE ALL ON public.integration_evidence_items FROM anon;
REVOKE ALL ON public.integration_evidence_items FROM authenticated;
REVOKE ALL ON public.integration_evidence_items FROM service_role;
REVOKE ALL ON public.loss_attribution_candidates FROM anon;
REVOKE ALL ON public.loss_attribution_candidates FROM authenticated;
REVOKE ALL ON public.loss_attribution_candidates FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.loss_attribution_candidates FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
CREATE POLICY loss_attribution_candidates_member_select ON public.loss_attribution_candidates FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id));
REVOKE ALL ON public.loss_case_events FROM anon;
REVOKE ALL ON public.loss_case_events FROM authenticated;
REVOKE ALL ON public.loss_case_events FROM service_role;
REVOKE ALL ON public.loss_case_evidence FROM anon;
REVOKE ALL ON public.loss_case_evidence FROM authenticated;
REVOKE ALL ON public.loss_case_evidence FROM service_role;
REVOKE ALL ON public.loss_cases FROM anon;
REVOKE ALL ON public.loss_cases FROM authenticated;
REVOKE ALL ON public.loss_cases FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.loss_cases FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
REVOKE ALL ON public.loss_sources FROM anon;
REVOKE ALL ON public.loss_sources FROM authenticated;
REVOKE ALL ON public.loss_sources FROM service_role;
ALTER TABLE public.merchant_api_keys ADD CONSTRAINT merchant_api_keys_id_merchant_id_key UNIQUE (id, merchant_id);
REVOKE ALL ON public.merchant_api_keys FROM anon;
REVOKE ALL ON public.merchant_api_keys FROM authenticated;
REVOKE ALL ON public.merchant_api_keys FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.merchant_api_keys FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
REVOKE ALL ON public.merchant_credits FROM anon;
REVOKE ALL ON public.merchant_credits FROM authenticated;
REVOKE ALL ON public.merchant_credits FROM service_role;
REVOKE ALL ON public.merchant_customer_signals FROM anon;
REVOKE ALL ON public.merchant_customer_signals FROM authenticated;
REVOKE ALL ON public.merchant_customer_signals FROM service_role;
ALTER TABLE public.merchant_customers ADD COLUMN erased_at timestamp with time zone;
ALTER TABLE public.merchant_customers ADD COLUMN erasure_receipt_id uuid;
REVOKE ALL ON public.merchant_customers FROM anon;
REVOKE ALL ON public.merchant_customers FROM authenticated;
REVOKE ALL ON public.merchant_customers FROM service_role;
REVOKE ALL ON public.merchant_identity_state FROM anon;
REVOKE ALL ON public.merchant_identity_state FROM authenticated;
REVOKE ALL ON public.merchant_identity_state FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.merchant_identity_state FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
CREATE POLICY merchant_identity_state_member_select ON public.merchant_identity_state FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id));
REVOKE ALL ON public.merchant_integrations FROM anon;
REVOKE ALL ON public.merchant_integrations FROM authenticated;
REVOKE ALL ON public.merchant_integrations FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.merchant_integrations FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
REVOKE ALL ON public.merchant_rule_versions FROM anon;
REVOKE ALL ON public.merchant_rule_versions FROM authenticated;
REVOKE ALL ON public.merchant_rule_versions FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.merchant_rule_versions FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
REVOKE ALL ON public.merchant_rules FROM anon;
REVOKE ALL ON public.merchant_rules FROM authenticated;
REVOKE ALL ON public.merchant_rules FROM service_role;
CREATE POLICY merchant_rules_member_select ON public.merchant_rules FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id));
REVOKE ALL ON public.merchant_subscriptions FROM anon;
REVOKE ALL ON public.merchant_subscriptions FROM authenticated;
REVOKE ALL ON public.merchant_subscriptions FROM service_role;
-- Six legacy owner seats are active but predate auth-user linkage. Preserve
-- those truthful records while enforcing the rule for every future write;
-- validation can complete once their real identities are linked.
ALTER TABLE public.merchant_users ADD CONSTRAINT merchant_users_owner_is_active CHECK (role <> 'owner'::public.member_role OR invite_status = 'active'::public.invite_status AND user_id IS NOT NULL) NOT VALID;
REVOKE ALL ON public.merchant_users FROM anon;
REVOKE ALL ON public.merchant_users FROM authenticated;
REVOKE ALL ON public.merchant_users FROM service_role;
CREATE UNIQUE INDEX merchant_users_one_active_owner ON public.merchant_users (merchant_id) WHERE role = 'owner'::public.member_role AND invite_status = 'active'::public.invite_status;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.merchant_users FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
CREATE CONSTRAINT TRIGGER trg_merchant_owner_cardinality AFTER INSERT OR DELETE OR UPDATE ON public.merchant_users DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.enforce_single_active_merchant_owner();
ALTER TABLE public.merchant_widget_tokens ADD CONSTRAINT merchant_widget_tokens_api_key_merchant_fkey FOREIGN KEY (api_key_id, merchant_id) REFERENCES public.merchant_api_keys(id, merchant_id) ON DELETE CASCADE;
REVOKE ALL ON public.merchant_widget_tokens FROM anon;
REVOKE ALL ON public.merchant_widget_tokens FROM authenticated;
REVOKE ALL ON public.merchant_widget_tokens FROM service_role;
REVOKE ALL ON public.merchants FROM anon;
REVOKE ALL ON public.merchants FROM authenticated;
REVOKE ALL ON public.merchants FROM service_role;
ALTER TABLE public.migration_orphans DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.migration_orphans FROM anon;
REVOKE ALL ON public.migration_orphans FROM authenticated;
REVOKE ALL ON public.migration_orphans FROM service_role;
REVOKE ALL ON public.network_access_log FROM anon;
REVOKE ALL ON public.network_access_log FROM authenticated;
REVOKE ALL ON public.network_access_log FROM service_role;
REVOKE ALL ON public.notification_preferences FROM anon;
REVOKE ALL ON public.notification_preferences FROM authenticated;
REVOKE ALL ON public.notification_preferences FROM service_role;
REVOKE ALL ON public.notifications FROM anon;
REVOKE ALL ON public.notifications FROM authenticated;
REVOKE ALL ON public.notifications FROM service_role;
REVOKE ALL ON public.oauth_connection_transactions FROM anon;
REVOKE ALL ON public.oauth_connection_transactions FROM authenticated;
REVOKE ALL ON public.oauth_connection_transactions FROM service_role;
REVOKE ALL ON public.order_claim_context FROM anon;
REVOKE ALL ON public.order_claim_context FROM authenticated;
REVOKE ALL ON public.order_claim_context FROM service_role;
REVOKE ALL ON public.pack_confirmations FROM anon;
REVOKE ALL ON public.pack_confirmations FROM authenticated;
REVOKE ALL ON public.pack_confirmations FROM service_role;
ALTER TABLE public.partner_recovery_rules ADD CONSTRAINT partner_recovery_rules_partner_merchant_fkey FOREIGN KEY (partner_id, merchant_id) REFERENCES public.partners(id, merchant_id) ON DELETE CASCADE;
REVOKE ALL ON public.partner_recovery_rules FROM anon;
REVOKE ALL ON public.partner_recovery_rules FROM authenticated;
REVOKE ALL ON public.partner_recovery_rules FROM service_role;
CREATE POLICY partner_recovery_rules_member_select ON public.partner_recovery_rules FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id));
REVOKE ALL ON public.partners FROM anon;
REVOKE ALL ON public.partners FROM authenticated;
REVOKE ALL ON public.partners FROM service_role;
CREATE POLICY partners_member_select ON public.partners FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id));
REVOKE ALL ON public.pending_provider_account_selections FROM anon;
REVOKE ALL ON public.pending_provider_account_selections FROM authenticated;
REVOKE ALL ON public.pending_provider_account_selections FROM service_role;
REVOKE ALL ON public.plans FROM anon;
REVOKE ALL ON public.plans FROM authenticated;
REVOKE ALL ON public.plans FROM service_role;
CREATE TABLE public.privacy_storage_cleanup_jobs (id uuid DEFAULT gen_random_uuid() NOT NULL, merchant_id uuid NOT NULL, erasure_receipt_id uuid NOT NULL, bucket text NOT NULL, object_path text NOT NULL, status text DEFAULT 'pending'::text NOT NULL, attempts integer DEFAULT 0 NOT NULL, max_attempts integer DEFAULT 8 NOT NULL, next_attempt_at timestamp with time zone DEFAULT now() NOT NULL, leased_by text, leased_until timestamp with time zone, last_error text, completed_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE FUNCTION public.claim_privacy_storage_cleanup_jobs(p_limit integer DEFAULT 50, p_worker_id text DEFAULT 'privacy-cleanup'::text, p_lease_seconds integer DEFAULT 60, p_receipt_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF public.privacy_storage_cleanup_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.privacy_storage_cleanup_jobs
     set status = 'dead_letter',
         last_error = coalesce(last_error, 'storage cleanup lease expired after final attempt'),
         leased_by = null,
         leased_until = null
   where status = 'processing'
     and leased_until <= now()
     and attempts >= max_attempts;

  return query
  with candidates as (
    select id
      from public.privacy_storage_cleanup_jobs
     where attempts < max_attempts
       and (p_receipt_id is null or erasure_receipt_id = p_receipt_id)
       and (
         (status in ('pending','failed') and next_attempt_at <= now())
         or (status = 'processing' and leased_until <= now())
       )
     order by coalesce(leased_until, next_attempt_at), created_at, id
     for update skip locked
     limit least(greatest(p_limit, 1), 500)
  )
  update public.privacy_storage_cleanup_jobs j
     set status = 'processing',
         attempts = j.attempts + 1,
         leased_by = p_worker_id,
         leased_until = now() + make_interval(secs => greatest(p_lease_seconds, 1))
    from candidates
   where j.id = candidates.id
  returning j.*;
end;
$function$;
ALTER TABLE public.privacy_storage_cleanup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_storage_cleanup_jobs ADD CONSTRAINT privacy_storage_cleanup_jobs_attempts_check CHECK (attempts >= 0);
ALTER TABLE public.privacy_storage_cleanup_jobs ADD CONSTRAINT privacy_storage_cleanup_jobs_erasure_receipt_id_bucket_obje_key UNIQUE (erasure_receipt_id, bucket, object_path);
ALTER TABLE public.privacy_storage_cleanup_jobs ADD CONSTRAINT privacy_storage_cleanup_jobs_erasure_receipt_id_fkey FOREIGN KEY (erasure_receipt_id) REFERENCES public.data_subject_erasure_receipts(id) ON DELETE CASCADE;
ALTER TABLE public.privacy_storage_cleanup_jobs ADD CONSTRAINT privacy_storage_cleanup_jobs_max_attempts_check CHECK (max_attempts > 0);
ALTER TABLE public.privacy_storage_cleanup_jobs ADD CONSTRAINT privacy_storage_cleanup_jobs_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
ALTER TABLE public.privacy_storage_cleanup_jobs ADD CONSTRAINT privacy_storage_cleanup_jobs_pkey PRIMARY KEY (id);
ALTER TABLE public.privacy_storage_cleanup_jobs ADD CONSTRAINT privacy_storage_cleanup_jobs_status_check CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'failed'::text, 'completed'::text, 'dead_letter'::text]));
CREATE INDEX privacy_storage_cleanup_claim_idx ON public.privacy_storage_cleanup_jobs (status, next_attempt_at, leased_until) WHERE status = ANY (ARRAY['pending'::text, 'processing'::text, 'failed'::text]);
CREATE INDEX privacy_storage_cleanup_merchant_idx ON public.privacy_storage_cleanup_jobs (merchant_id, created_at DESC);
CREATE TRIGGER trg_privacy_storage_cleanup_updated BEFORE UPDATE ON public.privacy_storage_cleanup_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.processed_webhooks ADD COLUMN payload_hash text;
ALTER TABLE public.processed_webhooks ADD COLUMN claim_token uuid;
ALTER TABLE public.processed_webhooks ADD COLUMN lease_expires_at timestamp with time zone;
ALTER TABLE public.processed_webhooks ADD COLUMN object_key text;
ALTER TABLE public.processed_webhooks ADD COLUMN event_version bigint;
ALTER TABLE public.processed_webhooks ADD COLUMN result_payload jsonb;
REVOKE ALL ON public.processed_webhooks FROM anon;
REVOKE ALL ON public.processed_webhooks FROM authenticated;
REVOKE ALL ON public.processed_webhooks FROM service_role;
CREATE INDEX processed_webhooks_object_version_idx ON public.processed_webhooks (provider, store_key, object_key, event_version DESC) WHERE object_key IS NOT NULL AND event_version IS NOT NULL;
CREATE INDEX processed_webhooks_processing_lease_idx ON public.processed_webhooks (lease_expires_at) WHERE status = 'processing'::text;
ALTER TABLE public.profile_view_tokens DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_view_tokens FROM anon;
REVOKE ALL ON public.profile_view_tokens FROM authenticated;
REVOKE ALL ON public.profile_view_tokens FROM service_role;
REVOKE ALL ON public.provider_credit_records FROM anon;
REVOKE ALL ON public.provider_credit_records FROM authenticated;
REVOKE ALL ON public.provider_credit_records FROM service_role;
REVOKE ALL ON public.record_match_candidates FROM anon;
REVOKE ALL ON public.record_match_candidates FROM authenticated;
REVOKE ALL ON public.record_match_candidates FROM service_role;
REVOKE ALL ON public.record_match_resolutions FROM anon;
REVOKE ALL ON public.record_match_resolutions FROM authenticated;
REVOKE ALL ON public.record_match_resolutions FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.record_match_resolutions FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
REVOKE ALL ON public.recovery_case_events FROM anon;
REVOKE ALL ON public.recovery_case_events FROM authenticated;
REVOKE ALL ON public.recovery_case_events FROM service_role;
CREATE UNIQUE INDEX recovery_case_events_merchant_idempotency_unique ON public.recovery_case_events (merchant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
REVOKE ALL ON public.recovery_cases FROM anon;
REVOKE ALL ON public.recovery_cases FROM authenticated;
REVOKE ALL ON public.recovery_cases FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.recovery_cases FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
CREATE POLICY recovery_cases_member_select ON public.recovery_cases FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id));
REVOKE ALL ON public.recovery_claim_packs FROM anon;
REVOKE ALL ON public.recovery_claim_packs FROM authenticated;
REVOKE ALL ON public.recovery_claim_packs FROM service_role;
REVOKE ALL ON public.recovery_claim_submissions FROM anon;
REVOKE ALL ON public.recovery_claim_submissions FROM authenticated;
REVOKE ALL ON public.recovery_claim_submissions FROM service_role;
REVOKE ALL ON public.recovery_provider_responses FROM anon;
REVOKE ALL ON public.recovery_provider_responses FROM authenticated;
REVOKE ALL ON public.recovery_provider_responses FROM service_role;
REVOKE ALL ON public.recovery_tasks FROM anon;
REVOKE ALL ON public.recovery_tasks FROM authenticated;
REVOKE ALL ON public.recovery_tasks FROM service_role;
REVOKE ALL ON public.rule_evaluations FROM anon;
REVOKE ALL ON public.rule_evaluations FROM authenticated;
REVOKE ALL ON public.rule_evaluations FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.rule_evaluations FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
REVOKE ALL ON public.source_accounts FROM anon;
REVOKE ALL ON public.source_accounts FROM authenticated;
REVOKE ALL ON public.source_accounts FROM service_role;
REVOKE ALL ON public.source_addresses FROM anon;
REVOKE ALL ON public.source_addresses FROM authenticated;
REVOKE ALL ON public.source_addresses FROM service_role;
REVOKE ALL ON public.source_customers FROM anon;
REVOKE ALL ON public.source_customers FROM authenticated;
REVOKE ALL ON public.source_customers FROM service_role;
REVOKE ALL ON public.source_disputes FROM anon;
REVOKE ALL ON public.source_disputes FROM authenticated;
REVOKE ALL ON public.source_disputes FROM service_role;
REVOKE ALL ON public.source_fulfillments FROM anon;
REVOKE ALL ON public.source_fulfillments FROM authenticated;
REVOKE ALL ON public.source_fulfillments FROM service_role;
REVOKE ALL ON public.source_locations FROM anon;
REVOKE ALL ON public.source_locations FROM authenticated;
REVOKE ALL ON public.source_locations FROM service_role;
REVOKE ALL ON public.source_messages FROM anon;
REVOKE ALL ON public.source_messages FROM authenticated;
REVOKE ALL ON public.source_messages FROM service_role;
REVOKE ALL ON public.source_order_lines FROM anon;
REVOKE ALL ON public.source_order_lines FROM authenticated;
REVOKE ALL ON public.source_order_lines FROM service_role;
REVOKE ALL ON public.source_orders FROM anon;
REVOKE ALL ON public.source_orders FROM authenticated;
REVOKE ALL ON public.source_orders FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.source_orders FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
REVOKE ALL ON public.source_payments FROM anon;
REVOKE ALL ON public.source_payments FROM authenticated;
REVOKE ALL ON public.source_payments FROM service_role;
REVOKE ALL ON public.source_records FROM anon;
REVOKE ALL ON public.source_records FROM authenticated;
REVOKE ALL ON public.source_records FROM service_role;
REVOKE ALL ON public.source_refunds FROM anon;
REVOKE ALL ON public.source_refunds FROM authenticated;
REVOKE ALL ON public.source_refunds FROM service_role;
REVOKE ALL ON public.source_replacements FROM anon;
REVOKE ALL ON public.source_replacements FROM authenticated;
REVOKE ALL ON public.source_replacements FROM service_role;
REVOKE ALL ON public.source_returns FROM anon;
REVOKE ALL ON public.source_returns FROM authenticated;
REVOKE ALL ON public.source_returns FROM service_role;
REVOKE ALL ON public.source_shipment_lines FROM anon;
REVOKE ALL ON public.source_shipment_lines FROM authenticated;
REVOKE ALL ON public.source_shipment_lines FROM service_role;
REVOKE ALL ON public.source_shipments FROM anon;
REVOKE ALL ON public.source_shipments FROM authenticated;
REVOKE ALL ON public.source_shipments FROM service_role;
REVOKE ALL ON public.source_ticket_events FROM anon;
REVOKE ALL ON public.source_ticket_events FROM authenticated;
REVOKE ALL ON public.source_ticket_events FROM service_role;
REVOKE ALL ON public.source_tickets FROM anon;
REVOKE ALL ON public.source_tickets FROM authenticated;
REVOKE ALL ON public.source_tickets FROM service_role;
REVOKE ALL ON public.source_tracking_events FROM anon;
REVOKE ALL ON public.source_tracking_events FROM authenticated;
REVOKE ALL ON public.source_tracking_events FROM service_role;
REVOKE ALL ON public.source_transactions FROM anon;
REVOKE ALL ON public.source_transactions FROM authenticated;
REVOKE ALL ON public.source_transactions FROM service_role;
REVOKE ALL ON public.store_connections FROM anon;
REVOKE ALL ON public.store_connections FROM authenticated;
REVOKE ALL ON public.store_connections FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.store_connections FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
REVOKE ALL ON public.support_case_events FROM anon;
REVOKE ALL ON public.support_case_events FROM authenticated;
REVOKE ALL ON public.support_case_events FROM service_role;
REVOKE ALL ON public.support_case_intake FROM anon;
REVOKE ALL ON public.support_case_intake FROM authenticated;
REVOKE ALL ON public.support_case_intake FROM service_role;
ALTER TABLE public.support_payout_cases ADD CONSTRAINT support_payout_cases_id_merchant_id_key UNIQUE (id, merchant_id);
ALTER TABLE public.case_clarification_requests ADD CONSTRAINT case_investigations_case_merchant_fkey FOREIGN KEY (support_payout_case_id, merchant_id) REFERENCES public.support_payout_cases(id, merchant_id) ON DELETE CASCADE;
ALTER TABLE public.case_investigation_attachments ADD CONSTRAINT case_investigation_attachments_case_merchant_fkey FOREIGN KEY (support_payout_case_id, merchant_id) REFERENCES public.support_payout_cases(id, merchant_id) ON DELETE CASCADE;
ALTER TABLE public.support_payout_cases ADD COLUMN api_idempotency_key text;
ALTER TABLE public.support_payout_cases ADD COLUMN api_payload_hash text;
REVOKE ALL ON public.support_payout_cases FROM anon;
REVOKE ALL ON public.support_payout_cases FROM authenticated;
REVOKE ALL ON public.support_payout_cases FROM service_role;
CREATE UNIQUE INDEX support_payout_cases_api_idempotency_key_idx ON public.support_payout_cases (merchant_id, api_idempotency_key) WHERE api_idempotency_key IS NOT NULL;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.support_payout_cases FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
CREATE TRIGGER trg_protect_confirmed_case_responsibility BEFORE UPDATE ON public.support_payout_cases FOR EACH ROW EXECUTE FUNCTION public.protect_confirmed_case_responsibility();
REVOKE ALL ON public.support_provider_connections FROM anon;
REVOKE ALL ON public.support_provider_connections FROM authenticated;
REVOKE ALL ON public.support_provider_connections FROM service_role;
REVOKE ALL ON public.sync_job_chunks FROM anon;
REVOKE ALL ON public.sync_job_chunks FROM authenticated;
REVOKE ALL ON public.sync_job_chunks FROM service_role;
REVOKE ALL ON public.sync_jobs FROM anon;
REVOKE ALL ON public.sync_jobs FROM authenticated;
REVOKE ALL ON public.sync_jobs FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.sync_jobs FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
REVOKE ALL ON public.unmatched_correspondence FROM anon;
REVOKE ALL ON public.unmatched_correspondence FROM authenticated;
REVOKE ALL ON public.unmatched_correspondence FROM service_role;
ALTER TABLE public.user_action_log ADD COLUMN domain_event_id uuid;
ALTER TABLE public.user_action_log ADD CONSTRAINT user_action_log_domain_event_id_fkey FOREIGN KEY (domain_event_id) REFERENCES public.domain_events(id) ON DELETE CASCADE;
ALTER TABLE public.user_action_log ADD COLUMN actor_type text DEFAULT 'user'::text NOT NULL;
ALTER TABLE public.user_action_log ADD COLUMN correlation_id uuid;
ALTER TABLE public.user_action_log ADD COLUMN idempotency_reference text;
ALTER TABLE public.user_action_log ADD COLUMN effective_at timestamp with time zone;
ALTER TABLE public.user_action_log ADD COLUMN recorded_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.user_action_log ADD COLUMN meaning text;
REVOKE ALL ON public.user_action_log FROM anon;
REVOKE ALL ON public.user_action_log FROM authenticated;
REVOKE ALL ON public.user_action_log FROM service_role;
CREATE UNIQUE INDEX user_action_log_domain_event_key ON public.user_action_log (domain_event_id);
CREATE INDEX user_action_log_correlation_idx ON public.user_action_log (merchant_id, correlation_id) WHERE correlation_id IS NOT NULL;
CREATE TRIGGER trg_user_action_log_immutable BEFORE DELETE OR UPDATE ON public.user_action_log FOR EACH ROW EXECUTE FUNCTION public.forbid_user_action_log_mutation();
REVOKE ALL ON public.user_permission_grants FROM anon;
REVOKE ALL ON public.user_permission_grants FROM authenticated;
REVOKE ALL ON public.user_permission_grants FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.user_permission_grants FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
REVOKE ALL ON public.webhook_logs FROM anon;
REVOKE ALL ON public.webhook_logs FROM authenticated;
REVOKE ALL ON public.webhook_logs FROM service_role;
REVOKE ALL ON public.work_saved_views FROM anon;
REVOKE ALL ON public.work_saved_views FROM authenticated;
REVOKE ALL ON public.work_saved_views FROM service_role;
REVOKE ALL ON public.work_tasks FROM anon;
REVOKE ALL ON public.work_tasks FROM authenticated;
REVOKE ALL ON public.work_tasks FROM service_role;
CREATE POLICY work_tasks_member_select ON public.work_tasks FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id));
REVOKE ALL ON public.workflow_definitions FROM anon;
REVOKE ALL ON public.workflow_definitions FROM authenticated;
REVOKE ALL ON public.workflow_definitions FROM service_role;
CREATE TRIGGER trg_durable_audit AFTER INSERT OR DELETE OR UPDATE ON public.workflow_definitions FOR EACH ROW EXECUTE FUNCTION public.capture_sensitive_audit_event();
REVOKE ALL ON public.workflow_runs FROM anon;
REVOKE ALL ON public.workflow_runs FROM authenticated;
REVOKE ALL ON public.workflow_runs FROM service_role;
REVOKE ALL ON public.workflow_step_runs FROM anon;
REVOKE ALL ON public.workflow_step_runs FROM authenticated;
REVOKE ALL ON public.workflow_step_runs FROM service_role;
REVOKE ALL ON public.commerce_store_connections FROM anon;
REVOKE ALL ON public.commerce_store_connections FROM authenticated;
REVOKE ALL ON public.commerce_store_connections FROM service_role;
ALTER VIEW public.reporting_case_dimensions RESET (security_invoker);
REVOKE ALL ON public.reporting_case_dimensions FROM anon;
REVOKE ALL ON public.reporting_case_dimensions FROM authenticated;
REVOKE ALL ON public.reporting_case_dimensions FROM service_role;
ALTER POLICY user_permission_grants_owner_write ON public.user_permission_grants USING ((public.merchant_role(merchant_id) = 'owner'::text));
ALTER POLICY user_permission_grants_owner_write ON public.user_permission_grants WITH CHECK ((public.merchant_role(merchant_id) = 'owner'::text));

-- These functions are created by the patch above, so their canonical grants
-- must be applied after creation rather than before it.
REVOKE ALL ON FUNCTION public.claim_domain_event_deliveries(text, integer, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.claim_domain_event_deliveries(text, integer, text, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.claim_domain_event_deliveries(text, integer, text, integer) FROM service_role;
REVOKE ALL ON FUNCTION public.forbid_domain_event_mutation() FROM anon;
REVOKE ALL ON FUNCTION public.forbid_domain_event_mutation() FROM authenticated;
REVOKE ALL ON FUNCTION public.forbid_domain_event_mutation() FROM service_role;
REVOKE ALL ON FUNCTION public.forbid_financial_entry_mutation() FROM anon;
REVOKE ALL ON FUNCTION public.forbid_financial_entry_mutation() FROM authenticated;
REVOKE ALL ON FUNCTION public.forbid_financial_entry_mutation() FROM service_role;
REVOKE ALL ON FUNCTION public.forbid_mutation() FROM anon;
REVOKE ALL ON FUNCTION public.forbid_mutation() FROM authenticated;
REVOKE ALL ON FUNCTION public.forbid_mutation() FROM service_role;
REVOKE ALL ON FUNCTION public.forbid_phase7_history_mutation() FROM anon;
REVOKE ALL ON FUNCTION public.forbid_phase7_history_mutation() FROM authenticated;
REVOKE ALL ON FUNCTION public.forbid_phase7_history_mutation() FROM service_role;
$canonical_schema_patch$;
  END IF;
END
$canonical_reconcile$;
