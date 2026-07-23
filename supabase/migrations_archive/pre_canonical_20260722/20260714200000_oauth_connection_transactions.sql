-- Tenant-bound, one-time OAuth transaction ledger.
-- The browser receives only a random state value; all ownership data remains
-- service-role-only and is consumed atomically before provider token exchange.

begin;

create table if not exists public.oauth_connection_transactions (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_id text not null,
  environment text not null check (environment in ('sandbox', 'production')),
  callback_url text not null,
  provider_account_hint text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists oauth_connection_transactions_expiry_idx
  on public.oauth_connection_transactions (expires_at)
  where consumed_at is null;

alter table public.oauth_connection_transactions enable row level security;
revoke all on public.oauth_connection_transactions from anon, authenticated;

drop policy if exists oauth_connection_transactions_service_role
  on public.oauth_connection_transactions;
create policy oauth_connection_transactions_service_role
  on public.oauth_connection_transactions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.oauth_connection_transactions is
  'Short-lived one-time OAuth state binding. Never exposed to merchant clients.';

commit;
