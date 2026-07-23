begin;

-- Canonical evidence remains additive so legacy accountability rows retain IDs.
alter table public.evidence_items drop constraint if exists evidence_items_source_system_check;
alter table public.evidence_items drop constraint if exists evidence_items_evidence_type_check;
alter table public.evidence_items alter column claim_id drop not null;
alter table public.evidence_items add column if not exists confidence numeric(5,4);
alter table public.evidence_items add column if not exists source_record_id text;
alter table public.evidence_items add column if not exists connection_id uuid references public.merchant_integrations(id) on delete set null;
alter table public.evidence_items add column if not exists source_account_id uuid references public.source_accounts(id) on delete set null;
alter table public.evidence_items add column if not exists source_url text;
alter table public.evidence_items add column if not exists source_created_at timestamptz;
alter table public.evidence_items add column if not exists source_updated_at timestamptz;
alter table public.evidence_items add column if not exists ingested_at timestamptz not null default now();
alter table public.evidence_items add column if not exists last_synced_at timestamptz;
alter table public.evidence_items add column if not exists freshness_state text not null default 'unknown';
alter table public.evidence_items add column if not exists sync_state text not null default 'current';
alter table public.evidence_items add column if not exists storage_path text;
alter table public.evidence_items add column if not exists content_hash text;
alter table public.evidence_items add column if not exists structured_value jsonb not null default '{}'::jsonb;
alter table public.evidence_items add column if not exists source_metadata jsonb not null default '{}'::jsonb;
alter table public.evidence_items add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.evidence_items add column if not exists updated_at timestamptz not null default now();

update public.evidence_items
set source_url = coalesce(source_url, external_url),
    structured_value = case when structured_value = '{}'::jsonb then coalesce(raw_payload, '{}'::jsonb) else structured_value end,
    source_created_at = coalesce(source_created_at, occurred_at),
    source_metadata = source_metadata || jsonb_build_object('legacy_table', 'evidence_items', 'legacy_id', id::text)
where source_metadata ->> 'legacy_table' is null;

create unique index if not exists evidence_items_migration_key_unique
  on public.evidence_items (merchant_id, ((source_metadata ->> 'migration_key')))
  where source_metadata ->> 'migration_key' is not null;

create table if not exists public.evidence_links (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  evidence_item_id uuid not null references public.evidence_items(id) on delete cascade,
  support_payout_case_id uuid references public.support_payout_cases(id) on delete cascade,
  source_order_id uuid references public.source_orders(id) on delete cascade,
  source_ticket_id uuid references public.source_tickets(id) on delete cascade,
  loss_case_id uuid references public.loss_cases(id) on delete cascade,
  recovery_case_id uuid references public.recovery_cases(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint evidence_links_exactly_one_target check (
    num_nonnulls(support_payout_case_id, source_order_id, source_ticket_id, loss_case_id, recovery_case_id) = 1
  )
);
create unique index if not exists evidence_links_case_unique on public.evidence_links(evidence_item_id, support_payout_case_id) where support_payout_case_id is not null;
create unique index if not exists evidence_links_order_unique on public.evidence_links(evidence_item_id, source_order_id) where source_order_id is not null;
create unique index if not exists evidence_links_ticket_unique on public.evidence_links(evidence_item_id, source_ticket_id) where source_ticket_id is not null;
create unique index if not exists evidence_links_loss_unique on public.evidence_links(evidence_item_id, loss_case_id) where loss_case_id is not null;
create unique index if not exists evidence_links_recovery_unique on public.evidence_links(evidence_item_id, recovery_case_id) where recovery_case_id is not null;

insert into public.evidence_links (merchant_id, evidence_item_id, support_payout_case_id)
select merchant_id, id, claim_id from public.evidence_items where claim_id is not null
on conflict do nothing;

insert into public.evidence_items (
  merchant_id, claim_id, evidence_type, source_system, storage_path, content_hash,
  structured_value, source_metadata, created_by, source_created_at, created_at
)
select merchant_id, claim_id, evidence_type, coalesce(metadata ->> 'source', 'legacy_claim'),
       storage_path, evidence_hash, metadata,
       jsonb_build_object('legacy_table', 'claim_evidence', 'legacy_id', id::text,
                          'migration_key', 'claim_evidence:' || id::text),
       added_by, created_at, created_at
from public.claim_evidence
on conflict do nothing;

insert into public.evidence_items (
  merchant_id, claim_id, evidence_type, title, summary, confidence, source_record_id,
  source_system, source_url, source_created_at, structured_value, source_metadata, created_at
)
select merchant_id, support_payout_case_id, evidence_type, title, summary,
       case confidence when 'high' then 1 when 'medium' then 0.6 when 'low' then 0.3 end,
       raw_reference, source_provider, raw_reference, occurred_at, coalesce(value, '{}'::jsonb),
       jsonb_build_object('legacy_table', 'integration_evidence_items', 'legacy_id', id::text,
                          'source_category', source_category,
                          'migration_key', 'integration_evidence_items:' || id::text),
       created_at
from public.integration_evidence_items
on conflict do nothing;

insert into public.evidence_items (
  merchant_id, evidence_type, confidence, source_record_id, source_system, source_url,
  source_created_at, ingested_at, content_hash, structured_value, source_metadata, created_at
)
select merchant_id, evidence_type, extraction_confidence, source_record_id,
       source_provider::text, source_url, pulled_at, pulled_at, raw_payload_hash, value_json,
       jsonb_build_object('legacy_table', 'loss_case_evidence', 'legacy_id', id::text,
                          'loss_case_id', loss_case_id::text,
                          'source_verified', source_verified,
                          'extracted_by', extracted_by::text,
                          'migration_key', 'loss_case_evidence:' || id::text),
       created_at
from public.loss_case_evidence
on conflict do nothing;

insert into public.evidence_links (merchant_id, evidence_item_id, support_payout_case_id)
select e.merchant_id, e.id, e.claim_id from public.evidence_items e
where e.claim_id is not null
on conflict do nothing;

insert into public.evidence_links (merchant_id, evidence_item_id, loss_case_id)
select e.merchant_id, e.id, (e.source_metadata ->> 'loss_case_id')::uuid
from public.evidence_items e
where e.source_metadata ->> 'legacy_table' = 'loss_case_evidence'
on conflict do nothing;

create table if not exists public.case_decisions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  support_payout_case_id uuid not null references public.support_payout_cases(id) on delete cascade,
  decision text not null,
  action text,
  amount_minor bigint check (amount_minor is null or amount_minor >= 0),
  currency text,
  rule_snapshot jsonb not null default '{}'::jsonb,
  recommendation_snapshot jsonb not null default '{}'::jsonb,
  followed_recommendation boolean,
  reason text,
  actor_type text not null default 'system',
  actor_user_id uuid references auth.users(id) on delete set null,
  effective_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),
  reverses_decision_id uuid references public.case_decisions(id) on delete set null,
  supersedes_decision_id uuid references public.case_decisions(id) on delete set null,
  idempotency_key text not null,
  unique (merchant_id, idempotency_key)
);
create index if not exists case_decisions_case_idx on public.case_decisions(merchant_id, support_payout_case_id, effective_at desc);

create table if not exists public.case_outcomes (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  support_payout_case_id uuid not null references public.support_payout_cases(id) on delete cascade,
  outcome_type text not null,
  amount_minor bigint check (amount_minor is null or amount_minor >= 0),
  currency text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  actor_type text not null default 'system',
  actor_user_id uuid references auth.users(id) on delete set null,
  effective_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),
  reverses_outcome_id uuid references public.case_outcomes(id) on delete set null,
  idempotency_key text not null,
  unique (merchant_id, idempotency_key)
);
create index if not exists case_outcomes_case_idx on public.case_outcomes(merchant_id, support_payout_case_id, effective_at desc);

insert into public.case_decisions (
  merchant_id, support_payout_case_id, decision, action, amount_minor, currency,
  recommendation_snapshot, followed_recommendation, reason, actor_type, actor_user_id,
  effective_at, recorded_at, idempotency_key
)
select c.merchant_id, o.claim_id, o.decision::text, o.outcome::text,
       case when o.amount_refunded is null then null else round(o.amount_refunded * 100)::bigint end,
       coalesce(c.primary_currency, c.currency),
       jsonb_build_object('recommended_payout_action', o.recommended_payout_action),
       o.followed_recommendation, o.notes, case when o.decided_by is null then 'system' else 'user' end,
       o.decided_by, o.decided_at, o.decided_at, 'claim_outcomes:' || o.id::text
from public.claim_outcomes o join public.support_payout_cases c on c.id = o.claim_id
on conflict do nothing;

insert into public.case_outcomes (
  merchant_id, support_payout_case_id, outcome_type, amount_minor, currency, reason,
  actor_type, actor_user_id, effective_at, recorded_at, idempotency_key
)
select c.merchant_id, o.claim_id, o.outcome::text,
       case when coalesce(o.amount_recovered, o.amount_refunded) is null then null
            else round(coalesce(o.amount_recovered, o.amount_refunded) * 100)::bigint end,
       coalesce(c.primary_currency, c.currency), o.notes,
       case when o.decided_by is null then 'system' else 'user' end, o.decided_by,
       o.decided_at, o.decided_at, 'claim_outcomes:' || o.id::text
from public.claim_outcomes o join public.support_payout_cases c on c.id = o.claim_id
on conflict do nothing;

alter table public.loss_cases add column if not exists financial_state text not null default 'estimated';
alter table public.loss_cases add column if not exists financial_entry_ids uuid[] not null default '{}';
alter table public.loss_cases add column if not exists attribution text;
alter table public.loss_cases add column if not exists attribution_confidence numeric(5,4);
alter table public.loss_cases add column if not exists recoverability text;
alter table public.loss_cases add column if not exists owner_user_id uuid references auth.users(id) on delete set null;
alter table public.loss_cases add column if not exists confirmed_at timestamptz;
alter table public.loss_cases add column if not exists estimated_at timestamptz;
alter table public.loss_cases add column if not exists prevention_only boolean not null default false;
alter table public.loss_cases add column if not exists written_off_at timestamptz;
alter table public.loss_cases add column if not exists source_record_id uuid references public.source_records(id) on delete set null;
alter table public.loss_cases add column if not exists source_metadata jsonb not null default '{}'::jsonb;

create table if not exists public.loss_attribution_candidates (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  loss_case_id uuid not null references public.loss_cases(id) on delete cascade,
  attribution text not null,
  confidence numeric(5,4),
  accountable_party_type text,
  accountable_party_name text,
  source_loss_id uuid,
  is_primary boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (merchant_id, source_loss_id)
);

insert into public.loss_cases (
  merchant_id, support_payout_case_id, case_category, case_type, recovery_route, status,
  counterparty_type, counterparty_name, estimated_recovery_minor, currency,
  source_confidence, source_fingerprint, attribution, recoverability, estimated_at, source_metadata
)
select ls.merchant_id, ls.claim_id, 'unknown_post_purchase_loss', lower(ls.source_type), 'needs_more_evidence', 'detected',
       (case ls.accountable_party_type
         when 'CUSTOMER' then 'customer' when 'CARRIER' then 'carrier'
         when 'WAREHOUSE_3PL' then '3pl' when 'PAYMENT_PROVIDER' then 'payment_processor'
         when 'MERCHANT' then 'internal_team' when 'SUPPORT_TEAM' then 'internal_team'
         when 'AI_AGENT' then 'internal_team' else 'unknown' end)::public.loss_counterparty_type,
       ls.accountable_party_name, round(ls.potential_recovery_amount * 100)::bigint,
       coalesce(c.primary_currency, c.currency), 'insufficient_source_data', 'loss_sources:' || ls.id::text,
       ls.source_type, ls.status, ls.created_at,
       jsonb_build_object('legacy_table', 'loss_sources', 'legacy_id', ls.id::text,
                          'money_at_risk', ls.money_at_risk, 'evidence_summary', ls.evidence_summary)
from public.loss_sources ls join public.support_payout_cases c on c.id = ls.claim_id
on conflict do nothing;

insert into public.loss_attribution_candidates (
  merchant_id, loss_case_id, attribution, confidence, accountable_party_type,
  accountable_party_name, source_loss_id, is_primary, metadata
)
select ls.merchant_id, lc.id, ls.source_type,
       case ls.confidence when 'HIGH' then 1 when 'MEDIUM' then 0.6 else 0.3 end,
       ls.accountable_party_type, ls.accountable_party_name, ls.id, true,
       jsonb_build_object('evidence_summary', ls.evidence_summary)
from public.loss_sources ls
join public.loss_cases lc on lc.source_fingerprint = 'loss_sources:' || ls.id::text
on conflict do nothing;

alter table public.recovery_cases add column if not exists loss_case_id uuid references public.loss_cases(id) on delete set null;
alter table public.recovery_cases add column if not exists prevention_only boolean not null default false;
create index if not exists recovery_cases_loss_idx on public.recovery_cases(merchant_id, loss_case_id) where loss_case_id is not null;

create table if not exists public.work_tasks (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  support_payout_case_id uuid references public.support_payout_cases(id) on delete cascade,
  loss_case_id uuid references public.loss_cases(id) on delete set null,
  recovery_case_id uuid references public.recovery_cases(id) on delete set null,
  title text not null,
  description text,
  owner_user_id uuid references auth.users(id) on delete set null,
  owner_role text,
  due_at timestamptz,
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','blocked','completed','cancelled')),
  blocking_reason text,
  completion_outcome jsonb,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  source text not null default 'manual',
  domain_event_id uuid references public.domain_events(id) on delete set null,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists work_tasks_queue_idx on public.work_tasks(merchant_id, status, due_at);
create unique index if not exists work_tasks_migration_key_unique
  on public.work_tasks(merchant_id, ((source_metadata ->> 'migration_key')))
  where source_metadata ->> 'migration_key' is not null;

insert into public.work_tasks (
  id, merchant_id, support_payout_case_id, loss_case_id, title, description, owner_role,
  due_at, priority, status, blocking_reason, completion_outcome, completed_at, source,
  source_metadata, created_at, updated_at
)
select rt.id, rt.merchant_id, rt.claim_id, lc.id, replace(initcap(rt.task_type), '_', ' '), rt.notes,
       rt.owner_type, coalesce(rt.due_at, rt.recovery_deadline), lower(rt.priority),
       case when rt.status in ('open','in_progress','blocked','completed','cancelled') then rt.status
            when rt.status = 'overdue' then 'open' else 'blocked' end,
       case when rt.status not in ('open','in_progress','completed','cancelled') then rt.status end,
       case when rt.status = 'completed' then jsonb_build_object('external_reference', rt.external_reference) end,
       case when rt.status = 'completed' then rt.updated_at end, 'legacy_recovery_task',
       jsonb_build_object('migration_key', 'recovery_tasks:' || rt.id::text,
                          'legacy_table', 'recovery_tasks', 'legacy_id', rt.id::text,
                          'loss_source_id', rt.loss_source_id::text,
                          'amount_to_recover', rt.amount_to_recover,
                          'owner_name', rt.owner_name, 'owner_email', rt.owner_email),
       rt.created_at, rt.updated_at
from public.recovery_tasks rt
left join public.loss_cases lc on lc.source_fingerprint = 'loss_sources:' || rt.loss_source_id::text
on conflict do nothing;

-- Append-only histories cannot be rewritten after insertion.
create or replace function public.forbid_phase7_history_mutation() returns trigger
language plpgsql as $$ begin raise exception '% is append-only (% not allowed)', tg_table_name, tg_op; end $$;
drop trigger if exists case_decisions_immutable on public.case_decisions;
create trigger case_decisions_immutable before update or delete on public.case_decisions for each row execute function public.forbid_phase7_history_mutation();
drop trigger if exists case_outcomes_immutable on public.case_outcomes;
create trigger case_outcomes_immutable before update or delete on public.case_outcomes for each row execute function public.forbid_phase7_history_mutation();

do $$ declare table_name text; begin
  foreach table_name in array array['evidence_links','case_decisions','case_outcomes','loss_attribution_candidates','work_tasks'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_member_all', table_name);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id))', table_name || '_member_all', table_name);
    execute format('grant all on public.%I to service_role', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end $$;

commit;
