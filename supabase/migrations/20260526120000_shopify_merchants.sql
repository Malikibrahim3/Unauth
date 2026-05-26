create table if not exists public.shopify_merchants (
  shop_domain text primary key,
  access_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shopify_merchants enable row level security;

drop policy if exists "service_role_only_shopify_merchants_all" on public.shopify_merchants;
create policy "service_role_only_shopify_merchants_all"
on public.shopify_merchants
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

