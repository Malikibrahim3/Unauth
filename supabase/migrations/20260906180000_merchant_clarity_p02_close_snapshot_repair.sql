-- P02 repair: close snapshots use the same reversal signs as the reviewed
-- source/receipt-backed preview. Existing closures and ledger history are unchanged.
create or replace function public.close_financial_period(
  p_merchant_id uuid,
  p_actor_id uuid,
  p_period text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_acknowledged_blocker_ids uuid[],
  p_note text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_existing public.financial_period_closures;
  v_closure public.financial_period_closures;
  v_open_blockers uuid[];
  v_acknowledged uuid[];
  v_position jsonb;
  v_settlements jsonb;
  v_request jsonb;
  v_fingerprint text;
  v_event public.domain_events;
  v_closure_id uuid := gen_random_uuid();
begin
  if p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    or p_period_start is null or p_period_end is null or p_period_start >= p_period_end
    or to_char(p_period_start at time zone 'Europe/London', 'YYYY-MM') <> p_period
    or to_char((p_period_end - interval '1 microsecond') at time zone 'Europe/London', 'YYYY-MM') <> p_period then
    raise exception 'financial_period_window_invalid' using errcode = '22023';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 or length(p_idempotency_key) > 200 then
    raise exception 'financial_period_idempotency_key_required' using errcode = '22023';
  end if;
  if p_note is not null and length(p_note) > 2000 then
    raise exception 'financial_period_note_too_long' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.merchant_users membership
    where membership.merchant_id = p_merchant_id
      and membership.user_id = p_actor_id
      and membership.invite_status = 'active'
      and membership.role::text in ('owner', 'admin')
  ) then
    raise exception 'financial_period_actor_not_authorized' using errcode = '42501';
  end if;

  v_acknowledged := coalesce((
    select array_agg(distinct blocker_id order by blocker_id)
    from unnest(coalesce(p_acknowledged_blocker_ids, '{}'::uuid[])) blocker_id
  ), '{}'::uuid[]);
  v_request := jsonb_build_object(
    'merchant_id', p_merchant_id,
    'actor_id', p_actor_id,
    'period', p_period,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'acknowledged_blocker_ids', v_acknowledged,
    'note', p_note
  );
  v_fingerprint := encode(extensions.digest(convert_to(v_request::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_existing from public.financial_period_closures
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.request_fingerprint is distinct from v_fingerprint then
      raise exception 'financial_period_idempotency_conflict' using errcode = '22023';
    end if;
    return jsonb_build_object(
      'closureId', v_existing.id,
      'period', v_existing.period,
      'signedOffAt', v_existing.signed_off_at,
      'position', v_existing.position_snapshot,
      'settlements', v_existing.settlement_snapshot,
      'acknowledgedBlockerIds', v_existing.acknowledged_blocker_ids,
      'auditReceipt', jsonb_build_object('domainEventId', v_existing.domain_event_id),
      'replayed', true,
      'externalActionsPerformed', 0
    );
  end if;
  if exists (
    select 1 from public.financial_period_closures
    where merchant_id = p_merchant_id and period = p_period
  ) then
    raise exception 'financial_period_already_closed' using errcode = '23505';
  end if;

  select coalesce(array_agg(id order by id), '{}'::uuid[]) into v_open_blockers
  from public.case_exceptions
  where merchant_id = p_merchant_id
    and status = 'open'
    and created_at >= p_period_start and created_at < p_period_end;
  if v_open_blockers is distinct from v_acknowledged then
    raise exception 'financial_period_blockers_changed' using errcode = '40001';
  end if;

  v_position := public.financial_aggregate_v1(
    p_merchant_id, p_period_start, p_period_end, null
  );
  select jsonb_build_object(
    'state', 'available',
    'currencies', coalesce(jsonb_agg(to_jsonb(grouped) order by grouped.currency), '[]'::jsonb),
    'observationAuthority', 'source_or_receipt_backed_only'
  ) into v_settlements
  from (
    select upper(currency) as currency,
      count(*)::bigint as record_count,
      coalesce(sum(case when credit_type = 'reversal' then -amount_minor else amount_minor end), 0)::bigint as observed_minor,
      coalesce(sum(case when credit_type = 'reversal' then -amount_minor else amount_minor end) filter (where match_status = 'matched'), 0)::bigint as matched_minor,
      coalesce(sum(case when credit_type = 'reversal' then -amount_minor else amount_minor end) filter (where reconciliation_status = 'reconciled'), 0)::bigint as reconciled_minor,
      coalesce(sum(case when credit_type = 'reversal' then -amount_minor else amount_minor end) filter (where reconciliation_status = 'received_unreconciled'), 0)::bigint as received_unreconciled_minor
    from public.provider_credit_records
    where merchant_id = p_merchant_id
      and observation_authority in ('source_observed', 'receipt_backed_manual')
      and coalesce(observed_at, occurred_at, ingested_at) >= p_period_start
      and coalesce(observed_at, occurred_at, ingested_at) < p_period_end
    group by upper(currency)
  ) grouped;

  select * into v_event from public.record_domain_event(
    p_merchant_id,
    'financial_period.closed',
    'financial_period',
    v_closure_id,
    'financial-period-close:' || p_idempotency_key,
    jsonb_build_object(
      'closure_id', v_closure_id,
      'period', p_period,
      'acknowledged_blocker_ids', v_acknowledged,
      'position_snapshot', v_position,
      'settlement_snapshot', v_settlements,
      'request_fingerprint', v_fingerprint,
      'external_actions_performed', 0
    ),
    null, null, null, 'user', p_actor_id
  );

  insert into public.financial_period_closures (
    id, merchant_id, period, period_start, period_end,
    acknowledged_blocker_ids, position_snapshot, settlement_snapshot,
    note, actor_user_id, idempotency_key, request_fingerprint, domain_event_id
  ) values (
    v_closure_id, p_merchant_id, p_period, p_period_start, p_period_end,
    v_acknowledged, v_position, v_settlements,
    nullif(trim(p_note), ''), p_actor_id, p_idempotency_key, v_fingerprint, v_event.id
  ) returning * into v_closure;

  return jsonb_build_object(
    'closureId', v_closure.id,
    'period', p_period,
    'signedOffAt', v_closure.signed_off_at,
    'position', v_position,
    'settlements', v_settlements,
    'acknowledgedBlockerIds', v_acknowledged,
    'auditReceipt', jsonb_build_object('domainEventId', v_event.id),
    'replayed', false,
    'externalActionsPerformed', 0
  );
end;
$function$;
