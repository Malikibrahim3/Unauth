create table if not exists public.connector_action_runs (
  id uuid primary key default gen_random_uuid(), merchant_id uuid not null references public.merchants(id) on delete cascade,
  connection_id uuid not null references public.merchant_integrations(id) on delete cascade,
  support_payout_case_id uuid references public.support_payout_cases(id) on delete set null,
  capability_id text not null, external_record_id text not null, payload jsonb not null default '{}'::jsonb,
  status text not null check (status in ('previewed','completed','manual_required','failed')),
  idempotency_key text not null, actor_user_id uuid references auth.users(id) on delete set null,
  result jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), completed_at timestamptz,
  unique (merchant_id, idempotency_key)
);
create index if not exists connector_action_runs_case_idx on public.connector_action_runs (merchant_id, support_payout_case_id, created_at desc);
alter table public.connector_action_runs enable row level security;
create policy connector_action_runs_member_select on public.connector_action_runs for select to authenticated using (is_merchant_member(merchant_id));
grant select on public.connector_action_runs to authenticated;
grant all on public.connector_action_runs to service_role;
