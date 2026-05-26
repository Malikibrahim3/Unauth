create table if not exists public.customer_profile_identities (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.customer_profiles(id) on delete cascade,
  merchant_id uuid not null,
  shop_domain text,
  identity_type text not null check (identity_type in ('email','phone','shopify_customer_id','shopify_order_id','address_hash')),
  identity_value text not null,
  source text not null default 'shopify',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, identity_type, identity_value)
);

create index if not exists idx_customer_profile_identities_profile
  on public.customer_profile_identities (customer_profile_id);

create index if not exists idx_customer_profile_identities_merchant_shop
  on public.customer_profile_identities (merchant_id, shop_domain);

alter table public.customer_profile_identities enable row level security;

drop policy if exists "service_role_only_customer_profile_identities_all" on public.customer_profile_identities;
create policy "service_role_only_customer_profile_identities_all"
on public.customer_profile_identities
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
