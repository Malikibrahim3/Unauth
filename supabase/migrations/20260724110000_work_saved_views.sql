-- Merchant-scoped saved Work views.

create table if not exists public.work_saved_views (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  definition jsonb not null default '{}'::jsonb,
  is_shared boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop index if exists public.work_saved_views_owner_name_idx;
create unique index work_saved_views_owner_name_idx
  on public.work_saved_views (merchant_id, owner_user_id, lower(name))
  where deleted_at is null;
create index if not exists work_saved_views_shared_idx
  on public.work_saved_views (merchant_id, is_shared, updated_at desc);

alter table public.work_saved_views enable row level security;

drop policy if exists work_saved_views_select on public.work_saved_views;
create policy work_saved_views_select on public.work_saved_views
for select to authenticated
using (
  public.is_merchant_member(merchant_id)
  and (owner_user_id = auth.uid() or is_shared = true)
);

drop policy if exists work_saved_views_insert on public.work_saved_views;
create policy work_saved_views_insert on public.work_saved_views
for insert to authenticated
with check (
  public.is_merchant_member(merchant_id)
  and owner_user_id = auth.uid()
);

drop policy if exists work_saved_views_update on public.work_saved_views;
create policy work_saved_views_update on public.work_saved_views
for update to authenticated
using (public.is_merchant_member(merchant_id) and owner_user_id = auth.uid())
with check (public.is_merchant_member(merchant_id) and owner_user_id = auth.uid());

drop policy if exists work_saved_views_delete on public.work_saved_views;
create policy work_saved_views_delete on public.work_saved_views
for delete to authenticated
using (public.is_merchant_member(merchant_id) and owner_user_id = auth.uid());

create trigger trg_work_saved_views_updated
before update on public.work_saved_views
for each row execute function public.set_updated_at();
