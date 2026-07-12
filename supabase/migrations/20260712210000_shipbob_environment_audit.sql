-- Pin every ShipBob connection and source account to an immutable endpoint family.
alter table public.merchant_integrations
  add column if not exists environment text,
  add column if not exists authorization_host text,
  add column if not exists api_base_url_family text,
  add column if not exists authentication_mode text,
  add column if not exists connection_created_at timestamptz;

alter table public.source_accounts add column if not exists environment text;

update public.merchant_integrations
set environment = case when provider_base_url like '%sandbox-api.shipbob.com%' or capabilities_snapshot->>'sandbox' = 'true' then 'sandbox' else 'production' end,
    authorization_host = case when provider_base_url like '%sandbox-api.shipbob.com%' or capabilities_snapshot->>'sandbox' = 'true' then 'https://authstage.shipbob.com' else 'https://auth.shipbob.com' end,
    api_base_url_family = case when provider_base_url like '%sandbox-api.shipbob.com%' or capabilities_snapshot->>'sandbox' = 'true' then 'https://sandbox-api.shipbob.com/2026-01' else 'https://api.shipbob.com/2026-01' end,
    authentication_mode = coalesce(authentication_mode, auth_mode),
    connection_created_at = coalesce(connection_created_at, created_at)
where provider_id = 'shipbob' and environment is null;

update public.source_accounts sa set environment = mi.environment
from public.merchant_integrations mi
where sa.connection_id = mi.id and mi.provider_id = 'shipbob' and sa.environment is null;

alter table public.user_action_log alter column actor_user_id drop not null;

alter table public.merchant_integrations add constraint shipbob_environment_valid
  check (provider_id <> 'shipbob' or environment in ('sandbox', 'production')) not valid;
alter table public.source_accounts add constraint shipbob_source_environment_valid
  check (provider_id <> 'shipbob' or environment in ('sandbox', 'production')) not valid;
