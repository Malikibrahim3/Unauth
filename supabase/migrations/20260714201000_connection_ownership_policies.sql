-- Provider-account ownership and explicit MVP connection-count policies.
-- This migration refuses to apply over ambiguous ownership instead of silently
-- selecting or reassigning one merchant's connection.

begin;

do $$
begin
  if exists (
    select 1
    from public.merchant_integrations
    where provider_account_id is not null
    group by provider_id, coalesce(environment, 'production'), provider_account_id
    having count(distinct merchant_id) > 1
  ) then
    raise exception 'merchant_integrations contains cross-merchant provider-account ownership conflicts';
  end if;
  if exists (
    select 1
    from public.store_connections
    group by platform, store_key
    having count(distinct merchant_id) > 1
  ) then
    raise exception 'store_connections contains cross-merchant provider-account ownership conflicts';
  end if;
  if exists (
    select 1
    from public.helpdesk_connections
    where provider_account_id is not null
    group by provider, provider_account_id
    having count(distinct merchant_id) > 1
  ) then
    raise exception 'helpdesk_connections contains cross-merchant provider-account ownership conflicts';
  end if;
  if exists (
    select 1
    from public.merchant_integrations
    where status in ('pending', 'connected', 'degraded', 'syncing')
    group by merchant_id, provider_id
    having count(*) > 1
  ) then
    raise exception 'merchant_integrations violates the one-active-connection-per-provider MVP policy';
  end if;
  if exists (
    select 1
    from public.store_connections
    where status = 'active' and uninstalled_at is null
    group by merchant_id, platform
    having count(*) > 1
  ) then
    raise exception 'store_connections violates the one-active-connection-per-provider MVP policy';
  end if;
  if exists (
    select 1
    from public.helpdesk_connections
    where status = 'active'
    group by merchant_id, provider
    having count(*) > 1
  ) then
    raise exception 'helpdesk_connections violates the one-active-connection-per-provider MVP policy';
  end if;
end $$;

create unique index if not exists merchant_integrations_global_account_owner_key
  on public.merchant_integrations (
    provider_id,
    coalesce(environment, 'production'),
    provider_account_id
  )
  where provider_account_id is not null;

create unique index if not exists store_connections_global_account_owner_key
  on public.store_connections (platform, store_key);

create unique index if not exists helpdesk_connections_global_account_owner_key
  on public.helpdesk_connections (provider, provider_account_id)
  where provider_account_id is not null;

create unique index if not exists merchant_integrations_one_active_provider_key
  on public.merchant_integrations (merchant_id, provider_id)
  where status in ('pending', 'connected', 'degraded', 'syncing');

create unique index if not exists store_connections_one_active_provider_key
  on public.store_connections (merchant_id, platform)
  where status = 'active' and uninstalled_at is null;

create unique index if not exists helpdesk_connections_one_active_provider_key
  on public.helpdesk_connections (merchant_id, provider)
  where status = 'active';

comment on index public.merchant_integrations_one_active_provider_key is
  'MVP policy: one active connection per merchant/provider; historical disconnected rows may remain.';

commit;
