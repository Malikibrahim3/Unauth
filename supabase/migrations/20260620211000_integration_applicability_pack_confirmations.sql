begin;

create table if not exists public.category_applicability (
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  category text not null check (category in ('warehouse_3pl', 'returns')),
  status text not null check (status in ('applicable', 'not_applicable')),
  set_by uuid references auth.users(id) on delete set null,
  set_at timestamptz not null default now(),
  primary key (merchant_id, category)
);

create table if not exists public.pack_confirmations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  order_id text not null,
  fulfillment_id text not null,
  confirmed_by text,
  item_match_confirmed boolean not null default false,
  photo_url text,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (merchant_id, order_id, fulfillment_id)
);

create index if not exists category_applicability_merchant_idx
  on public.category_applicability(merchant_id, category);

create index if not exists pack_confirmations_order_idx
  on public.pack_confirmations(merchant_id, order_id, fulfillment_id);

alter table public.category_applicability enable row level security;
alter table public.pack_confirmations enable row level security;

drop policy if exists category_applicability_member_select on public.category_applicability;
create policy category_applicability_member_select on public.category_applicability
  for select to authenticated using (is_merchant_member(merchant_id));

drop policy if exists category_applicability_admin_write on public.category_applicability;
create policy category_applicability_admin_write on public.category_applicability
  for all to authenticated
  using (merchant_role(merchant_id) in ('owner', 'admin'))
  with check (merchant_role(merchant_id) in ('owner', 'admin'));

drop policy if exists pack_confirmations_member_select on public.pack_confirmations;
create policy pack_confirmations_member_select on public.pack_confirmations
  for select to authenticated using (is_merchant_member(merchant_id));

drop policy if exists pack_confirmations_admin_write on public.pack_confirmations;
create policy pack_confirmations_admin_write on public.pack_confirmations
  for all to authenticated
  using (merchant_role(merchant_id) in ('owner', 'admin'))
  with check (merchant_role(merchant_id) in ('owner', 'admin'));

grant all on public.category_applicability to service_role;
grant all on public.pack_confirmations to service_role;
grant select, insert, update, delete on public.category_applicability to authenticated;
grant select on public.pack_confirmations to authenticated;

notify pgrst, 'reload schema';

commit;
