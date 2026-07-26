-- Release 1 relationship and credential integrity.
--
-- A recovery rule must never point at another merchant's partner. Widget
-- tokens are children of merchant API keys and must stop working in the same
-- transaction that revokes the parent key.

do $block$
begin
  if exists (
    select 1
    from public.partner_recovery_rules rule
    join public.partners partner on partner.id = rule.partner_id
    where rule.partner_id is not null
      and partner.merchant_id <> rule.merchant_id
  ) then
    raise exception 'partner_recovery_rule_tenant_mismatch_preflight_failed'
      using errcode = '23514',
            hint = 'Repair cross-merchant partner_recovery_rules before applying this migration.';
  end if;

  if exists (
    select 1
    from public.merchant_widget_tokens token
    join public.merchant_api_keys api_key on api_key.id = token.api_key_id
    where token.api_key_id is not null
      and api_key.merchant_id <> token.merchant_id
  ) then
    raise exception 'widget_token_tenant_mismatch_preflight_failed'
      using errcode = '23514',
            hint = 'Repair cross-merchant merchant_widget_tokens before applying this migration.';
  end if;
end;
$block$;

alter table public.partners
  add constraint partners_id_merchant_id_key unique (id, merchant_id);

alter table public.partner_recovery_rules
  drop constraint if exists partner_recovery_rules_partner_id_fkey;

alter table public.partner_recovery_rules
  add constraint partner_recovery_rules_partner_merchant_fkey
  foreign key (partner_id, merchant_id)
  references public.partners (id, merchant_id)
  on delete cascade;

alter table public.merchant_api_keys
  add constraint merchant_api_keys_id_merchant_id_key unique (id, merchant_id);

alter table public.merchant_widget_tokens
  drop constraint if exists merchant_widget_tokens_api_key_id_fkey;

alter table public.merchant_widget_tokens
  add constraint merchant_widget_tokens_api_key_merchant_fkey
  foreign key (api_key_id, merchant_id)
  references public.merchant_api_keys (id, merchant_id)
  on delete cascade;

create or replace function public.revoke_merchant_api_key(
  p_merchant_id uuid,
  p_api_key_id uuid,
  p_revoked_at timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_key public.merchant_api_keys;
  v_widget_count integer := 0;
  v_replayed boolean := false;
begin
  if p_merchant_id is null or p_api_key_id is null then
    raise exception 'api_key_revoke_identifiers_required' using errcode = '22023';
  end if;

  select *
    into v_key
  from public.merchant_api_keys
  where id = p_api_key_id
    and merchant_id = p_merchant_id
  for update;

  if not found then
    raise exception 'api_key_not_found' using errcode = 'P0002';
  end if;

  if v_key.revoked_at is null then
    update public.merchant_api_keys
    set revoked_at = coalesce(p_revoked_at, clock_timestamp())
    where id = p_api_key_id
      and merchant_id = p_merchant_id;
  else
    v_replayed := true;
  end if;

  update public.merchant_widget_tokens
  set revoked_at = coalesce(
    revoked_at,
    v_key.revoked_at,
    p_revoked_at,
    clock_timestamp()
  )
  where api_key_id = p_api_key_id
    and merchant_id = p_merchant_id
    and revoked_at is null;
  get diagnostics v_widget_count = row_count;

  return jsonb_build_object(
    'api_key_id', p_api_key_id,
    'merchant_id', p_merchant_id,
    'revoked_at', coalesce(v_key.revoked_at, p_revoked_at),
    'widget_tokens_revoked', v_widget_count,
    'replayed', v_replayed
  );
end;
$function$;

revoke all on function public.revoke_merchant_api_key(uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.revoke_merchant_api_key(uuid, uuid, timestamptz)
  to service_role;

comment on function public.revoke_merchant_api_key(uuid, uuid, timestamptz) is
  'Atomically revokes a merchant API key and all paired widget tokens. Service role only.';
