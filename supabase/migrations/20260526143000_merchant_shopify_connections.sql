create table if not exists public.merchant_shopify_connections (
  merchant_id uuid primary key references public.merchants(id) on delete cascade,
  shop_domain text not null references public.shopify_merchants(shop_domain) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.merchant_shopify_connections enable row level security;

drop policy if exists "service_role_only_merchant_shopify_connections_all" on public.merchant_shopify_connections;
create policy "service_role_only_merchant_shopify_connections_all"
on public.merchant_shopify_connections
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

