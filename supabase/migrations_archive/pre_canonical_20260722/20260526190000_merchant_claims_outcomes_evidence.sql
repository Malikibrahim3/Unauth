create table if not exists public.merchant_claims (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid,
  shop_domain text not null,
  shopify_order_id text,
  customer_id text,
  claim_type text not null check (claim_type in ('missing_parcel','damaged','wrong_item','refund_request','chargeback','return_abuse','other')),
  customer_claim_reason text,
  normalized_reason text,
  status text not null check (status in ('open','under_review','evidence_requested','resolved','closed')) default 'open',
  amount_at_risk numeric(12, 2),
  currency text,
  submitted_at timestamptz not null default now(),
  actor_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_merchant_claims_shop_order
  on public.merchant_claims (shop_domain, shopify_order_id);

create index if not exists idx_merchant_claims_shop_status
  on public.merchant_claims (shop_domain, status);

alter table public.merchant_claims enable row level security;

drop policy if exists "service_role_only_merchant_claims_all" on public.merchant_claims;
create policy "service_role_only_merchant_claims_all"
on public.merchant_claims
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create table if not exists public.merchant_case_outcomes (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.merchant_claims(id) on delete cascade,
  shop_domain text not null,
  shopify_order_id text,
  decision text not null check (decision in ('approved','denied','escalated','partial_refund','full_refund','chargeback_disputed','blacklist','no_action')),
  outcome text not null check (outcome in ('loss','recovered','pending','chargeback_won','chargeback_lost','customer_verified','suspected_fraud')),
  amount_refunded numeric(12, 2),
  amount_recovered numeric(12, 2),
  notes text,
  decided_at timestamptz not null default now(),
  actor_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_merchant_case_outcomes_claim_id
  on public.merchant_case_outcomes (claim_id);

alter table public.merchant_case_outcomes enable row level security;

drop policy if exists "service_role_only_merchant_case_outcomes_all" on public.merchant_case_outcomes;
create policy "service_role_only_merchant_case_outcomes_all"
on public.merchant_case_outcomes
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create table if not exists public.claim_evidence_items (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.merchant_claims(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('tracking','proof_of_delivery','customer_message','support_ticket','return_label','warehouse_scan','payment_dispute','note','other')),
  evidence_url text,
  evidence_hash text,
  source text not null check (source in ('manual','csv_import','zendesk','gorgias','shopify','stripe','paypal','carrier')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  actor_user_id uuid
);

create index if not exists idx_claim_evidence_items_claim_id
  on public.claim_evidence_items (claim_id);

alter table public.claim_evidence_items enable row level security;

drop policy if exists "service_role_only_claim_evidence_items_all" on public.claim_evidence_items;
create policy "service_role_only_claim_evidence_items_all"
on public.claim_evidence_items
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
