-- Forward repair for environments where the release-1 investigation migration
-- is marked applied but runtime-critical investigation fields are absent. This
-- is intentionally idempotent so it is safe to apply to already-correct
-- schemas.

alter table public.case_clarification_requests
  add column if not exists partner_id uuid;

alter table public.partners
  add column if not exists default_contact_channel text,
  add column if not exists response_sla_hours integer,
  add column if not exists contact_instructions text;

alter table public.merchants
  add column if not exists investigation_response_sla_hours integer not null default 48,
  add column if not exists investigation_reply_to text,
  add column if not exists investigation_email_enabled boolean not null default false;

do $block$
begin
  if exists (
    select 1
    from public.case_clarification_requests request
    join public.partners partner
      on partner.id = request.partner_id
    where request.partner_id is not null
      and partner.merchant_id <> request.merchant_id
  ) then
    raise exception 'case_investigation_partner_tenant_mismatch_repair_failed'
      using errcode = '23514',
            hint = 'Repair cross-merchant partner references before applying the investigation schema repair.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'partners_id_merchant_id_key'
      and conrelid = 'public.partners'::regclass
  ) then
    alter table public.partners
      add constraint partners_id_merchant_id_key unique (id, merchant_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'partners_default_contact_channel_check'
      and conrelid = 'public.partners'::regclass
  ) then
    alter table public.partners
      add constraint partners_default_contact_channel_check
        check (
          default_contact_channel is null
          or default_contact_channel in ('email', 'portal', 'manual', 'api')
        );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'partners_response_sla_hours_check'
      and conrelid = 'public.partners'::regclass
  ) then
    alter table public.partners
      add constraint partners_response_sla_hours_check
        check (response_sla_hours is null or response_sla_hours between 1 and 2160);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'partners_contact_instructions_length_check'
      and conrelid = 'public.partners'::regclass
  ) then
    alter table public.partners
      add constraint partners_contact_instructions_length_check
        check (contact_instructions is null or char_length(contact_instructions) <= 4000);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'case_investigations_partner_merchant_fkey'
      and conrelid = 'public.case_clarification_requests'::regclass
  ) then
    alter table public.case_clarification_requests
      add constraint case_investigations_partner_merchant_fkey
        foreign key (partner_id, merchant_id)
        references public.partners (id, merchant_id)
        on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'merchants_investigation_sla_check'
      and conrelid = 'public.merchants'::regclass
  ) then
    alter table public.merchants
      add constraint merchants_investigation_sla_check
        check (investigation_response_sla_hours between 1 and 2160);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'merchants_investigation_reply_to_check'
      and conrelid = 'public.merchants'::regclass
  ) then
    alter table public.merchants
      add constraint merchants_investigation_reply_to_check
        check (
          investigation_reply_to is null
          or investigation_reply_to ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        );
  end if;
end;
$block$;
