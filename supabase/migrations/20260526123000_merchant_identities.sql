create table if not exists public.merchant_identities (
  id bigserial primary key,
  shop_domain text not null,
  source text not null,
  source_id text,
  email text,
  phone text,
  shipping_address text,
  billing_address text,
  customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_merchant_identities_shop_domain
  on public.merchant_identities (shop_domain);

create unique index if not exists ux_merchant_identities_source
  on public.merchant_identities (shop_domain, source, source_id);

alter table public.merchant_identities enable row level security;

drop policy if exists "service_role_only_merchant_identities_all" on public.merchant_identities;
create policy "service_role_only_merchant_identities_all"
on public.merchant_identities
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

