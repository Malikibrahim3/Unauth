-- Merchant clarity P02: one period/population contract for reconciliation.
-- Read-only functions only: no period close, provider action, or history rewrite.

create or replace function public.reconciliation_page_v2(
  p_merchant_id uuid,
  p_status text default 'open',
  p_source text default null,
  p_currency text default null,
  p_search text default null,
  p_page integer default 1,
  p_page_size integer default 25,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns jsonb language plpgsql security definer set search_path = public
as $function$
declare
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 25), 1), 100);
  v_offset integer;
  v_total bigint;
  v_earlier bigint;
  v_rows jsonb;
  v_currency text := case when p_currency is null then null else upper(trim(p_currency)) end;
begin
  if p_status not in ('open', 'resolved', 'dismissed', 'all') then
    raise exception 'reconciliation_page_status_invalid' using errcode = '22023';
  end if;
  if v_currency is not null and v_currency !~ '^[A-Z]{3}$' then
    raise exception 'reconciliation_page_currency_invalid' using errcode = '22023';
  end if;
  if p_from is not null and p_to is not null and p_from >= p_to then
    raise exception 'reconciliation_page_period_invalid' using errcode = '22023';
  end if;
  v_offset := (v_page - 1) * v_page_size;

  with filtered as (
    select e.* from public.case_exceptions e
    where e.merchant_id = p_merchant_id
      and (p_status = 'all' or e.status = p_status)
      and (p_from is null or e.created_at >= p_from)
      and (p_to is null or e.created_at < p_to)
      and (nullif(trim(p_source), '') is null or e.source_system = trim(p_source))
      and (v_currency is null or upper(coalesce(e.context->>'currency', e.context#>>'{source,currency}', e.context#>>'{ledger,currency}')) = v_currency)
      and (nullif(trim(p_search), '') is null or e.id::text ilike '%' || trim(p_search) || '%'
        or e.title ilike '%' || trim(p_search) || '%' or coalesce(e.detail, '') ilike '%' || trim(p_search) || '%')
  ) select count(*) into v_total from filtered;

  with filtered as (
    select e.* from public.case_exceptions e
    where e.merchant_id = p_merchant_id
      and (p_status = 'all' or e.status = p_status)
      and (p_from is null or e.created_at >= p_from)
      and (p_to is null or e.created_at < p_to)
      and (nullif(trim(p_source), '') is null or e.source_system = trim(p_source))
      and (v_currency is null or upper(coalesce(e.context->>'currency', e.context#>>'{source,currency}', e.context#>>'{ledger,currency}')) = v_currency)
      and (nullif(trim(p_search), '') is null or e.id::text ilike '%' || trim(p_search) || '%'
        or e.title ilike '%' || trim(p_search) || '%' or coalesce(e.detail, '') ilike '%' || trim(p_search) || '%')
    order by e.created_at desc, e.id desc offset v_offset limit v_page_size
  ) select coalesce(jsonb_agg(to_jsonb(filtered) order by created_at desc, id desc), '[]'::jsonb)
    into v_rows from filtered;

  select count(*) into v_earlier from public.case_exceptions e
  where e.merchant_id = p_merchant_id and e.status = 'open'
    and p_from is not null and e.created_at < p_from;

  return jsonb_build_object(
    'rows', v_rows, 'page', v_page, 'page_size', v_page_size,
    'total_count', v_total, 'total_pages', greatest(1, ceil(v_total::numeric / v_page_size)::integer),
    'status', p_status, 'source', p_source, 'currency', v_currency,
    'from', p_from, 'to', p_to, 'boundary', 'start_inclusive_end_exclusive',
    'timezone', 'Europe/London', 'population', 'case_exceptions_created_at',
    'earlier_outstanding_count', v_earlier,
    'stable_order', 'created_at_desc_id_desc'
  );
end;
$function$;

create or replace function public.financial_period_preview_v1(
  p_merchant_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb language plpgsql security definer set search_path = public
as $function$
declare
  v_blockers jsonb;
  v_blocker_count bigint;
  v_earlier_count bigint;
  v_settlements jsonb;
begin
  if p_from is null or p_to is null or p_from >= p_to then
    raise exception 'financial_period_preview_invalid' using errcode = '22023';
  end if;
  select count(*) into v_blocker_count from public.case_exceptions
  where merchant_id = p_merchant_id and status = 'open'
    and created_at >= p_from and created_at < p_to;
  select coalesce(jsonb_agg(to_jsonb(b) order by b.created_at, b.id), '[]'::jsonb)
    into v_blockers
  from (
    select id, title, assigned_to, created_at from public.case_exceptions
    where merchant_id = p_merchant_id and status = 'open'
      and created_at >= p_from and created_at < p_to
    order by created_at, id limit 501
  ) b;
  select count(*) into v_earlier_count from public.case_exceptions
  where merchant_id = p_merchant_id and status = 'open' and created_at < p_from;

  select coalesce(jsonb_agg(to_jsonb(s) order by s.currency), '[]'::jsonb)
    into v_settlements
  from (
    select upper(currency) as currency, count(*)::bigint as record_count,
      coalesce(sum(case when credit_type = 'reversal' then -amount_minor else amount_minor end), 0)::bigint as received_minor,
      coalesce(sum(case when credit_type = 'reversal' then -amount_minor else amount_minor end) filter (where match_status = 'matched'), 0)::bigint as matched_minor,
      coalesce(sum(case when credit_type = 'reversal' then -amount_minor else amount_minor end) filter (where reconciliation_status = 'received_unreconciled'), 0)::bigint as received_unreconciled_minor,
      coalesce(sum(case when credit_type = 'reversal' then -amount_minor else amount_minor end) filter (where reconciliation_status = 'reconciled'), 0)::bigint as reconciled_minor
    from public.provider_credit_records
    where merchant_id = p_merchant_id
      and observation_authority in ('source_observed', 'receipt_backed_manual')
      and coalesce(observed_at, occurred_at, ingested_at) >= p_from
      and coalesce(observed_at, occurred_at, ingested_at) < p_to
    group by upper(currency)
  ) s;

  return jsonb_build_object(
    'from', p_from, 'to', p_to, 'timezone', 'Europe/London',
    'boundary', 'start_inclusive_end_exclusive',
    'blockers', v_blockers, 'blocker_count', v_blocker_count,
    'blockers_complete', v_blocker_count <= 500,
    'earlier_outstanding_count', v_earlier_count,
    'settlements', v_settlements, 'settlement_state', 'available',
    'observation_authority', 'source_or_receipt_backed_only'
  );
end;
$function$;

revoke all on function public.reconciliation_page_v2(uuid,text,text,text,text,integer,integer,timestamptz,timestamptz) from public;
revoke all on function public.financial_period_preview_v1(uuid,timestamptz,timestamptz) from public;
grant execute on function public.reconciliation_page_v2(uuid,text,text,text,text,integer,integer,timestamptz,timestamptz) to service_role;
grant execute on function public.financial_period_preview_v1(uuid,timestamptz,timestamptz) to service_role;

comment on function public.reconciliation_page_v2(uuid,text,text,text,text,integer,integer,timestamptz,timestamptz) is
  'P02 stable reconciliation paging within an explicit start-inclusive/end-exclusive period, with earlier work counted separately.';
comment on function public.financial_period_preview_v1(uuid,timestamptz,timestamptz) is
  'P02 read-only exact blocker and source/receipt-backed settlement snapshot for close review.';

create or replace function public.get_financial_report_records_v2(
  p_merchant_id uuid,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_currency text default null,
  p_metric text default 'exposed',
  p_category text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  support_payout_case_id uuid, case_status text, claim_type text,
  submitted_at timestamptz, updated_at timestamptz, currency text,
  amount_minor bigint, total_count bigint
)
language plpgsql security definer set search_path = public
as $function$
declare
  v_currency text := case when p_currency is null then null else upper(trim(p_currency)) end;
begin
  if p_merchant_id is null then raise exception 'financial_report_merchant_required' using errcode = '22023'; end if;
  if p_from is not null and p_to is not null and p_from >= p_to then raise exception 'financial_report_period_invalid' using errcode = '22023'; end if;
  if p_metric not in ('requested','exposed','approved','paid','estimated_loss','prevented','confirmed_loss','recoverable','recovered','outstanding','written_off','final_net_loss') then
    raise exception 'financial_report_metric_invalid' using errcode = '22023';
  end if;
  if v_currency is not null and v_currency !~ '^[A-Z]{3}$' then raise exception 'financial_report_currency_invalid' using errcode = '22023'; end if;
  if p_category is not null and p_category not in ('delivery_loss','chargeback_or_payment_dispute','fulfilment_or_warehouse_error','supplier_or_vendor_issue') then
    raise exception 'financial_report_category_invalid' using errcode = '22023';
  end if;

  return query
  with eligible as (
    select summary.support_payout_case_id, payout_case.status::text as case_status,
      payout_case.claim_type::text as claim_type,
      coalesce(payout_case.submitted_at, payout_case.created_at) as submitted_at,
      summary.updated_at, upper(summary.currency::text) as currency,
      case p_metric
        when 'requested' then summary.requested_minor when 'exposed' then summary.exposed_minor
        when 'approved' then summary.approved_minor when 'paid' then summary.paid_minor
        when 'estimated_loss' then summary.estimated_loss_minor when 'prevented' then summary.prevented_minor
        when 'confirmed_loss' then summary.confirmed_loss_minor when 'recoverable' then summary.recoverable_minor
        when 'recovered' then summary.recovered_minor
        when 'outstanding' then greatest(summary.recoverable_minor-summary.recovered_minor-summary.written_off_minor,0)
        when 'written_off' then summary.written_off_minor
        when 'final_net_loss' then greatest(summary.confirmed_loss_minor-summary.recovered_minor,0)
      end::bigint as amount_minor
    from public.case_financial_summaries summary
    join public.support_payout_cases payout_case on payout_case.id=summary.support_payout_case_id and payout_case.merchant_id=summary.merchant_id
    where summary.merchant_id=p_merchant_id
      and (p_from is null or coalesce(payout_case.submitted_at,payout_case.created_at)>=p_from)
      and (p_to is null or coalesce(payout_case.submitted_at,payout_case.created_at)<p_to)
      and (v_currency is null or upper(summary.currency::text)=v_currency)
      and ((p_metric='outstanding' and summary.known_states @> array['recoverable']::text[])
        or (p_metric='final_net_loss' and summary.known_states @> array['confirmed_loss']::text[])
        or (p_metric not in ('outstanding','final_net_loss') and summary.known_states @> array[p_metric]::text[]))
      and (p_category is null
        or (p_category='delivery_loss' and coalesce(nullif(trim(payout_case.reason_normalized),''),payout_case.claim_type::text) in ('item_not_received','missing_parcel'))
        or (p_category='chargeback_or_payment_dispute' and coalesce(nullif(trim(payout_case.reason_normalized),''),payout_case.claim_type::text)='chargeback')
        or (p_category='fulfilment_or_warehouse_error' and coalesce(nullif(trim(payout_case.reason_normalized),''),payout_case.claim_type::text) in ('missing_item','wrong_item','damaged','not_as_described'))
        or (p_category='supplier_or_vendor_issue' and coalesce(nullif(trim(payout_case.reason_normalized),''),payout_case.claim_type::text,'unknown') not in ('item_not_received','missing_parcel','chargeback','missing_item','wrong_item','damaged','not_as_described')))
  )
  select eligible.*, count(*) over()::bigint from eligible
  order by eligible.submitted_at desc nulls last, eligible.updated_at desc, eligible.support_payout_case_id
  limit greatest(1,least(coalesce(p_limit,50),200)) offset greatest(coalesce(p_offset,0),0);
end;
$function$;

revoke all on function public.get_financial_report_records_v2(uuid,timestamptz,timestamptz,text,text,text,integer,integer) from public;
grant execute on function public.get_financial_report_records_v2(uuid,timestamptz,timestamptz,text,text,text,integer,integer) to service_role;
comment on function public.get_financial_report_records_v2(uuid,timestamptz,timestamptz,text,text,text,integer,integer) is
  'P02 currency-separated supporting records within the same case-submission start-inclusive/end-exclusive scope as canonical aggregates.';
