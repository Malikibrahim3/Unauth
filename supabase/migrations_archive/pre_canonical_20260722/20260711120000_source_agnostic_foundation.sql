-- 20260711120000_source_agnostic_foundation.sql
--
-- Source-Agnostic MVP+ — Phase 1 foundation (additive only).
-- See docs/IMPL_source_agnostic_connected_ecosystem.md §4.
--
-- Adds the shared connection/provenance/event/relationship/finance foundation
-- WITHOUT moving existing production reads. Everything here is additive:
-- new tables, new nullable columns, widened CHECK constraints, and worker RPCs.
-- No destructive drops of populated columns/tables. No scoring/weight changes.

begin;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Extend merchant_integrations into the canonical connection model
-- ───────────────────────────────────────────────────────────────────────────
alter table public.merchant_integrations
  add column if not exists display_name           text,
  add column if not exists provider_account_id    text,
  add column if not exists provider_account_name  text,
  add column if not exists provider_base_url       text,
  add column if not exists capabilities_snapshot   jsonb not null default '{}'::jsonb,
  add column if not exists granted_scopes          text[] not null default '{}',
  add column if not exists writeback_enabled       boolean not null default false,
  add column if not exists subscribed              boolean not null default false,
  add column if not exists last_sync_started_at    timestamptz,
  add column if not exists last_sync_completed_at  timestamptz,
  add column if not exists last_successful_sync_at timestamptz,
  add column if not exists next_scheduled_sync_at  timestamptz,
  add column if not exists data_fresh_through      timestamptz,
  add column if not exists sync_cursor             jsonb,
  add column if not exists webhook_status          text,
  add column if not exists webhook_last_received_at timestamptz,
  add column if not exists imported_record_count   bigint not null default 0,
  add column if not exists last_error_code         text,
  add column if not exists last_error_message      text,
  add column if not exists last_error_at           timestamptz,
  add column if not exists connector_version       text,
  add column if not exists disconnected_at         timestamptz;

-- Widen status vocabulary (union of legacy + MVP+ states). Legacy values kept
-- so the 2 existing rows never violate. New: pending, degraded, revoked.
alter table public.merchant_integrations
  drop constraint if exists merchant_integrations_status_check;
alter table public.merchant_integrations
  add constraint merchant_integrations_status_check
  check (status in (
    'pending','connected','not_connected','degraded','syncing',
    'disabled','revoked','error','connection_error'
  ));

-- One merchant may hold multiple connections/accounts for the same provider.
-- Drop the provider-only unique; replace with account-scoped uniqueness.
-- NULLS NOT DISTINCT (PG15+) keeps one legacy row per (merchant, provider)
-- while allowing multiple distinct provider_account_id values.
alter table public.merchant_integrations
  drop constraint if exists merchant_integrations_merchant_id_provider_id_key;
create unique index if not exists merchant_integrations_account_key
  on public.merchant_integrations (merchant_id, provider_id, provider_account_id)
  nulls not distinct;

-- Credentials bind to a connection, not only (merchant, provider).
alter table public.integration_credentials
  add column if not exists connection_id uuid references public.merchant_integrations(id) on delete cascade,
  add column if not exists key_version    integer not null default 1,
  add column if not exists rotated_at      timestamptz;
create index if not exists idx_integration_credentials_connection
  on public.integration_credentials (connection_id) where connection_id is not null;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. source_accounts — one connection may expose one or more accounts/sites
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.source_accounts (
  id                    uuid primary key default gen_random_uuid(),
  merchant_id           uuid not null references public.merchants(id) on delete cascade,
  connection_id         uuid references public.merchant_integrations(id) on delete cascade,
  provider_id           text not null,
  external_account_id   text,
  display_name          text,
  base_url              text,
  is_synthetic          boolean not null default false, -- manual/CSV/API canonical account
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique nulls not distinct (merchant_id, connection_id, external_account_id)
);
create index if not exists idx_source_accounts_merchant on public.source_accounts (merchant_id);
create index if not exists idx_source_accounts_connection on public.source_accounts (connection_id) where connection_id is not null;
create trigger trg_source_accounts_updated before update on public.source_accounts
  for each row execute function set_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- 3. source_records — universal external-id / provenance registry
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.source_records (
  id                    uuid primary key default gen_random_uuid(),
  merchant_id           uuid not null references public.merchants(id) on delete cascade,
  connection_id         uuid references public.merchant_integrations(id) on delete set null,
  source_account_id     uuid references public.source_accounts(id) on delete set null,
  source_system         text not null,
  source_entity_type    text not null,
  external_id           text not null,
  canonical_entity_type text,
  canonical_entity_id   uuid,
  source_url            text,
  source_created_at     timestamptz,
  source_updated_at     timestamptz,
  ingested_at           timestamptz not null default now(),
  last_synced_at        timestamptz,
  sync_state            text not null default 'current'
                          check (sync_state in ('current','pending','stale','failed','deleted')),
  freshness_state       text not null default 'fresh'
                          check (freshness_state in ('fresh','ageing','stale','unknown')),
  connector_version     text,
  payload_hash          text,
  source_metadata       jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (merchant_id, connection_id, source_entity_type, external_id)
);
create index if not exists idx_source_records_merchant on public.source_records (merchant_id);
create index if not exists idx_source_records_canonical on public.source_records (merchant_id, canonical_entity_type, canonical_entity_id);
create index if not exists idx_source_records_lookup on public.source_records (merchant_id, source_entity_type, external_id);
create index if not exists idx_source_records_account on public.source_records (source_account_id) where source_account_id is not null;
create trigger trg_source_records_updated before update on public.source_records
  for each row execute function set_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- 4. ingestion_events — authenticated inbox (service-role only)
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.ingestion_events (
  id                    uuid primary key default gen_random_uuid(),
  merchant_id           uuid not null references public.merchants(id) on delete cascade,
  connection_id         uuid references public.merchant_integrations(id) on delete set null,
  source_system         text not null,
  source_account_ref    text,
  provider_event_id     text,
  event_type            text,
  idempotency_key       text not null,
  payload_hash          text not null,
  payload_ref           text,            -- pointer to private object storage
  payload               jsonb,           -- inline redacted/small payloads only
  status                text not null default 'pending'
                          check (status in ('pending','processing','normalized','failed','dead_letter','ignored')),
  attempts              integer not null default 0,
  max_attempts          integer not null default 8,
  next_attempt_at       timestamptz not null default now(),
  leased_by             text,
  leased_until          timestamptz,
  last_error            text,
  retention_deadline    timestamptz,
  received_at           timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (merchant_id, idempotency_key)
);
create index if not exists idx_ingestion_events_claim
  on public.ingestion_events (status, next_attempt_at) where status in ('pending','failed');
create index if not exists idx_ingestion_events_merchant on public.ingestion_events (merchant_id, received_at desc);
create trigger trg_ingestion_events_updated before update on public.ingestion_events
  for each row execute function set_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- 5. domain_events — immutable, merchant-readable outbox
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.domain_events (
  id                    uuid primary key default gen_random_uuid(),
  schema_version        integer not null default 1,
  merchant_id           uuid not null references public.merchants(id) on delete cascade,
  event_type            text not null,
  aggregate_type        text not null,
  aggregate_id          uuid,
  source_record_id      uuid references public.source_records(id) on delete set null,
  connection_id         uuid references public.merchant_integrations(id) on delete set null,
  ingestion_event_id    uuid references public.ingestion_events(id) on delete set null,
  actor_type            text not null default 'system',
  actor_id              uuid,
  idempotency_key       text not null,
  correlation_id        uuid,
  causation_id          uuid,
  occurred_at           timestamptz not null default now(),
  recorded_at           timestamptz not null default now(),
  payload               jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  unique (merchant_id, idempotency_key)
);
create index if not exists idx_domain_events_merchant on public.domain_events (merchant_id, occurred_at desc);
create index if not exists idx_domain_events_aggregate on public.domain_events (merchant_id, aggregate_type, aggregate_id);
create index if not exists idx_domain_events_type on public.domain_events (merchant_id, event_type);

-- Immutability: no update / no delete.
create or replace function public.forbid_domain_event_mutation() returns trigger
  language plpgsql as $$
begin
  raise exception 'domain_events is append-only (% not allowed)', tg_op;
end;
$$;
drop trigger if exists trg_domain_events_immutable on public.domain_events;
create trigger trg_domain_events_immutable
  before update or delete on public.domain_events
  for each row execute function public.forbid_domain_event_mutation();

-- ───────────────────────────────────────────────────────────────────────────
-- 6. domain_event_deliveries — per-handler delivery ledger
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.domain_event_deliveries (
  id                    uuid primary key default gen_random_uuid(),
  domain_event_id       uuid not null references public.domain_events(id) on delete cascade,
  merchant_id           uuid not null references public.merchants(id) on delete cascade,
  handler_name          text not null,
  status                text not null default 'pending'
                          check (status in ('pending','processing','completed','failed','dead_letter')),
  attempts              integer not null default 0,
  max_attempts          integer not null default 8,
  next_attempt_at       timestamptz not null default now(),
  leased_by             text,
  leased_until          timestamptz,
  last_error            text,
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (domain_event_id, handler_name)
);
create index if not exists idx_domain_event_deliveries_claim
  on public.domain_event_deliveries (handler_name, status, next_attempt_at)
  where status in ('pending','failed');
create trigger trg_domain_event_deliveries_updated before update on public.domain_event_deliveries
  for each row execute function set_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- 7. entity_relationships — the product graph (NOT the identity graph)
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.entity_relationships (
  id                uuid primary key default gen_random_uuid(),
  merchant_id       uuid not null references public.merchants(id) on delete cascade,
  from_entity_type  text not null,
  from_entity_id    uuid not null,
  to_entity_type    text not null,
  to_entity_id      uuid not null,
  relationship_type text not null,
  match_status      text not null default 'probable'
                      check (match_status in ('confirmed','probable','ambiguous','unmatched')),
  match_method      text
                      check (match_method is null or match_method in (
                        'external_reference','order_number','transaction_id','tracking_number',
                        'customer_id','email','manual','connector_declared')),
  confidence        numeric(5,4),
  evidence          jsonb not null default '{}'::jsonb,
  resolved_by       uuid,
  resolved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (merchant_id, from_entity_type, from_entity_id, to_entity_type, to_entity_id, relationship_type)
);
create index if not exists idx_entity_relationships_from on public.entity_relationships (merchant_id, from_entity_type, from_entity_id);
create index if not exists idx_entity_relationships_to on public.entity_relationships (merchant_id, to_entity_type, to_entity_id);
create index if not exists idx_entity_relationships_status on public.entity_relationships (merchant_id, match_status);
create trigger trg_entity_relationships_updated before update on public.entity_relationships
  for each row execute function set_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- 8. record_match_candidates + 9. record_match_resolutions
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.record_match_candidates (
  id                uuid primary key default gen_random_uuid(),
  merchant_id       uuid not null references public.merchants(id) on delete cascade,
  subject_entity_type text not null,
  subject_entity_id uuid not null,
  candidate_entity_type text not null,
  candidate_entity_id uuid not null,
  match_method      text not null,
  confidence        numeric(5,4),
  status            text not null default 'open'
                      check (status in ('open','selected','rejected','superseded')),
  evidence          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_match_candidates_subject on public.record_match_candidates (merchant_id, subject_entity_type, subject_entity_id, status);
create trigger trg_record_match_candidates_updated before update on public.record_match_candidates
  for each row execute function set_updated_at();

create table if not exists public.record_match_resolutions (
  id                uuid primary key default gen_random_uuid(),
  merchant_id       uuid not null references public.merchants(id) on delete cascade,
  subject_entity_type text not null,
  subject_entity_id uuid not null,
  selected_candidate_id uuid references public.record_match_candidates(id) on delete set null,
  prior_status      text,
  new_status        text not null,
  reason            text,
  resolved_by       uuid,
  resolved_at       timestamptz not null default now(),
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists idx_match_resolutions_subject on public.record_match_resolutions (merchant_id, subject_entity_type, subject_entity_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 10. case_financial_entries (append-only) + 11. case_financial_summaries
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.case_financial_entries (
  id                     uuid primary key default gen_random_uuid(),
  merchant_id            uuid not null references public.merchants(id) on delete cascade,
  support_payout_case_id uuid references public.support_payout_cases(id) on delete cascade,
  loss_case_id           uuid,
  recovery_case_id       uuid,
  state                  text not null check (state in (
                            'requested','exposed','approved','paid','estimated_loss',
                            'confirmed_loss','recoverable','recovered','prevented','written_off')),
  amount_minor           bigint not null check (amount_minor >= 0),
  currency               char(3) not null,
  direction              text not null default 'memo' check (direction in ('debit','credit','memo')),
  source_record_id       uuid references public.source_records(id) on delete set null,
  domain_event_id        uuid references public.domain_events(id) on delete set null,
  effective_at           timestamptz not null default now(),
  recorded_at            timestamptz not null default now(),
  reverses_entry_id      uuid references public.case_financial_entries(id) on delete set null,
  metadata               jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now()
);
create index if not exists idx_financial_entries_case on public.case_financial_entries (merchant_id, support_payout_case_id, currency);
create index if not exists idx_financial_entries_effective on public.case_financial_entries (merchant_id, effective_at);

-- Append-only: block updates/deletes.
create or replace function public.forbid_financial_entry_mutation() returns trigger
  language plpgsql as $$
begin
  raise exception 'case_financial_entries is append-only (% not allowed)', tg_op;
end;
$$;
drop trigger if exists trg_financial_entries_immutable on public.case_financial_entries;
create trigger trg_financial_entries_immutable
  before update or delete on public.case_financial_entries
  for each row execute function public.forbid_financial_entry_mutation();

create table if not exists public.case_financial_summaries (
  merchant_id            uuid not null references public.merchants(id) on delete cascade,
  support_payout_case_id uuid not null references public.support_payout_cases(id) on delete cascade,
  currency               char(3) not null,
  requested_minor        bigint not null default 0,
  exposed_minor          bigint not null default 0,
  approved_minor         bigint not null default 0,
  paid_minor             bigint not null default 0,
  estimated_loss_minor   bigint not null default 0,
  confirmed_loss_minor   bigint not null default 0,
  recoverable_minor      bigint not null default 0,
  recovered_minor        bigint not null default 0,
  prevented_minor        bigint not null default 0,
  written_off_minor      bigint not null default 0,
  last_event_id          uuid references public.case_financial_entries(id) on delete set null,
  updated_at             timestamptz not null default now(),
  primary key (merchant_id, support_payout_case_id, currency)
);

-- ───────────────────────────────────────────────────────────────────────────
-- 12. Extend sync_jobs / sync_job_chunks
-- ───────────────────────────────────────────────────────────────────────────
alter table public.sync_jobs
  add column if not exists connection_id     uuid references public.merchant_integrations(id) on delete set null,
  add column if not exists source_account_id uuid references public.source_accounts(id) on delete set null,
  add column if not exists cursor            jsonb,
  add column if not exists next_attempt_at   timestamptz,
  add column if not exists attempts          integer not null default 0,
  add column if not exists max_attempts      integer not null default 8,
  add column if not exists started_at        timestamptz,
  add column if not exists last_error_code   text;

alter table public.sync_jobs
  drop constraint if exists sync_jobs_job_kind_check;
alter table public.sync_jobs
  add constraint sync_jobs_job_kind_check check (job_kind in (
    'csv_audit','platform_backfill','helpdesk_backfill','reprocess',
    'initial_import','incremental_sync','webhook_replay','csv_import','api_import'
  ));

alter table public.sync_job_chunks
  add column if not exists attempts        integer not null default 0,
  add column if not exists max_attempts    integer not null default 8,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists last_error      text;

-- ───────────────────────────────────────────────────────────────────────────
-- 13. Extend support_payout_cases (origin, manual anchor, optimistic concurrency)
-- ───────────────────────────────────────────────────────────────────────────
alter table public.support_payout_cases
  add column if not exists case_origin       text not null default 'connector'
                             check (case_origin in ('connector','canonical_webhook','api','csv_import','manual')),
  add column if not exists manual_reference  text,
  add column if not exists manual_source_url text,
  add column if not exists state_version     bigint not null default 1,
  add column if not exists primary_currency  char(3);

-- Relax the anchor requirement: a manual/API/CSV case may exist without a source
-- order/ticket, but must then carry a manual_reference.
alter table public.support_payout_cases
  drop constraint if exists claims_anchor_required;
alter table public.support_payout_cases
  add constraint claims_anchor_required check (
    source_ticket_id is not null
    or source_order_id is not null
    or manual_reference is not null
  );

-- ───────────────────────────────────────────────────────────────────────────
-- 14. Worker RPCs (service-role): lease/claim with FOR UPDATE SKIP LOCKED
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.claim_ingestion_event(
  p_event_id uuid, p_worker_id text, p_lease_seconds integer default 60
) returns public.ingestion_events
  language plpgsql security definer set search_path = public as $$
declare
  v_row public.ingestion_events;
begin
  select * into v_row from public.ingestion_events
   where id = p_event_id
     and status in ('pending','failed')
     and next_attempt_at <= now()
   for update skip locked;
  if not found then
    return null;
  end if;
  update public.ingestion_events
     set status = 'processing',
         leased_by = p_worker_id,
         leased_until = now() + make_interval(secs => p_lease_seconds),
         attempts = attempts + 1
   where id = v_row.id
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.record_domain_event(
  p_merchant_id uuid,
  p_event_type text,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_idempotency_key text,
  p_payload jsonb default '{}'::jsonb,
  p_source_record_id uuid default null,
  p_connection_id uuid default null,
  p_ingestion_event_id uuid default null,
  p_actor_type text default 'system',
  p_actor_id uuid default null,
  p_occurred_at timestamptz default now(),
  p_correlation_id uuid default null,
  p_causation_id uuid default null,
  p_handlers text[] default '{}'
) returns public.domain_events
  language plpgsql security definer set search_path = public as $$
declare
  v_row public.domain_events;
  v_handler text;
begin
  insert into public.domain_events (
    merchant_id, event_type, aggregate_type, aggregate_id, idempotency_key,
    payload, source_record_id, connection_id, ingestion_event_id,
    actor_type, actor_id, occurred_at, correlation_id, causation_id
  ) values (
    p_merchant_id, p_event_type, p_aggregate_type, p_aggregate_id, p_idempotency_key,
    coalesce(p_payload, '{}'::jsonb), p_source_record_id, p_connection_id, p_ingestion_event_id,
    p_actor_type, p_actor_id, coalesce(p_occurred_at, now()), p_correlation_id, p_causation_id
  )
  on conflict (merchant_id, idempotency_key) do nothing
  returning * into v_row;

  if v_row.id is null then
    -- idempotent replay: return the existing row, register no new deliveries
    select * into v_row from public.domain_events
     where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
    return v_row;
  end if;

  foreach v_handler in array coalesce(p_handlers, '{}') loop
    insert into public.domain_event_deliveries (domain_event_id, merchant_id, handler_name)
    values (v_row.id, p_merchant_id, v_handler)
    on conflict (domain_event_id, handler_name) do nothing;
  end loop;

  return v_row;
end;
$$;

create or replace function public.claim_domain_event_deliveries(
  p_handler_name text, p_limit integer default 20, p_worker_id text default 'worker',
  p_lease_seconds integer default 60
) returns setof public.domain_event_deliveries
  language plpgsql security definer set search_path = public as $$
begin
  return query
  with claimed as (
    select d.id from public.domain_event_deliveries d
     where d.handler_name = p_handler_name
       and d.status in ('pending','failed')
       and d.next_attempt_at <= now()
     order by d.next_attempt_at
     for update skip locked
     limit greatest(p_limit, 1)
  )
  update public.domain_event_deliveries d
     set status = 'processing',
         leased_by = p_worker_id,
         leased_until = now() + make_interval(secs => p_lease_seconds),
         attempts = d.attempts + 1
    from claimed
   where d.id = claimed.id
  returning d.*;
end;
$$;

create or replace function public.complete_domain_event_delivery(
  p_delivery_id uuid
) returns void
  language plpgsql security definer set search_path = public as $$
begin
  update public.domain_event_deliveries
     set status = 'completed', completed_at = now(), last_error = null,
         leased_by = null, leased_until = null
   where id = p_delivery_id;
end;
$$;

create or replace function public.fail_domain_event_delivery(
  p_delivery_id uuid, p_error text, p_backoff_seconds integer default 30
) returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_attempts integer; v_max integer;
begin
  select attempts, max_attempts into v_attempts, v_max
    from public.domain_event_deliveries where id = p_delivery_id;
  update public.domain_event_deliveries
     set status = case when v_attempts >= v_max then 'dead_letter' else 'failed' end,
         last_error = p_error,
         next_attempt_at = now() + make_interval(secs => p_backoff_seconds),
         leased_by = null, leased_until = null
   where id = p_delivery_id;
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 15. RLS + grants
-- ───────────────────────────────────────────────────────────────────────────
-- Merchant-readable tables (member select; service-role writes)
alter table public.source_accounts             enable row level security;
alter table public.source_records              enable row level security;
alter table public.domain_events               enable row level security;
alter table public.entity_relationships        enable row level security;
alter table public.record_match_candidates     enable row level security;
alter table public.record_match_resolutions    enable row level security;
alter table public.case_financial_entries      enable row level security;
alter table public.case_financial_summaries    enable row level security;
-- Service-role-only tables (no authenticated select)
alter table public.ingestion_events            enable row level security;
alter table public.domain_event_deliveries     enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'source_accounts','source_records','domain_events','entity_relationships',
    'record_match_candidates','record_match_resolutions',
    'case_financial_entries','case_financial_summaries'
  ] loop
    execute format('drop policy if exists %I on public.%I', t||'_member_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (is_merchant_member(merchant_id))',
      t||'_member_select', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;

  -- inbox + delivery ledger: service role only, no authenticated grants
  foreach t in array array['ingestion_events','domain_event_deliveries'] loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('drop policy if exists %I on public.%I', t||'_service', t);
    execute format('create policy %I on public.%I for all to service_role using (true) with check (true)', t||'_service', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

-- Worker RPCs: service role only.
revoke all on function public.claim_ingestion_event(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.record_domain_event(uuid, text, text, uuid, text, jsonb, uuid, uuid, uuid, text, uuid, timestamptz, uuid, uuid, text[]) from public, anon, authenticated;
revoke all on function public.claim_domain_event_deliveries(text, integer, text, integer) from public, anon, authenticated;
revoke all on function public.complete_domain_event_delivery(uuid) from public, anon, authenticated;
revoke all on function public.fail_domain_event_delivery(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.claim_ingestion_event(uuid, text, integer) to service_role;
grant execute on function public.record_domain_event(uuid, text, text, uuid, text, jsonb, uuid, uuid, uuid, text, uuid, timestamptz, uuid, uuid, text[]) to service_role;
grant execute on function public.claim_domain_event_deliveries(text, integer, text, integer) to service_role;
grant execute on function public.complete_domain_event_delivery(uuid) to service_role;
grant execute on function public.fail_domain_event_delivery(uuid, text, integer) to service_role;

notify pgrst, 'reload schema';

commit;
