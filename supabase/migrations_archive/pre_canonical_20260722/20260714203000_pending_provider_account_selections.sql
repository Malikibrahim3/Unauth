-- Short-lived, service-only handoff used when an OAuth credential discovers
-- several provider accounts and the merchant must explicitly choose one.

begin;

create table if not exists public.pending_provider_account_selections (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_id text not null,
  environment text not null check (environment in ('sandbox', 'production')),
  accounts jsonb not null,
  encrypted_payload text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pending_provider_account_selections_expiry_idx
  on public.pending_provider_account_selections (expires_at)
  where consumed_at is null;

alter table public.pending_provider_account_selections enable row level security;
revoke all on public.pending_provider_account_selections from anon, authenticated;

drop policy if exists pending_provider_account_selections_service_role
  on public.pending_provider_account_selections;
create policy pending_provider_account_selections_service_role
  on public.pending_provider_account_selections
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

commit;
