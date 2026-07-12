begin;

do $$
begin
  alter type public.signal_source add value if not exists 'shipbob';
exception when undefined_object then
  null;
end $$;

create table if not exists public.source_locations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  source_account_id uuid references public.source_accounts(id) on delete set null,
  source_record_id uuid references public.source_records(id) on delete set null,
  external_id text not null,
  name text,
  status text,
  address jsonb not null default '{}'::jsonb,
  raw_metadata jsonb not null default '{}'::jsonb,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (merchant_id, source_account_id, external_id)
);
create index if not exists idx_source_locations_merchant on public.source_locations (merchant_id);
create index if not exists idx_source_locations_account on public.source_locations (source_account_id);
alter table public.source_locations enable row level security;
create policy source_locations_member_select on public.source_locations for select to authenticated using (is_merchant_member(merchant_id));
grant select on public.source_locations to authenticated;
grant all on public.source_locations to service_role;

commit;
