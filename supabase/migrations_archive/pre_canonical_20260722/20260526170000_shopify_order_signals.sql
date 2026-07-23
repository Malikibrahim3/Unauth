create table if not exists public.shopify_order_signals (
  id bigserial primary key,
  shop_domain text not null,
  shopify_order_id text not null,
  order_number text,
  customer_id text,
  created_at_shopify timestamptz,
  total_price numeric(12, 2),
  currency text,
  financial_status text,
  fulfillment_status text,
  cancelled_at timestamptz,
  cancel_reason text,
  refunds_count integer not null default 0,
  discount_codes jsonb not null default '[]'::jsonb,
  payment_gateway_names jsonb not null default '[]'::jsonb,
  shipping_country text,
  billing_country text,
  line_items_count integer not null default 0,
  shipping_price numeric(12, 2),
  source_name text,
  tags jsonb not null default '[]'::jsonb,
  landing_site text,
  referring_site text,
  risk_recommendation text,
  risk_level text,
  raw_payload_hash text not null,
  ingested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_shopify_order_signals_shop_order
  on public.shopify_order_signals (shop_domain, shopify_order_id);

create index if not exists idx_shopify_order_signals_shop_created
  on public.shopify_order_signals (shop_domain, created_at_shopify);

create index if not exists idx_shopify_order_signals_financial_status
  on public.shopify_order_signals (financial_status);

create index if not exists idx_shopify_order_signals_risk_level
  on public.shopify_order_signals (risk_level);

alter table public.shopify_order_signals enable row level security;

drop policy if exists "service_role_only_shopify_order_signals_all" on public.shopify_order_signals;
create policy "service_role_only_shopify_order_signals_all"
on public.shopify_order_signals
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

