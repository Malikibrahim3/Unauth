-- Move encrypted provider credentials from provider singleton ownership to an
-- explicit canonical connection. Refuse ambiguous backfills.

begin;

update public.integration_credentials ic
set connection_id = (
  select mi.id
  from public.merchant_integrations mi
  where mi.merchant_id = ic.merchant_id
    and mi.provider_id = ic.provider_id
  order by
    case when mi.status in ('pending', 'connected', 'degraded', 'syncing') then 0 else 1 end,
    mi.updated_at desc
  limit 1
)
where ic.connection_id is null;

do $$
begin
  if exists (select 1 from public.integration_credentials where connection_id is null) then
    raise exception 'integration credential has no canonical connection; repair before applying connection scope';
  end if;
  if exists (
    select 1
    from public.integration_credentials
    group by connection_id
    having count(*) > 1
  ) then
    raise exception 'multiple credential rows resolve to one connection';
  end if;
end $$;

alter table public.integration_credentials
  drop constraint if exists integration_credentials_merchant_id_provider_id_key;

create unique index if not exists integration_credentials_connection_key
  on public.integration_credentials (connection_id);

alter table public.integration_credentials
  alter column connection_id set not null;

alter table public.merchant_integrations
  drop constraint if exists merchant_integrations_id_merchant_id_key;
alter table public.merchant_integrations
  add constraint merchant_integrations_id_merchant_id_key unique (id, merchant_id);

alter table public.integration_credentials
  drop constraint if exists integration_credentials_connection_merchant_fkey;
alter table public.integration_credentials
  add constraint integration_credentials_connection_merchant_fkey
  foreign key (connection_id, merchant_id)
  references public.merchant_integrations (id, merchant_id)
  on delete cascade;

comment on column public.integration_credentials.connection_id is
  'Required owning connection. Provider-wide credential lookup is prohibited.';

commit;
