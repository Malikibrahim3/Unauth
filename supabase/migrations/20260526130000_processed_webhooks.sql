create table if not exists public.processed_webhooks (
  webhook_id text primary key,
  processed_at timestamptz not null default now()
);

alter table public.processed_webhooks enable row level security;

drop policy if exists "service_role_only_processed_webhooks_all" on public.processed_webhooks;
create policy "service_role_only_processed_webhooks_all"
on public.processed_webhooks
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

