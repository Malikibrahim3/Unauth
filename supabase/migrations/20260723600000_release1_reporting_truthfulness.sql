-- Release 1 reporting truthfulness
-- Route normalized missing-item cases to fulfilment/warehouse reporting while
-- preserving the compatibility claim_type returned by the drill-down API.

create or replace function public.get_financial_report_records(
  p_merchant_id uuid,
  p_cutoff timestamptz default null,
  p_currency text default null,
  p_metric text default 'exposed',
  p_category text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  support_payout_case_id uuid,
  case_status text,
  claim_type text,
  submitted_at timestamptz,
  updated_at timestamptz,
  currency text,
  amount_minor bigint,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_currency text := upper(trim(p_currency));
begin
  if p_merchant_id is null then
    raise exception 'financial_report_merchant_required' using errcode = '22023';
  end if;
  if p_metric not in (
    'requested', 'exposed', 'approved', 'paid', 'estimated_loss',
    'prevented', 'confirmed_loss', 'recoverable', 'recovered',
    'outstanding', 'written_off', 'final_net_loss'
  ) then
    raise exception 'financial_report_metric_invalid' using errcode = '22023';
  end if;
  if p_currency is not null and v_currency !~ '^[A-Z]{3}$' then
    raise exception 'financial_report_currency_invalid' using errcode = '22023';
  end if;
  if p_category is not null and p_category not in (
    'delivery_loss', 'chargeback_or_payment_dispute',
    'fulfilment_or_warehouse_error', 'supplier_or_vendor_issue'
  ) then
    raise exception 'financial_report_category_invalid' using errcode = '22023';
  end if;

  return query
  with eligible as (
    select
      summary.support_payout_case_id,
      payout_case.status::text as case_status,
      payout_case.claim_type::text as claim_type,
      coalesce(payout_case.submitted_at, payout_case.created_at) as submitted_at,
      summary.updated_at,
      summary.currency::text as currency,
      case p_metric
        when 'requested' then summary.requested_minor
        when 'exposed' then summary.exposed_minor
        when 'approved' then summary.approved_minor
        when 'paid' then summary.paid_minor
        when 'estimated_loss' then summary.estimated_loss_minor
        when 'prevented' then summary.prevented_minor
        when 'confirmed_loss' then summary.confirmed_loss_minor
        when 'recoverable' then summary.recoverable_minor
        when 'recovered' then summary.recovered_minor
        when 'outstanding' then greatest(
          summary.recoverable_minor - summary.recovered_minor - summary.written_off_minor,
          0
        )
        when 'written_off' then summary.written_off_minor
        when 'final_net_loss' then greatest(
          summary.confirmed_loss_minor - summary.recovered_minor,
          0
        )
      end::bigint as amount_minor
    from public.case_financial_summaries summary
    join public.support_payout_cases payout_case
      on payout_case.id = summary.support_payout_case_id
     and payout_case.merchant_id = summary.merchant_id
    where summary.merchant_id = p_merchant_id
      and (
        p_cutoff is null
        or coalesce(payout_case.submitted_at, payout_case.created_at) >= p_cutoff
      )
      and (p_currency is null or summary.currency = v_currency)
      and (
        (p_metric = 'outstanding' and summary.known_states @> array['recoverable']::text[])
        or (
          p_metric = 'final_net_loss'
          and summary.known_states @> array['confirmed_loss']::text[]
        )
        or (
          p_metric not in ('outstanding', 'final_net_loss')
          and summary.known_states @> array[p_metric]::text[]
        )
      )
      and (
        p_category is null
        or (
          p_category = 'delivery_loss'
          and coalesce(
            nullif(trim(payout_case.reason_normalized), ''),
            payout_case.claim_type::text
          ) in ('item_not_received', 'missing_parcel')
        )
        or (
          p_category = 'chargeback_or_payment_dispute'
          and coalesce(
            nullif(trim(payout_case.reason_normalized), ''),
            payout_case.claim_type::text
          ) = 'chargeback'
        )
        or (
          p_category = 'fulfilment_or_warehouse_error'
          and coalesce(
            nullif(trim(payout_case.reason_normalized), ''),
            payout_case.claim_type::text
          ) in ('missing_item', 'wrong_item', 'damaged', 'not_as_described')
        )
        or (
          p_category = 'supplier_or_vendor_issue'
          and coalesce(
            nullif(trim(payout_case.reason_normalized), ''),
            payout_case.claim_type::text,
            'unknown'
          ) not in (
            'item_not_received', 'missing_parcel', 'chargeback',
            'missing_item', 'wrong_item', 'damaged', 'not_as_described'
          )
        )
      )
  )
  select
    eligible.support_payout_case_id,
    eligible.case_status,
    eligible.claim_type,
    eligible.submitted_at,
    eligible.updated_at,
    eligible.currency,
    eligible.amount_minor,
    count(*) over()::bigint as total_count
  from eligible
  order by eligible.submitted_at desc nulls last,
           eligible.updated_at desc,
           eligible.support_payout_case_id
  limit greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$function$;

revoke all on function public.get_financial_report_records(
  uuid, timestamptz, text, text, text, integer, integer
) from public, anon, authenticated;
grant execute on function public.get_financial_report_records(
  uuid, timestamptz, text, text, text, integer, integer
) to service_role;

comment on function public.get_financial_report_records(
  uuid, timestamptz, text, text, text, integer, integer
) is
  'Merchant-scoped canonical financial drill-down; normalized case issue controls category routing.';
