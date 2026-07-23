-- Atomic, payload-aware and lease-fenced webhook delivery claims.

begin;

alter table public.processed_webhooks
  add column if not exists payload_hash text,
  add column if not exists claim_token uuid,
  add column if not exists lease_expires_at timestamp with time zone,
  add column if not exists object_key text,
  add column if not exists event_version bigint,
  add column if not exists result_payload jsonb;

alter table public.checkout_signals
  add column if not exists idempotency_key text;

create unique index if not exists checkout_signals_merchant_idempotency_key_idx
  on public.checkout_signals (merchant_id, idempotency_key)
  where idempotency_key is not null;

alter table public.support_payout_cases
  add column if not exists api_idempotency_key text,
  add column if not exists api_payload_hash text;

create unique index if not exists support_payout_cases_api_idempotency_key_idx
  on public.support_payout_cases (merchant_id, api_idempotency_key)
  where api_idempotency_key is not null;

create index if not exists processed_webhooks_processing_lease_idx
  on public.processed_webhooks (lease_expires_at)
  where status = 'processing';

create index if not exists processed_webhooks_object_version_idx
  on public.processed_webhooks (provider, store_key, object_key, event_version desc)
  where object_key is not null and event_version is not null;

drop function if exists public.claim_processed_webhook(text, text, text, text);
drop function if exists public.claim_processed_webhook(text, text, text, text, text, integer);

create function public.claim_processed_webhook(
  p_key text,
  p_provider text,
  p_store_key text,
  p_topic text,
  p_payload_hash text,
  p_lease_seconds integer default 300,
  p_object_key text default null,
  p_event_version bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_row public.processed_webhooks;
  v_token uuid := gen_random_uuid();
  v_inserted boolean := false;
begin
  if nullif(trim(p_key), '') is null
     or nullif(trim(p_provider), '') is null
     or nullif(trim(p_payload_hash), '') is null then
    raise exception 'invalid_webhook_claim';
  end if;
  if (p_object_key is null) <> (p_event_version is null) then
    raise exception 'invalid_webhook_object_version';
  end if;

  -- Serialize claims for one provider account/object even when the delivery
  -- identifiers differ. The transaction-scoped lock is released immediately
  -- after this function returns; the processing lease then owns the work.
  if p_object_key is not null then
    perform pg_advisory_xact_lock(
      hashtextextended(concat_ws(chr(31), p_provider, coalesce(p_store_key, ''), p_object_key), 0)
    );
  end if;

  insert into public.processed_webhooks (
    idempotency_key,
    provider,
    store_key,
    topic,
    status,
    attempts,
    last_error,
    payload_hash,
    claim_token,
    lease_expires_at,
    object_key,
    event_version,
    processed_at,
    updated_at
  ) values (
    p_key,
    p_provider,
    p_store_key,
    p_topic,
    'processing',
    1,
    null,
    p_payload_hash,
    v_token,
    now() + make_interval(secs => greatest(p_lease_seconds, 1)),
    p_object_key,
    p_event_version,
    now(),
    now()
  )
  on conflict (idempotency_key) do nothing
  returning * into v_row;

  v_inserted := found;

  if not v_inserted then
    select * into v_row
      from public.processed_webhooks
     where idempotency_key = p_key
     for update;

    if v_row.payload_hash is not null and v_row.payload_hash <> p_payload_hash then
      return jsonb_build_object('status', 'conflict');
    end if;
    if (v_row.object_key is not null and v_row.object_key is distinct from p_object_key)
       or (v_row.event_version is not null and v_row.event_version is distinct from p_event_version) then
      return jsonb_build_object('status', 'conflict');
    end if;

    if v_row.status in ('completed', 'ignored') then
      return jsonb_build_object(
        'status', 'duplicate',
        'result', v_row.result_payload
      );
    end if;

    if v_row.status = 'processing'
       and v_row.lease_expires_at is not null
       and v_row.lease_expires_at > now() then
      return jsonb_build_object('status', 'in_progress');
    end if;
  end if;

  if p_object_key is not null then
    -- Expired workers can never complete (the completion RPC also checks the
    -- lease). Mark them failed before deciding whether this object is free.
    update public.processed_webhooks
       set status = 'failed',
           last_error = 'lease_expired',
           lease_expires_at = null,
           updated_at = now()
     where provider = p_provider
       and store_key is not distinct from p_store_key
       and object_key = p_object_key
       and idempotency_key <> p_key
       and status = 'processing'
       and (lease_expires_at is null or lease_expires_at <= now());

    if exists (
      select 1
        from public.processed_webhooks
       where provider = p_provider
         and store_key is not distinct from p_store_key
         and object_key = p_object_key
         and idempotency_key <> p_key
         and status in ('completed', 'ignored')
         and event_version >= p_event_version
    ) then
      update public.processed_webhooks
         set provider = p_provider,
             store_key = p_store_key,
             topic = p_topic,
             status = 'ignored',
             attempts = attempts + case when v_inserted then 0 else 1 end,
             last_error = null,
             payload_hash = coalesce(payload_hash, p_payload_hash),
             object_key = coalesce(object_key, p_object_key),
             event_version = coalesce(event_version, p_event_version),
             claim_token = null,
             lease_expires_at = null,
             processed_at = now(),
             updated_at = now()
       where idempotency_key = p_key;
      return jsonb_build_object('status', 'stale');
    end if;

    if exists (
      select 1
        from public.processed_webhooks
       where provider = p_provider
         and store_key is not distinct from p_store_key
         and object_key = p_object_key
         and idempotency_key <> p_key
         and status = 'processing'
         and lease_expires_at > now()
    ) then
      update public.processed_webhooks
         set provider = p_provider,
             store_key = p_store_key,
             topic = p_topic,
             status = 'failed',
             attempts = attempts + case when v_inserted then 0 else 1 end,
             last_error = 'object_in_progress',
             payload_hash = coalesce(payload_hash, p_payload_hash),
             object_key = coalesce(object_key, p_object_key),
             event_version = coalesce(event_version, p_event_version),
             claim_token = null,
             lease_expires_at = null,
             updated_at = now()
       where idempotency_key = p_key;
      return jsonb_build_object('status', 'busy');
    end if;
  end if;

  if v_inserted then
    return jsonb_build_object('status', 'claimed', 'claim_token', v_token);
  end if;

  update public.processed_webhooks
     set provider = p_provider,
         store_key = p_store_key,
         topic = p_topic,
         status = 'processing',
         attempts = attempts + 1,
         last_error = null,
         payload_hash = coalesce(payload_hash, p_payload_hash),
         object_key = coalesce(object_key, p_object_key),
         event_version = coalesce(event_version, p_event_version),
         claim_token = v_token,
         lease_expires_at = now() + make_interval(secs => greatest(p_lease_seconds, 1)),
         result_payload = null,
         updated_at = now()
   where idempotency_key = p_key;

  return jsonb_build_object('status', 'claimed', 'claim_token', v_token);
end;
$function$;

drop function if exists public.complete_processed_webhook(text, uuid, text, text);

create function public.complete_processed_webhook(
  p_key text,
  p_claim_token uuid,
  p_status text,
  p_last_error text default null,
  p_result jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_rows integer;
begin
  if p_status not in ('completed', 'failed') then
    raise exception 'invalid_webhook_completion_status';
  end if;

  update public.processed_webhooks
     set status = p_status,
         last_error = case when p_status = 'failed' then left(p_last_error, 300) else null end,
         result_payload = case when p_status = 'completed' then p_result else null end,
         processed_at = case when p_status = 'completed' then now() else processed_at end,
         lease_expires_at = null,
         updated_at = now()
   where idempotency_key = p_key
     and claim_token = p_claim_token
     and status = 'processing'
     and lease_expires_at > now();

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$function$;

revoke all on function public.claim_processed_webhook(text, text, text, text, text, integer, text, bigint)
  from public, anon, authenticated;
revoke all on function public.complete_processed_webhook(text, uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.claim_processed_webhook(text, text, text, text, text, integer, text, bigint)
  to service_role;
grant execute on function public.complete_processed_webhook(text, uuid, text, text, jsonb)
  to service_role;

notify pgrst, 'reload schema';
commit;
