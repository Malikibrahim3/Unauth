-- Persist the distinction between configured credentials and a recent live probe.
-- A provider outage must not turn into a false "connected" state.

begin;

do $$
begin
  alter table public.store_connections
    add column if not exists last_verified_at timestamptz,
    add column if not exists last_verification_status text,
    add column if not exists last_verification_error text;
  alter table public.store_connections
    drop constraint if exists store_connections_last_verification_status_check;
  alter table public.store_connections
    add constraint store_connections_last_verification_status_check
    check (last_verification_status is null or last_verification_status in ('verified', 'failed', 'inconclusive'));
exception when undefined_table then
  null;
end $$;

do $$
begin
  alter table public.helpdesk_connections
    add column if not exists last_verified_at timestamptz,
    add column if not exists last_verification_status text,
    add column if not exists last_verification_error text;
  alter table public.helpdesk_connections
    drop constraint if exists helpdesk_connections_last_verification_status_check;
  alter table public.helpdesk_connections
    add constraint helpdesk_connections_last_verification_status_check
    check (last_verification_status is null or last_verification_status in ('verified', 'failed', 'inconclusive'));
exception when undefined_table then
  null;
end $$;

do $$
begin
  alter table public.merchant_integrations
    add column if not exists last_verified_at timestamptz,
    add column if not exists last_verification_status text,
    add column if not exists last_verification_error text;
  alter table public.merchant_integrations
    drop constraint if exists merchant_integrations_last_verification_status_check;
  alter table public.merchant_integrations
    add constraint merchant_integrations_last_verification_status_check
    check (last_verification_status is null or last_verification_status in ('verified', 'failed', 'inconclusive'));
exception when undefined_table then
  null;
end $$;

create index if not exists store_connections_verification_idx
  on public.store_connections (status, last_verified_at);
create index if not exists helpdesk_connections_verification_idx
  on public.helpdesk_connections (status, last_verified_at);
create index if not exists merchant_integrations_verification_idx
  on public.merchant_integrations (status, last_verified_at);

commit;
