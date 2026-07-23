create table if not exists public.shopify_refund_events (
  id bigserial primary key,
  shop_domain text not null,
  shopify_order_id text,
  refund_id text not null,
  refunded_amount numeric(12, 2) not null default 0,
  currency text,
  refund_reason text,
  refunded_line_items_count integer not null default 0,
  created_at_shopify timestamptz,
  raw_payload_hash text not null,
  ingested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_shopify_refund_events_shop_refund
  on public.shopify_refund_events (shop_domain, refund_id);

create index if not exists idx_shopify_refund_events_shop_order
  on public.shopify_refund_events (shop_domain, shopify_order_id);

alter table public.shopify_refund_events enable row level security;

drop policy if exists "service_role_only_shopify_refund_events_all" on public.shopify_refund_events;
create policy "service_role_only_shopify_refund_events_all"
on public.shopify_refund_events
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create table if not exists public.shopify_fulfillment_events (
  id bigserial primary key,
  shop_domain text not null,
  shopify_order_id text,
  fulfillment_id text not null,
  tracking_company text,
  tracking_number_hash text,
  tracking_urls_count integer not null default 0,
  shipment_status text,
  status text,
  created_at_shopify timestamptz,
  updated_at_shopify timestamptz,
  raw_payload_hash text not null,
  ingested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_shopify_fulfillment_events_shop_fulfillment
  on public.shopify_fulfillment_events (shop_domain, fulfillment_id);

create index if not exists idx_shopify_fulfillment_events_shop_order
  on public.shopify_fulfillment_events (shop_domain, shopify_order_id);

alter table public.shopify_fulfillment_events enable row level security;

drop policy if exists "service_role_only_shopify_fulfillment_events_all" on public.shopify_fulfillment_events;
create policy "service_role_only_shopify_fulfillment_events_all"
on public.shopify_fulfillment_events
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
