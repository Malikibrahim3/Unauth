-- Merchant-local identity resolution.
-- Additive migration: raw provider records and the legacy network graph remain
-- available while merchant_customers becomes the source of truth for the UI.

begin;

alter table public.merchant_customers
  add column if not exists resolution_status text not null default 'active'
    check (resolution_status in ('active', 'superseded', 'merged', 'split')),
  add column if not exists superseded_by uuid references public.merchant_customers(id) on delete set null,
  add column if not exists matcher_version text,
  add column if not exists last_resolved_at timestamptz;

alter table public.source_customers
  add column if not exists merchant_customer_id uuid references public.merchant_customers(id) on delete set null;

alter table public.source_orders
  add column if not exists merchant_customer_id uuid references public.merchant_customers(id) on delete set null;

alter table public.source_tickets
  add column if not exists merchant_customer_id uuid references public.merchant_customers(id) on delete set null;

alter table public.support_payout_cases
  add column if not exists merchant_customer_id uuid references public.merchant_customers(id) on delete set null;

-- Carry forward the deterministic links created by the earlier canonical
-- customer migration. The resolver/backfill handles guest orders and mutable
-- identifiers separately.
update public.source_orders so
set merchant_customer_id = sc.merchant_customer_id
from public.source_customers sc
where so.merchant_customer_id is null
  and so.source_customer_id = sc.id
  and so.merchant_id = sc.merchant_id
  and sc.merchant_customer_id is not null;

update public.source_tickets st
set merchant_customer_id = sc.merchant_customer_id
from public.source_customers sc
where st.merchant_customer_id is null
  and st.source_customer_id = sc.id
  and st.merchant_id = sc.merchant_id
  and sc.merchant_customer_id is not null;

update public.support_payout_cases c
set merchant_customer_id = so.merchant_customer_id
from public.source_orders so
where c.merchant_customer_id is null
  and c.source_order_id = so.id
  and c.merchant_id = so.merchant_id
  and so.merchant_customer_id is not null;

update public.support_payout_cases c
set merchant_customer_id = st.merchant_customer_id
from public.source_tickets st
where c.merchant_customer_id is null
  and c.source_ticket_id = st.id
  and c.merchant_id = st.merchant_id
  and st.merchant_customer_id is not null;

create index if not exists idx_source_orders_merchant_customer
  on public.source_orders (merchant_id, merchant_customer_id, placed_at desc)
  where merchant_customer_id is not null;
create index if not exists idx_source_tickets_merchant_customer
  on public.source_tickets (merchant_id, merchant_customer_id, created_at_provider desc)
  where merchant_customer_id is not null;
create index if not exists idx_support_cases_merchant_customer
  on public.support_payout_cases (merchant_id, merchant_customer_id, submitted_at desc)
  where merchant_customer_id is not null;
create index if not exists idx_merchant_customers_active
  on public.merchant_customers (merchant_id, updated_at desc)
  where resolution_status = 'active';

-- One canonical row per observed signal and merchant customer. A signal may be
-- present on more than one merchant customer until a human/engine decision
-- resolves the ambiguity; this is intentional for shared emails and addresses.
create table if not exists public.merchant_customer_signals (
  merchant_id          uuid not null references public.merchants(id) on delete cascade,
  merchant_customer_id uuid not null references public.merchant_customers(id) on delete cascade,
  identifier_type      text not null,
  identifier_hash      text not null,
  source_entity_type   text not null,
  source_entity_id     uuid not null,
  first_seen_at        timestamptz not null default now(),
  last_seen_at         timestamptz not null default now(),
  seen_count           integer not null default 1 check (seen_count >= 1),
  evidence             jsonb not null default '{}'::jsonb,
  primary key (merchant_customer_id, identifier_type, identifier_hash, source_entity_type, source_entity_id)
);

create index if not exists idx_merchant_customer_signals_lookup
  on public.merchant_customer_signals (merchant_id, identifier_type, identifier_hash);
create index if not exists idx_merchant_customer_signals_customer
  on public.merchant_customer_signals (merchant_id, merchant_customer_id);

alter table public.merchant_customer_signals enable row level security;
drop policy if exists merchant_customer_signals_member_select on public.merchant_customer_signals;
create policy merchant_customer_signals_member_select
  on public.merchant_customer_signals for select to authenticated
  using (is_merchant_member(merchant_id));
grant select on public.merchant_customer_signals to authenticated;
grant all on public.merchant_customer_signals to service_role;

notify pgrst, 'reload schema';
commit;
