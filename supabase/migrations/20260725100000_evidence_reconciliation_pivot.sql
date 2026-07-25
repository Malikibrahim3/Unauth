-- Evidence reconciliation pivot.
--
-- This is additive. The compatibility support_payout_cases fields remain in
-- place while item/parcel matches, independent recommendations, observed
-- outcomes, and provider credits move to append-only canonical records.

create table if not exists public.case_claimed_items (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  support_payout_case_id uuid not null references public.support_payout_cases(id) on delete cascade,
  source_order_line_id uuid references public.source_order_lines(id) on delete set null,
  source_evidence_item_id uuid references public.evidence_items(id) on delete set null,
  claimed_sku text,
  claimed_variant_ref text,
  claimed_title text,
  claimed_quantity integer not null default 1 check (claimed_quantity > 0),
  extraction_method text not null default 'agent_selected'
    check (extraction_method in ('deterministic', 'ai_suggestion', 'agent_selected', 'imported')),
  match_status text not null default 'unmatched'
    check (match_status in ('unmatched', 'candidate', 'confirmed', 'rejected')),
  match_method text,
  match_confidence numeric(5,4) check (match_confidence is null or (match_confidence >= 0 and match_confidence <= 1)),
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_shipment_lines (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  source_shipment_id uuid not null references public.source_shipments(id) on delete cascade,
  source_order_line_id uuid references public.source_order_lines(id) on delete set null,
  source_fulfillment_id uuid references public.source_fulfillments(id) on delete set null,
  external_id text not null,
  external_product_ref text,
  sku text,
  variant_ref text,
  quantity_recorded integer not null default 0 check (quantity_recorded >= 0),
  record_kind text not null default 'system_record',
  evidence_basis text not null default 'system_record',
  source_record_id uuid references public.source_records(id) on delete set null,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, source_shipment_id, external_id, record_kind)
);

create table if not exists public.case_recommendation_snapshots (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  support_payout_case_id uuid not null references public.support_payout_cases(id) on delete cascade,
  recommendation_type text not null
    check (recommendation_type in ('customer_action', 'responsibility', 'recovery')),
  result_code text not null,
  assessment_state text not null
    check (assessment_state in ('known', 'likely', 'unresolved', 'not_applicable', 'blocked')),
  headline text not null,
  explanation text not null,
  reason_codes text[] not null default '{}'::text[],
  supporting_evidence_ids uuid[] not null default '{}'::uuid[],
  conflicting_evidence_ids uuid[] not null default '{}'::uuid[],
  missing_evidence text[] not null default '{}'::text[],
  recheck_at timestamptz,
  merchant_rule_version_id uuid references public.merchant_rule_versions(id) on delete set null,
  partner_recovery_rule_version_id uuid,
  policy_snapshot jsonb not null default '{}'::jsonb,
  input_hash text not null,
  engine_version text not null,
  supersedes_snapshot_id uuid references public.case_recommendation_snapshots(id) on delete set null,
  generated_at timestamptz not null default now(),
  generated_by text not null default 'system',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.case_outcome_events (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  support_payout_case_id uuid not null references public.support_payout_cases(id) on delete cascade,
  case_claimed_item_id uuid references public.case_claimed_items(id) on delete set null,
  outcome_type text not null
    check (outcome_type in ('cash_refund', 'replacement', 'store_credit', 'goodwill_discount', 'no_payout', 'other_manual_concession')),
  state text not null
    check (state in ('reported', 'observed_pending', 'observed_success', 'observed_failed', 'reversed', 'merchant_confirmed')),
  source_system text not null,
  source_record_id uuid,
  source_external_id text,
  correlation_method text,
  match_status text not null default 'matched'
    check (match_status in ('unmatched', 'candidate', 'matched', 'rejected')),
  amount_minor bigint,
  retail_value_minor bigint,
  currency text,
  occurred_at timestamptz,
  observed_at timestamptz not null default now(),
  recommended_snapshot_id uuid references public.case_recommendation_snapshots(id) on delete set null,
  followed_recommendation boolean,
  override_reason text,
  actor_user_id uuid references auth.users(id) on delete set null,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (merchant_id, idempotency_key)
);

create table if not exists public.provider_credit_records (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  provider text not null,
  source_account_id uuid references public.source_accounts(id) on delete set null,
  external_credit_id text not null,
  external_claim_id text,
  external_order_ref text,
  external_shipment_ref text,
  credit_type text not null default 'credit'
    check (credit_type in ('credit', 'refund', 'settlement', 'adjustment', 'reversal')),
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null,
  occurred_at timestamptz,
  ingested_at timestamptz not null default now(),
  evidence_item_id uuid references public.evidence_items(id) on delete set null,
  source_record_id uuid references public.source_records(id) on delete set null,
  match_status text not null default 'unmatched'
    check (match_status in ('unmatched', 'candidate', 'matched', 'rejected')),
  recovery_case_id uuid references public.recovery_cases(id) on delete set null,
  support_payout_case_id uuid references public.support_payout_cases(id) on delete set null,
  match_method text,
  match_confidence numeric(5,4) check (match_confidence is null or (match_confidence >= 0 and match_confidence <= 1)),
  matched_by uuid references auth.users(id) on delete set null,
  matched_at timestamptz,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, idempotency_key)
);

alter table public.evidence_items
  add column if not exists fact_kind text not null default 'source_fact'
    check (fact_kind in ('source_fact', 'human_finding', 'inference'));
alter table public.evidence_items
  add column if not exists external_reference text;

alter table public.evidence_links
  add column if not exists case_claimed_item_id uuid references public.case_claimed_items(id) on delete cascade;
alter table public.evidence_links
  add column if not exists source_order_line_id uuid references public.source_order_lines(id) on delete cascade;
alter table public.evidence_links
  add column if not exists source_shipment_id uuid references public.source_shipments(id) on delete cascade;
alter table public.evidence_links
  add column if not exists source_shipment_line_id uuid references public.source_shipment_lines(id) on delete cascade;

alter table public.case_financial_entries
  add column if not exists ledger_kind text not null default 'legacy'
    check (ledger_kind in ('legacy', 'customer_concession', 'merchant_economic_loss', 'provider_recovery'));
alter table public.case_financial_entries
  add column if not exists component_type text;
alter table public.case_financial_entries
  add column if not exists valuation_basis text;
alter table public.case_financial_entries
  add column if not exists quantity numeric(12,3);
alter table public.case_financial_entries
  add column if not exists case_outcome_event_id uuid references public.case_outcome_events(id) on delete set null;
alter table public.case_financial_entries
  add column if not exists provider_credit_record_id uuid references public.provider_credit_records(id) on delete set null;

alter table public.recovery_cases
  add column if not exists provider_claim_stage text not null default 'prepared'
    check (provider_claim_stage in ('prepared', 'sent', 'acknowledged', 'approved', 'credited', 'reconciled', 'closed_unrecoverable'));

update public.recovery_cases
set provider_claim_stage = case
  when status::text in ('submitted', 'waiting_response', 'chase_due') then 'sent'
  when status::text in ('approved', 'partially_approved') then 'approved'
  when status::text = 'paid' then 'credited'
  when status::text = 'closed_unrecoverable' then 'closed_unrecoverable'
  else 'prepared'
end
where provider_claim_stage = 'prepared';

create index if not exists idx_case_claimed_items_case
  on public.case_claimed_items (merchant_id, support_payout_case_id, created_at);
create index if not exists idx_case_claimed_items_order_line
  on public.case_claimed_items (merchant_id, source_order_line_id)
  where source_order_line_id is not null;
create unique index if not exists idx_case_claimed_items_case_order_line
  on public.case_claimed_items (merchant_id, support_payout_case_id, source_order_line_id)
  where source_order_line_id is not null;
create index if not exists idx_source_shipment_lines_shipment
  on public.source_shipment_lines (merchant_id, source_shipment_id);
create index if not exists idx_source_shipment_lines_order_line
  on public.source_shipment_lines (merchant_id, source_order_line_id)
  where source_order_line_id is not null;
create index if not exists idx_reconciliation_snapshots_case_type
  on public.case_recommendation_snapshots (merchant_id, support_payout_case_id, recommendation_type, generated_at desc);
create unique index if not exists idx_reconciliation_snapshots_input
  on public.case_recommendation_snapshots (merchant_id, support_payout_case_id, recommendation_type, input_hash);
create index if not exists idx_case_outcome_events_case
  on public.case_outcome_events (merchant_id, support_payout_case_id, observed_at desc);
create index if not exists idx_provider_credit_records_match
  on public.provider_credit_records (merchant_id, match_status, occurred_at desc);
create index if not exists idx_provider_credit_records_case
  on public.provider_credit_records (merchant_id, support_payout_case_id)
  where support_payout_case_id is not null;

create or replace function public.protect_reconciliation_snapshot_history()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_reconciliation_history_purge', true), '') = 'on' then
    return old;
  end if;
  raise exception 'reconciliation_snapshot_is_append_only' using errcode = '55000';
end;
$function$;

drop trigger if exists trg_reconciliation_snapshot_append_only on public.case_recommendation_snapshots;
create trigger trg_reconciliation_snapshot_append_only
before update or delete on public.case_recommendation_snapshots
for each row execute function public.protect_reconciliation_snapshot_history();

create or replace function public.protect_case_outcome_history()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_reconciliation_history_purge', true), '') = 'on' then
    return old;
  end if;
  raise exception 'case_outcome_is_append_only' using errcode = '55000';
end;
$function$;

drop trigger if exists trg_case_outcome_append_only on public.case_outcome_events;
create trigger trg_case_outcome_append_only
before update or delete on public.case_outcome_events
for each row execute function public.protect_case_outcome_history();

drop trigger if exists trg_case_claimed_items_updated on public.case_claimed_items;
create trigger trg_case_claimed_items_updated
before update on public.case_claimed_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_source_shipment_lines_updated on public.source_shipment_lines;
create trigger trg_source_shipment_lines_updated
before update on public.source_shipment_lines
for each row execute function public.set_updated_at();

drop trigger if exists trg_provider_credit_records_updated on public.provider_credit_records;
create trigger trg_provider_credit_records_updated
before update on public.provider_credit_records
for each row execute function public.set_updated_at();

alter table public.case_claimed_items enable row level security;
alter table public.source_shipment_lines enable row level security;
alter table public.case_recommendation_snapshots enable row level security;
alter table public.case_outcome_events enable row level security;
alter table public.provider_credit_records enable row level security;

drop policy if exists case_claimed_items_member_select on public.case_claimed_items;
create policy case_claimed_items_member_select
  on public.case_claimed_items for select to authenticated
  using (public.is_merchant_member(merchant_id));
drop policy if exists source_shipment_lines_member_select on public.source_shipment_lines;
create policy source_shipment_lines_member_select
  on public.source_shipment_lines for select to authenticated
  using (public.is_merchant_member(merchant_id));
drop policy if exists reconciliation_snapshots_member_select on public.case_recommendation_snapshots;
create policy reconciliation_snapshots_member_select
  on public.case_recommendation_snapshots for select to authenticated
  using (public.is_merchant_member(merchant_id));
drop policy if exists case_outcome_events_member_select on public.case_outcome_events;
create policy case_outcome_events_member_select
  on public.case_outcome_events for select to authenticated
  using (public.is_merchant_member(merchant_id));
drop policy if exists provider_credit_records_member_select on public.provider_credit_records;
create policy provider_credit_records_member_select
  on public.provider_credit_records for select to authenticated
  using (public.is_merchant_member(merchant_id));

create or replace function public.purge_merchant_reconciliation_history(p_merchant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  perform set_config('app.allow_reconciliation_history_purge', 'on', true);
  delete from public.provider_credit_records where merchant_id = p_merchant_id;
  delete from public.case_outcome_events where merchant_id = p_merchant_id;
  delete from public.case_recommendation_snapshots where merchant_id = p_merchant_id;
  delete from public.source_shipment_lines where merchant_id = p_merchant_id;
  delete from public.case_claimed_items where merchant_id = p_merchant_id;
end;
$function$;

revoke all on function public.purge_merchant_reconciliation_history(uuid) from public;
grant execute on function public.purge_merchant_reconciliation_history(uuid) to service_role;

revoke insert, update, delete on public.case_claimed_items from anon, authenticated;
revoke insert, update, delete on public.source_shipment_lines from anon, authenticated;
revoke insert, update, delete on public.case_recommendation_snapshots from anon, authenticated;
revoke insert, update, delete on public.case_outcome_events from anon, authenticated;
revoke insert, update, delete on public.provider_credit_records from anon, authenticated;

comment on table public.case_recommendation_snapshots is
  'Append-only independent customer-action, responsibility, and recovery recommendations.';
comment on column public.evidence_items.fact_kind is
  'Whether the evidence is a source fact, human finding, or derived inference.';
comment on column public.recovery_cases.provider_claim_stage is
  'Settlement truth: approval is not credit, and credit is not reconciled recovery.';
