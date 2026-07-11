-- 20260711123000_source_agnostic_connection_backfill.sql
--
-- Backfill canonical merchant_integrations + source_accounts rows from the split
-- connection stores (store_connections, helpdesk_connections) and from existing
-- merchant_integrations rows. Additive and idempotent (ON CONFLICT DO NOTHING on
-- the account-scoped key). Credentials and scopes are NOT copied here: the
-- dedicated Shopify/Gorgias flows still read the legacy tables until the route
-- refactor repoints them, and scopes contain provider-specific shapes that will
-- migrate with credentials. Provenance (origin table + id) is preserved in
-- source_accounts.metadata.

begin;

-- 1. store_connections -> canonical commerce connections
insert into public.merchant_integrations
  (merchant_id, provider_id, category, auth_mode, status,
   provider_account_id, provider_account_name, provider_base_url, display_name,
   last_successful_sync_at, last_sync_at, last_error, connector_version)
select
  sc.merchant_id, sc.platform::text, 'commerce', 'oauth',
  case
    when sc.uninstalled_at is not null or sc.status::text = 'revoked' then 'revoked'
    when sc.status::text = 'active' then 'connected'
    when sc.status::text = 'error' then 'error'
    when sc.status::text = 'disabled' then 'disabled'
    else 'pending'
  end,
  sc.store_key, sc.store_url, sc.store_url, coalesce(sc.store_key, sc.store_url),
  sc.last_sync_at, sc.last_sync_at, sc.last_error, 'backfill'
from public.store_connections sc
on conflict (merchant_id, provider_id, provider_account_id) do nothing;

-- 2. helpdesk_connections -> canonical helpdesk connections
insert into public.merchant_integrations
  (merchant_id, provider_id, category, auth_mode, status,
   provider_account_id, provider_account_name, provider_base_url, display_name,
   last_successful_sync_at, last_sync_at, last_error, connector_version)
select
  hc.merchant_id, hc.provider::text, 'helpdesk',
  case when hc.access_token_encrypted is not null then 'oauth' else 'api_key' end,
  case
    when hc.status::text = 'active' then 'connected'
    when hc.status::text = 'disabled' then 'disabled'
    when hc.status::text = 'error' then 'error'
    when hc.status::text = 'revoked' then 'revoked'
    else 'pending'
  end,
  hc.provider_account_id, hc.provider_account_name, hc.provider_base_url,
  coalesce(hc.provider_account_name, hc.provider_account_id),
  hc.last_sync_at, hc.last_sync_at, hc.last_error, 'backfill'
from public.helpdesk_connections hc
on conflict (merchant_id, provider_id, provider_account_id) do nothing;

-- 3. source_accounts for backfilled store connections (with provenance)
insert into public.source_accounts
  (merchant_id, connection_id, provider_id, external_account_id, display_name, base_url, metadata)
select
  sc.merchant_id, mi.id, mi.provider_id, sc.store_key, mi.display_name, sc.store_url,
  jsonb_build_object('backfilled_from', jsonb_build_object('table', 'store_connections', 'id', sc.id))
from public.store_connections sc
join public.merchant_integrations mi
  on mi.merchant_id = sc.merchant_id
 and mi.provider_id = sc.platform::text
 and mi.provider_account_id is not distinct from sc.store_key
on conflict (merchant_id, connection_id, external_account_id) do nothing;

-- 4. source_accounts for backfilled helpdesk connections (with provenance)
insert into public.source_accounts
  (merchant_id, connection_id, provider_id, external_account_id, display_name, base_url, metadata)
select
  hc.merchant_id, mi.id, mi.provider_id, hc.provider_account_id, mi.display_name, hc.provider_base_url,
  jsonb_build_object('backfilled_from', jsonb_build_object('table', 'helpdesk_connections', 'id', hc.id))
from public.helpdesk_connections hc
join public.merchant_integrations mi
  on mi.merchant_id = hc.merchant_id
 and mi.provider_id = hc.provider::text
 and mi.provider_account_id is not distinct from hc.provider_account_id
on conflict (merchant_id, connection_id, external_account_id) do nothing;

-- 5. source_accounts for any remaining merchant_integrations without one
insert into public.source_accounts
  (merchant_id, connection_id, provider_id, external_account_id, display_name, base_url, metadata)
select
  mi.merchant_id, mi.id, mi.provider_id, mi.provider_account_id, mi.display_name, mi.provider_base_url,
  jsonb_build_object('backfilled_from', jsonb_build_object('table', 'merchant_integrations', 'id', mi.id))
from public.merchant_integrations mi
where not exists (select 1 from public.source_accounts sa where sa.connection_id = mi.id)
on conflict (merchant_id, connection_id, external_account_id) do nothing;

commit;
