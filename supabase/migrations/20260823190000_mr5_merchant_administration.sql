-- MR5: explicit machine API authority. Empty scopes deliberately preserve
-- widget-backing and historical key rows without granting machine access.

alter table public.merchant_api_keys
  add column if not exists scopes text[] not null default '{}'::text[];

alter table public.merchant_api_keys
  drop constraint if exists merchant_api_keys_rate_limit_per_minute_check,
  add constraint merchant_api_keys_rate_limit_per_minute_check
    check (rate_limit_per_minute between 1 and 120),
  drop constraint if exists merchant_api_keys_scopes_check,
  add constraint merchant_api_keys_scopes_check check (
    scopes <@ array[
      'customers:read',
      'cases:read',
      'cases:write',
      'evidence:read',
      'evidence:write',
      'imports:read',
      'imports:write',
      'lookup:read'
    ]::text[]
  );

create index if not exists idx_merchant_api_keys_scopes
  on public.merchant_api_keys using gin (scopes);

comment on column public.merchant_api_keys.scopes is
  'Explicit machine API scopes. An empty array grants no machine API access and remains valid for historical or widget-backing credentials.';

-- Flow drafting and dry testing remain available, but the pilot has no proven
-- dispatcher/replay/failure-recovery contract. Freeze any historical active
-- version and keep publication unavailable at the server boundary.
update public.workflow_definitions
set active = false,
    updated_at = now()
where active = true;

-- The retained inbox has producers and interactions for these eight kinds
-- only. Remove historical product-shaped rows/preferences that no longer have
-- a real producer, then narrow the durable database contract to the same list
-- used by the server and Settings UI.
delete from public.notification_preferences
where kind not in (
  'assignment', 'mention', 'approaching_deadline', 'evidence_update',
  'decision_request', 'recovery_outcome', 'sync_failure',
  'high_value_case_alert'
);

delete from public.notifications
where kind not in (
  'assignment', 'mention', 'approaching_deadline', 'evidence_update',
  'decision_request', 'recovery_outcome', 'sync_failure',
  'high_value_case_alert'
);

alter table public.notification_preferences
  drop constraint if exists notification_preferences_kind_check,
  add constraint notification_preferences_kind_check check (kind in (
    'assignment', 'mention', 'approaching_deadline', 'evidence_update',
    'decision_request', 'recovery_outcome', 'sync_failure',
    'high_value_case_alert'
  ));

alter table public.notifications
  drop constraint if exists notifications_kind_check,
  add constraint notifications_kind_check check (kind in (
    'assignment', 'mention', 'approaching_deadline', 'evidence_update',
    'decision_request', 'recovery_outcome', 'sync_failure',
    'high_value_case_alert'
  ));

-- One stable, exact search projection replaces per-family client paging. The
-- route passes only permission-approved API types; this function still scopes
-- every branch directly to the merchant.
create or replace function public.workspace_search_page_v1(
  p_merchant_id uuid,
  p_query text,
  p_types text[],
  p_source text default 'all',
  p_result_type text default null,
  p_cursor_sort_at timestamptz default null,
  p_cursor_result_type text default null,
  p_cursor_id uuid default null,
  p_limit integer default 20
) returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
with query_value as (
  select lower(trim(p_query)) as value
), raw_results as (
  select
    'customers'::text as api_type,
    'customer'::text as result_type,
    coalesce(customer.merchant_customer_id, customer.id) as id,
    coalesce(nullif(trim(concat_ws(' ', customer.first_name, customer.last_name)), ''), customer.email, 'Customer ' || left(customer.id::text, 8)) as label,
    case when nullif(trim(concat_ws(' ', customer.first_name, customer.last_name)), '') is not null then customer.email else null end as sublabel,
    '/customers/' || coalesce(customer.merchant_customer_id, customer.id)::text as href,
    customer.updated_at as sort_at,
    customer.source::text as source,
    concat_ws(' ', customer.id::text, customer.external_id, customer.email, customer.first_name, customer.last_name, customer.phone) as search_text
  from public.source_customers customer
  where customer.merchant_id = p_merchant_id

  union all
  select
    'orders', 'order', orders.id,
    'Order ' || coalesce(nullif(orders.order_number, ''), orders.external_id, left(orders.id::text, 8)),
    concat_ws(' · ', coalesce(orders.email, orders.customer_email), orders.financial_status::text),
    '/orders/' || orders.id::text,
    orders.updated_at,
    orders.source::text,
    concat_ws(' ', orders.id::text, orders.external_id, orders.order_number, orders.email, orders.customer_email, orders.customer_name)
  from public.source_orders orders
  where orders.merchant_id = p_merchant_id

  union all
  select
    'cases', 'case', cases.id,
    'Case ' || left(cases.id::text, 8) || ' · ' || replace(cases.claim_type::text, '_', ' '),
    replace(cases.status::text, '_', ' '),
    '/cases/' || cases.id::text,
    cases.updated_at,
    coalesce(case_order.source::text, case_ticket.provider::text, nullif(lower(cases.case_origin), ''), 'manual'),
    concat_ws(' ', cases.id::text, cases.manual_reference, cases.claim_type::text, cases.reason_raw, cases.reason_normalized, case_order.external_id, case_order.order_number, case_order.email, case_ticket.external_id, case_ticket.subject)
  from public.support_payout_cases cases
  left join public.source_orders case_order
    on case_order.id = cases.source_order_id and case_order.merchant_id = cases.merchant_id
  left join public.source_tickets case_ticket
    on case_ticket.id = cases.source_ticket_id and case_ticket.merchant_id = cases.merchant_id
  where cases.merchant_id = p_merchant_id

  union all
  select
    'tickets', 'ticket', ticket.id,
    'Ticket ' || coalesce(ticket.external_id, left(ticket.id::text, 8)),
    concat_ws(' · ', ticket.subject, ticket.status),
    '/tickets/' || ticket.id::text,
    ticket.updated_at,
    ticket.provider::text,
    concat_ws(' ', ticket.id::text, ticket.external_id, ticket.subject, ticket.status)
  from public.source_tickets ticket
  where ticket.merchant_id = p_merchant_id

  union all
  select
    'shipments', 'shipment', shipment.id,
    'Shipment ' || coalesce(shipment.tracking_number, shipment.external_id, left(shipment.id::text, 8)),
    concat_ws(' · ', shipment.carrier, shipment.status),
    '/shipments/' || shipment.id::text,
    shipment.updated_at,
    coalesce(shipment_account.provider_id, shipment_order.source::text, 'manual'),
    concat_ws(' ', shipment.id::text, shipment.external_id, shipment.tracking_number, shipment.carrier, shipment.status)
  from public.source_shipments shipment
  left join public.source_accounts shipment_account
    on shipment_account.id = shipment.source_account_id and shipment_account.merchant_id = shipment.merchant_id
  left join public.source_orders shipment_order
    on shipment_order.id = shipment.source_order_id and shipment_order.merchant_id = shipment.merchant_id
  where shipment.merchant_id = p_merchant_id

  union all
  select
    'refunds', 'refund', refund.id,
    'Refund ' || coalesce(refund.external_id, left(refund.id::text, 8)),
    concat_ws(' · ', refund.amount::text, refund.currency, refund.reason),
    '/refunds/' || refund.id::text,
    refund.ingested_at,
    coalesce(refund_order.source::text, 'manual'),
    concat_ws(' ', refund.id::text, refund.external_id, refund.reason)
  from public.source_refunds refund
  left join public.source_orders refund_order
    on refund_order.id = refund.source_order_id and refund_order.merchant_id = refund.merchant_id
  where refund.merchant_id = p_merchant_id

  union all
  select
    'returns', 'return', returns.id,
    'Return ' || coalesce(returns.external_id, left(returns.id::text, 8)),
    concat_ws(' · ', returns.status, returns.source_status, returns.disposition),
    '/returns/' || returns.id::text,
    returns.updated_at,
    coalesce(return_account.provider_id, return_order.source::text, 'manual'),
    concat_ws(' ', returns.id::text, returns.external_id, returns.status, returns.source_status, returns.refund_reference, returns.replacement_reference)
  from public.source_returns returns
  left join public.source_accounts return_account
    on return_account.id = returns.source_account_id and return_account.merchant_id = returns.merchant_id
  left join public.source_orders return_order
    on return_order.id = returns.source_order_id and return_order.merchant_id = returns.merchant_id
  where returns.merchant_id = p_merchant_id

  union all
  select
    'disputes', 'dispute', dispute.id,
    'Dispute ' || coalesce(dispute.external_id, left(dispute.id::text, 8)),
    concat_ws(' · ', dispute.status, dispute.amount::text, dispute.currency),
    '/disputes/' || dispute.id::text,
    dispute.ingested_at,
    coalesce(dispute_order.source::text, 'manual'),
    concat_ws(' ', dispute.id::text, dispute.external_id, dispute.status, dispute.reason, dispute.dispute_type)
  from public.source_disputes dispute
  left join public.source_orders dispute_order
    on dispute_order.id = dispute.source_order_id and dispute_order.merchant_id = dispute.merchant_id
  where dispute.merchant_id = p_merchant_id

  union all
  select
    'losses', 'loss', loss.id,
    'Loss ' || left(loss.id::text, 8),
    concat_ws(' · ', replace(loss.status::text, '_', ' '), replace(loss.case_type, '_', ' ')),
    '/financials/losses/' || loss.id::text,
    loss.updated_at,
    coalesce(loss_order.source::text, 'manual'),
    concat_ws(' ', loss.id::text, loss.status::text, loss.case_type, loss.attribution, loss.counterparty_name)
  from public.loss_cases loss
  left join public.source_orders loss_order
    on loss_order.id = loss.order_id and loss_order.merchant_id = loss.merchant_id
  where loss.merchant_id = p_merchant_id

  union all
  select
    'recoveries', 'recovery', recovery.id,
    'Recovery ' || left(recovery.id::text, 8) || ' · ' || replace(recovery.recovery_type::text, '_', ' '),
    concat_ws(' · ', replace(recovery.status::text, '_', ' '), recovery.amount_sought_minor::text, recovery.currency),
    '/financials/recovery/' || recovery.id::text,
    recovery.updated_at,
    coalesce(recovery_order.source::text, recovery_ticket.provider::text, 'manual'),
    concat_ws(' ', recovery.id::text, recovery.recovery_type::text, recovery.status::text, recovery.provider_position, recovery.rejection_reason, recovery_case.manual_reference, recovery_order.order_number)
  from public.recovery_cases recovery
  join public.support_payout_cases recovery_case
    on recovery_case.id = recovery.support_payout_case_id and recovery_case.merchant_id = recovery.merchant_id
  left join public.source_orders recovery_order
    on recovery_order.id = recovery_case.source_order_id and recovery_order.merchant_id = recovery.merchant_id
  left join public.source_tickets recovery_ticket
    on recovery_ticket.id = recovery_case.source_ticket_id and recovery_ticket.merchant_id = recovery.merchant_id
  where recovery.merchant_id = p_merchant_id
), filtered_all as (
  select result.*
  from raw_results result
  cross join query_value query
  where result.api_type = any(p_types)
    and (p_source = 'all' or lower(result.source) = lower(p_source))
    and position(query.value in lower(result.search_text)) > 0
), type_counts as (
  select result_type, count(*)::integer as count
  from filtered_all
  group by result_type
), counts as (
  select jsonb_build_object('all', (select count(*) from filtered_all))
    || coalesce(jsonb_object_agg(result_type, count), '{}'::jsonb) as value
  from type_counts
), page_scope as (
  select * from filtered_all
  where p_result_type is null or result_type = p_result_type
), after_cursor as (
  select * from page_scope
  where p_cursor_sort_at is null
    or (sort_at, result_type, id) < (p_cursor_sort_at, p_cursor_result_type, p_cursor_id)
), page_rows as (
  select candidate.*, row_number() over (order by sort_at desc, result_type desc, id desc) as row_number
  from after_cursor candidate
  order by sort_at desc, result_type desc, id desc
  limit least(greatest(p_limit, 1), 50) + 1
), items as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'type', result_type,
    'id', id,
    'label', label,
    'sublabel', nullif(sublabel, ''),
    'href', href,
    'source', source,
    'sortAt', sort_at
  ) order by row_number) filter (where row_number <= least(greatest(p_limit, 1), 50)), '[]'::jsonb) as value
  from page_rows
)
select jsonb_build_object(
  'items', items.value,
  'counts', counts.value,
  'total', (select count(*) from page_scope),
  'hasMore', (select count(*) > least(greatest(p_limit, 1), 50) from page_rows)
)
from items cross join counts;
$$;

revoke all on function public.workspace_search_page_v1(uuid, text, text[], text, text, timestamptz, text, uuid, integer) from public, anon, authenticated;
grant execute on function public.workspace_search_page_v1(uuid, text, text[], text, text, timestamptz, text, uuid, integer) to service_role;

-- Workspace deletion is a durable, resumable workspace operation. It does not
-- delete the actor's auth identity: an identity can own or join another
-- workspace, and personal-account deletion is a separate contract.
create table if not exists public.workspace_deletion_jobs (
  id uuid primary key default gen_random_uuid(),
  merchant_reference uuid not null,
  actor_user_reference uuid not null,
  idempotency_key text not null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'failed', 'completed')),
  stage text not null default 'preflight'
    check (stage in ('preflight', 'storage_cleanup', 'database_cleanup', 'verification', 'completed')),
  attempts integer not null default 0 check (attempts >= 0),
  preflight jsonb not null default '{}'::jsonb,
  storage_manifest jsonb not null default '[]'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  verification jsonb not null default '{}'::jsonb,
  last_error text,
  receipt_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (actor_user_reference, merchant_reference, idempotency_key)
);

create index if not exists workspace_deletion_jobs_actor_status_idx
  on public.workspace_deletion_jobs (actor_user_reference, status, updated_at desc);

alter table public.workspace_deletion_jobs enable row level security;
revoke all on public.workspace_deletion_jobs from public, anon, authenticated;
grant all on public.workspace_deletion_jobs to service_role;

drop trigger if exists trg_workspace_deletion_jobs_updated on public.workspace_deletion_jobs;
create trigger trg_workspace_deletion_jobs_updated
  before update on public.workspace_deletion_jobs
  for each row execute function public.set_updated_at();

create table if not exists public.workspace_deletion_receipts (
  id uuid primary key default gen_random_uuid(),
  job_reference uuid not null unique,
  merchant_reference uuid not null,
  actor_user_reference uuid not null,
  idempotency_key text not null unique,
  verification jsonb not null,
  verified_at timestamptz not null default now(),
  meaning text not null default 'Manifested workspace storage and merchant-scoped database deletion verified; authentication identity retained'
);

alter table public.workspace_deletion_receipts enable row level security;
revoke all on public.workspace_deletion_receipts from public, anon, authenticated;
grant all on public.workspace_deletion_receipts to service_role;

create or replace function public.forbid_workspace_deletion_receipt_mutation()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  raise exception 'workspace_deletion_receipts is append-only (% not allowed)', tg_op;
end;
$function$;

drop trigger if exists trg_workspace_deletion_receipts_immutable on public.workspace_deletion_receipts;
create trigger trg_workspace_deletion_receipts_immutable
  before update or delete on public.workspace_deletion_receipts
  for each row execute function public.forbid_workspace_deletion_receipt_mutation();

-- MR4 credit events are append-only in normal operation. Workspace deletion
-- uses the same transaction-local purge authority as the other reconciliation
-- history tables; no general delete grant is introduced.
create or replace function public.protect_provider_credit_event_history()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_reconciliation_history_purge', true), '') = 'on' then
    return old;
  end if;
  raise exception 'provider_credit_events_are_append_only' using errcode = '55000';
end;
$function$;

create or replace function public.purge_merchant_reconciliation_history(p_merchant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  perform set_config('app.allow_reconciliation_history_purge', 'on', true);
  delete from public.provider_credit_events where merchant_id = p_merchant_id;
  delete from public.provider_credit_records where merchant_id = p_merchant_id;
  delete from public.case_outcome_events where merchant_id = p_merchant_id;
  delete from public.case_recommendation_snapshots where merchant_id = p_merchant_id;
  delete from public.source_shipment_lines where merchant_id = p_merchant_id;
  delete from public.case_claimed_items where merchant_id = p_merchant_id;
end;
$function$;

-- The database phase is one transaction. The job row deliberately has no
-- merchant FK, so it remains available if a later verification request must
-- resume after the workspace row has gone.
create or replace function public.purge_workspace_database_v1(
  p_job_id uuid,
  p_merchant_id uuid,
  p_actor_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_job public.workspace_deletion_jobs;
  v_deleted integer := 0;
begin
  select * into v_job
  from public.workspace_deletion_jobs
  where id = p_job_id
  for update;

  if v_job.id is null
     or v_job.merchant_reference <> p_merchant_id
     or v_job.actor_user_reference <> p_actor_user_id then
    raise exception 'workspace_deletion_job_mismatch' using errcode = '22023';
  end if;

  if v_job.stage not in ('database_cleanup', 'verification', 'completed') then
    raise exception 'workspace_deletion_database_stage_not_ready' using errcode = '22023';
  end if;

  if exists (select 1 from public.merchants where id = p_merchant_id) then
    perform set_config('app.allow_audit_purge', 'on', true);
    perform set_config('app.allow_domain_event_purge', 'on', true);
    perform set_config('app.allow_financial_purge', 'on', true);
    perform set_config('app.allow_history_purge', 'on', true);
    perform set_config('app.allow_reconciliation_history_purge', 'on', true);
    perform set_config('app.allow_privacy_receipt_purge', 'on', true);
    perform set_config('app.allow_recovery_claim_history_purge', 'on', true);

    -- Remove guarded append-only projections through their narrow purge
    -- contracts before the parent cascade, then remove the two RESTRICT
    -- connector rows explicitly.
    perform public.purge_merchant_source_agnostic(p_merchant_id);
    perform public.purge_merchant_reconciliation_history(p_merchant_id);
    perform public.purge_merchant_audit_projection(p_merchant_id);
    perform public.purge_merchant_privacy_records(p_merchant_id);

    delete from public.recovery_provider_responses where merchant_id = p_merchant_id;
    delete from public.recovery_claim_submissions where merchant_id = p_merchant_id;
    delete from public.recovery_claim_packs where merchant_id = p_merchant_id;
    delete from public.helpdesk_connections where merchant_id = p_merchant_id;
    delete from public.store_connections where merchant_id = p_merchant_id;

    delete from public.merchants where id = p_merchant_id;
    get diagnostics v_deleted = row_count;
    if v_deleted <> 1 then
      raise exception 'workspace_deletion_merchant_delete_failed' using errcode = 'P0001';
    end if;
  end if;

  update public.workspace_deletion_jobs
  set status = 'running',
      stage = 'verification',
      last_error = null,
      progress = progress || jsonb_build_object(
        'database_cleanup_completed_at', clock_timestamp(),
        'merchant_rows_deleted', v_deleted
      )
  where id = p_job_id;

  return jsonb_build_object(
    'merchant_row_absent', not exists (select 1 from public.merchants where id = p_merchant_id),
    'merchant_rows_deleted', v_deleted
  );
end;
$function$;

create or replace function public.finalize_workspace_deletion_v1(
  p_job_id uuid,
  p_verification jsonb
) returns public.workspace_deletion_receipts
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_job public.workspace_deletion_jobs;
  v_receipt public.workspace_deletion_receipts;
  v_verification jsonb;
begin
  select * into v_job
  from public.workspace_deletion_jobs
  where id = p_job_id
  for update;

  if v_job.id is null then
    raise exception 'workspace_deletion_job_not_found' using errcode = '22023';
  end if;
  if exists (select 1 from public.merchants where id = v_job.merchant_reference) then
    raise exception 'workspace_deletion_verification_failed' using errcode = 'P0001';
  end if;

  v_verification := coalesce(p_verification, '{}'::jsonb)
    || jsonb_build_object(
      'merchant_row_absent', true,
      'auth_identity_retained', true,
      'verified_at', clock_timestamp()
    );

  insert into public.workspace_deletion_receipts (
    job_reference,
    merchant_reference,
    actor_user_reference,
    idempotency_key,
    verification
  ) values (
    v_job.id,
    v_job.merchant_reference,
    v_job.actor_user_reference,
    'workspace-deletion:' || v_job.id::text,
    v_verification
  )
  on conflict (job_reference) do nothing
  returning * into v_receipt;

  if v_receipt.id is null then
    select * into v_receipt
    from public.workspace_deletion_receipts
    where job_reference = v_job.id;
  end if;

  update public.workspace_deletion_jobs
  set status = 'completed',
      stage = 'completed',
      verification = v_verification,
      receipt_id = v_receipt.id,
      completed_at = coalesce(completed_at, clock_timestamp()),
      last_error = null
  where id = v_job.id;

  return v_receipt;
end;
$function$;

revoke all on function public.forbid_workspace_deletion_receipt_mutation() from public, anon, authenticated;
revoke all on function public.purge_workspace_database_v1(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.finalize_workspace_deletion_v1(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.purge_workspace_database_v1(uuid, uuid, uuid) to service_role;
grant execute on function public.finalize_workspace_deletion_v1(uuid, jsonb) to service_role;

comment on table public.workspace_deletion_jobs is
  'Owner-authorised resumable workspace deletion state. Survives merchant deletion for retry and verification.';
comment on table public.workspace_deletion_receipts is
  'Immutable verification receipt for completed manifested workspace storage and database deletion; auth identity is retained.';

-- Merchant-scoped subject access export. The subject identifier follows the
-- erasure contract: either a canonical merchant_customer id or a source
-- customer id. Related arrays are complete for that resolved subject and are
-- returned as JSON so the HTTP boundary can provide one explicit contract.
create or replace function public.export_merchant_data_subject_v1(
  p_merchant_id uuid,
  p_subject_id uuid,
  p_requested_by uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_merchant_customer_id uuid;
  v_source_customer_ids uuid[] := '{}'::uuid[];
  v_order_ids uuid[] := '{}'::uuid[];
  v_ticket_ids uuid[] := '{}'::uuid[];
  v_case_ids uuid[] := '{}'::uuid[];
begin
  select id into v_merchant_customer_id
  from public.merchant_customers
  where merchant_id = p_merchant_id and id = p_subject_id;

  if v_merchant_customer_id is null then
    select merchant_customer_id into v_merchant_customer_id
    from public.source_customers
    where merchant_id = p_merchant_id and id = p_subject_id
    limit 1;
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

  return jsonb_build_object(
    'contract', 'unauth.subject-access.v1',
    'generated_at', clock_timestamp(),
    'merchant_reference', p_merchant_id,
    'subject_reference', p_subject_id,
    'requested_by_user_reference', p_requested_by,
    'scope', jsonb_build_object(
      'canonical_customer', true,
      'source_customers', true,
      'addresses', true,
      'orders_and_line_items', true,
      'payment_refund_fulfilment_and_return_facts', true,
      'shipment_lines_tracking_and_replacements', true,
      'tickets_messages_and_events', true,
      'cases_and_case_comments', true,
      'loss_and_recovery_records', true,
      'workspace_wide_records', false
    ),
    'records', jsonb_build_object(
      'canonical_customer', (
        select to_jsonb(row_value)
        from public.merchant_customers row_value
        where row_value.merchant_id = p_merchant_id and row_value.id = v_merchant_customer_id
      ),
      'source_customers', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.created_at, row_value.id)
        from public.source_customers row_value
        where row_value.merchant_id = p_merchant_id and row_value.id = any(v_source_customer_ids)
      ), '[]'::jsonb),
      'addresses', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.created_at, row_value.id)
        from public.source_addresses row_value
        where row_value.merchant_id = p_merchant_id and row_value.source_customer_id = any(v_source_customer_ids)
      ), '[]'::jsonb),
      'orders', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.placed_at, row_value.id)
        from public.source_orders row_value
        where row_value.merchant_id = p_merchant_id and row_value.id = any(v_order_ids)
      ), '[]'::jsonb),
      'order_lines', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.created_at, row_value.id)
        from public.source_order_lines row_value
        where row_value.merchant_id = p_merchant_id and row_value.source_order_id = any(v_order_ids)
      ), '[]'::jsonb),
      'payments', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.created_at, row_value.id)
        from public.source_payments row_value
        where row_value.merchant_id = p_merchant_id and row_value.source_order_id = any(v_order_ids)
      ), '[]'::jsonb),
      'transactions', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.created_at, row_value.id)
        from public.source_transactions row_value
        where row_value.merchant_id = p_merchant_id and row_value.source_order_id = any(v_order_ids)
      ), '[]'::jsonb),
      'refunds', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.ingested_at, row_value.id)
        from public.source_refunds row_value
        where row_value.merchant_id = p_merchant_id and row_value.source_order_id = any(v_order_ids)
      ), '[]'::jsonb),
      'fulfilments', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.ingested_at, row_value.id)
        from public.source_fulfillments row_value
        where row_value.merchant_id = p_merchant_id and row_value.source_order_id = any(v_order_ids)
      ), '[]'::jsonb),
      'shipments', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.created_at, row_value.id)
        from public.source_shipments row_value
        where row_value.merchant_id = p_merchant_id and row_value.source_order_id = any(v_order_ids)
      ), '[]'::jsonb),
      'shipment_lines', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.created_at, row_value.id)
        from public.source_shipment_lines row_value
        where row_value.merchant_id = p_merchant_id
          and row_value.source_shipment_id in (
            select shipment.id
            from public.source_shipments shipment
            where shipment.merchant_id = p_merchant_id and shipment.source_order_id = any(v_order_ids)
          )
      ), '[]'::jsonb),
      'tracking_events', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.event_at, row_value.id)
        from public.source_tracking_events row_value
        where row_value.merchant_id = p_merchant_id
          and row_value.source_shipment_id in (
            select shipment.id
            from public.source_shipments shipment
            where shipment.merchant_id = p_merchant_id and shipment.source_order_id = any(v_order_ids)
          )
      ), '[]'::jsonb),
      'replacements', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.created_at, row_value.id)
        from public.source_replacements row_value
        where row_value.merchant_id = p_merchant_id and row_value.source_order_id = any(v_order_ids)
      ), '[]'::jsonb),
      'returns', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.created_at, row_value.id)
        from public.source_returns row_value
        where row_value.merchant_id = p_merchant_id and row_value.source_order_id = any(v_order_ids)
      ), '[]'::jsonb),
      'disputes', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.ingested_at, row_value.id)
        from public.source_disputes row_value
        where row_value.merchant_id = p_merchant_id and row_value.source_order_id = any(v_order_ids)
      ), '[]'::jsonb),
      'tickets', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.ingested_at, row_value.id)
        from public.source_tickets row_value
        where row_value.merchant_id = p_merchant_id and row_value.id = any(v_ticket_ids)
      ), '[]'::jsonb),
      'messages', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.created_at, row_value.id)
        from public.source_messages row_value
        where row_value.merchant_id = p_merchant_id and row_value.source_ticket_id = any(v_ticket_ids)
      ), '[]'::jsonb),
      'ticket_events', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.occurred_at, row_value.id)
        from public.source_ticket_events row_value
        where row_value.merchant_id = p_merchant_id and row_value.source_ticket_id = any(v_ticket_ids)
      ), '[]'::jsonb),
      'cases', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.created_at, row_value.id)
        from public.support_payout_cases row_value
        where row_value.merchant_id = p_merchant_id and row_value.id = any(v_case_ids)
      ), '[]'::jsonb),
      'case_comments', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.created_at, row_value.id)
        from public.case_comments row_value
        where row_value.merchant_id = p_merchant_id and row_value.support_payout_case_id = any(v_case_ids)
      ), '[]'::jsonb),
      'losses', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.created_at, row_value.id)
        from public.loss_cases row_value
        where row_value.merchant_id = p_merchant_id and row_value.support_payout_case_id = any(v_case_ids)
      ), '[]'::jsonb),
      'recoveries', coalesce((
        select jsonb_agg(to_jsonb(row_value) order by row_value.created_at, row_value.id)
        from public.recovery_cases row_value
        where row_value.merchant_id = p_merchant_id and row_value.support_payout_case_id = any(v_case_ids)
      ), '[]'::jsonb)
    )
  );
end;
$function$;

revoke all on function public.export_merchant_data_subject_v1(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.export_merchant_data_subject_v1(uuid, uuid, uuid) to service_role;

notify pgrst, 'reload schema';
