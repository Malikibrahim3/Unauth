-- Durable sensitive-action audit.
--
-- Sensitive business rows enqueue an immutable `audit.action_recorded` domain
-- event from an AFTER trigger.  Because the trigger and mutation share the
-- database transaction, an outbox failure aborts the mutation.  The existing
-- leased domain-event worker projects each event into `user_action_log` with a
-- unique domain_event_id, making delivery retries idempotent and observable.

begin;

alter table public.user_action_log
  alter column actor_user_id drop not null,
  add column if not exists domain_event_id uuid references public.domain_events(id) on delete cascade,
  add column if not exists actor_type text not null default 'user',
  add column if not exists correlation_id uuid,
  add column if not exists idempotency_reference text,
  add column if not exists effective_at timestamptz,
  add column if not exists recorded_at timestamptz not null default now(),
  add column if not exists meaning text;

create unique index if not exists user_action_log_domain_event_key
  on public.user_action_log(domain_event_id);
create index if not exists user_action_log_correlation_idx
  on public.user_action_log(merchant_id, correlation_id)
  where correlation_id is not null;

create or replace function public.forbid_user_action_log_mutation()
returns trigger
language plpgsql
as $$
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
$$;

drop trigger if exists trg_user_action_log_immutable on public.user_action_log;
create trigger trg_user_action_log_immutable
  before update or delete on public.user_action_log
  for each row execute function public.forbid_user_action_log_mutation();

-- Account erasure intentionally removes the merchant-scoped timeline. Keep a
-- minimal append-only operational receipt without a merchant/auth foreign key,
-- so the destructive request is still durable after the subject is erased.
create table if not exists public.account_deletion_audit_receipts (
  id uuid primary key default gen_random_uuid(),
  merchant_reference uuid not null,
  actor_user_reference uuid not null,
  action text not null check (action in ('account_deletion_requested','auth_deletion_requested')),
  correlation_id uuid not null,
  idempotency_reference text not null unique,
  effective_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  meaning text not null,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.account_deletion_audit_receipts enable row level security;
revoke all on public.account_deletion_audit_receipts from public, anon, authenticated;
grant all on public.account_deletion_audit_receipts to service_role;

create or replace function public.forbid_account_deletion_receipt_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'account_deletion_audit_receipts is append-only (% not allowed)', tg_op;
end;
$$;

drop trigger if exists trg_account_deletion_receipts_immutable on public.account_deletion_audit_receipts;
create trigger trg_account_deletion_receipts_immutable
  before update or delete on public.account_deletion_audit_receipts
  for each row execute function public.forbid_account_deletion_receipt_mutation();

create or replace function public.record_account_deletion_receipt(
  p_merchant_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_correlation_id uuid,
  p_idempotency_reference text,
  p_effective_at timestamptz default now()
) returns public.account_deletion_audit_receipts
language plpgsql
security definer
set search_path = public
as $$
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
$$;

create or replace function public.purge_merchant_audit_projection(p_merchant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.allow_audit_purge', 'on', true);
  delete from public.user_action_log where merchant_id = p_merchant_id;
end;
$$;

-- Return NULL rather than failing a sensitive transaction when a legacy actor
-- or resource identifier is not a UUID.  The original text remains in payload.
create or replace function public.audit_safe_uuid(p_value text)
returns uuid
language plpgsql
immutable
as $$
begin
  if p_value is null or p_value = '' then return null; end if;
  return p_value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create or replace function public.capture_sensitive_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
    v_row ->> 'grantor_user_id',
    v_row #>> '{metadata,actor_user_id}',
    v_row #>> '{metadata,actor_id}'
  ));
  v_actor_type := coalesce(nullif(v_row ->> 'actor_type', ''),
    case when v_actor_id is null then 'system' else 'user' end);
  v_actor_role := coalesce(nullif(v_row ->> 'audit_actor_role', ''),
    nullif(v_row #>> '{metadata,actor_role}', ''),
    case when v_actor_id is null then 'system' else 'unknown' end);
  v_correlation_id := public.audit_safe_uuid(coalesce(
    v_row ->> 'audit_correlation_id',
    v_row ->> 'correlation_id',
    v_row #>> '{metadata,correlation_id}'
  ));
  if v_correlation_id is null then v_correlation_id := gen_random_uuid(); end if;

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
      v_action := 'order_review_state_changed';
    when 'sync_jobs' then
      v_resource_type := 'processing_job';
      v_resource_id := v_row ->> 'id'; v_aggregate_id := public.audit_safe_uuid(v_resource_id);
      v_action := case when coalesce((v_new ->> 'hidden_by_merchant')::boolean, false)
        then 'processing_job_hidden' else 'processing_job_changed' end;
    when 'identity_notes' then
      v_resource_type := 'customer_note';
      v_action := case when tg_op = 'INSERT' then 'customer_note_added'
        when tg_op = 'DELETE' or coalesce((v_new ->> 'deleted_by_merchant')::boolean, false)
          then 'customer_note_deleted' else 'customer_note_changed' end;
    when 'merchant_identity_state' then
      v_resource_type := 'customer';
      v_action := case when coalesce((v_new ->> 'removed_by_merchant')::boolean, false)
        then 'customer_watchlist_removed' else 'customer_state_changed' end;
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
        'details', v_details
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
$$;

-- One trigger implementation covers the complete inventoried table set.  New
-- sensitive tables must opt in here (and receive a semantic case above) before
-- their mutation route can be considered audited.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'support_payout_cases','case_decisions','case_outcomes','case_financial_entries',
    'loss_cases','loss_attribution_candidates','recovery_cases','record_match_resolutions','merchant_rule_versions',
    'workflow_definitions','rule_evaluations','user_permission_grants','merchant_users','merchant_api_keys',
    'evidence_download_tokens','evidence_packages','merchant_integrations','store_connections',
    'helpdesk_connections','source_orders','sync_jobs','identity_notes',
    'merchant_identity_state','accountability_events','connector_action_runs',
    'access_audit_log'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('drop trigger if exists trg_durable_audit on public.%I', v_table);
      execute format(
        'create trigger trg_durable_audit after insert or update or delete on public.%I for each row execute function public.capture_sensitive_audit_event()',
        v_table
      );
    end if;
  end loop;
end $$;

comment on function public.capture_sensitive_audit_event() is
  'Atomically appends a durable audit domain event for an inventoried sensitive mutation; failure aborts the mutation.';

revoke all on function public.audit_safe_uuid(text) from public, anon, authenticated;
revoke all on function public.capture_sensitive_audit_event() from public, anon, authenticated;
revoke all on function public.forbid_account_deletion_receipt_mutation() from public, anon, authenticated;
revoke all on function public.record_account_deletion_receipt(uuid, uuid, text, uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.purge_merchant_audit_projection(uuid) from public, anon, authenticated;
grant execute on function public.audit_safe_uuid(text) to service_role;
grant execute on function public.capture_sensitive_audit_event() to service_role;
grant execute on function public.record_account_deletion_receipt(uuid, uuid, text, uuid, text, timestamptz) to service_role;
grant execute on function public.purge_merchant_audit_projection(uuid) to service_role;

notify pgrst, 'reload schema';
commit;
