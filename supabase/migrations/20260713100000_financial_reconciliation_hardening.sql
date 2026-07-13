-- Reconcile legacy recovery rows into the canonical loss and financial ledgers.
-- Also prevents new orphan/cross-merchant/financially impossible recoveries.
begin;

insert into public.loss_cases (
  merchant_id,
  support_payout_case_id,
  case_category,
  case_type,
  recovery_route,
  status,
  counterparty_type,
  estimated_recovery_minor,
  currency,
  source_confidence,
  source_fingerprint,
  financial_state,
  attribution,
  recoverability,
  confirmed_at,
  source_metadata
)
select
  r.merchant_id,
  r.support_payout_case_id,
  case
    when r.recovery_type = 'carrier_claim' then 'delivery_loss'::public.loss_case_category
    when r.recovery_type = 'chargeback_evidence' then 'chargeback_or_payment_dispute'::public.loss_case_category
    when r.recovery_type = 'returns_provider_claim' then 'returns_abuse_or_exception'::public.loss_case_category
    when r.recovery_type in ('warehouse_error', 'three_pl_claim') then 'fulfilment_or_warehouse_error'::public.loss_case_category
    when r.recovery_type in ('supplier_defect', 'packaging_issue') then 'supplier_or_vendor_issue'::public.loss_case_category
    else 'unknown_post_purchase_loss'::public.loss_case_category
  end,
  r.recovery_type::text,
  case
    when r.recovery_type = 'carrier_claim' then 'carrier_claim'::public.loss_recovery_route
    when r.recovery_type = 'three_pl_claim' then '3pl_claim'::public.loss_recovery_route
    when r.recovery_type = 'chargeback_evidence' then 'chargeback_evidence_pack'::public.loss_recovery_route
    when r.recovery_type = 'returns_provider_claim' then 'returns_platform_claim'::public.loss_recovery_route
    when r.recovery_type = 'supplier_defect' then 'supplier_vendor_claim'::public.loss_recovery_route
    when r.recovery_type in ('warehouse_error', 'packaging_issue', 'internal_policy_fix') then 'internal_fulfilment_issue'::public.loss_recovery_route
    else 'needs_more_evidence'::public.loss_recovery_route
  end,
  case
    when r.status = 'submitted' then 'submitted'::public.loss_case_status
    when r.status in ('approved', 'paid') then 'approved'::public.loss_case_status
    when r.status = 'partially_approved' then 'partially_approved'::public.loss_case_status
    when r.status = 'rejected' then 'denied'::public.loss_case_status
    when r.status = 'closed_unrecoverable' then 'closed_unrecoverable'::public.loss_case_status
    when r.status in ('evidence_needed', 'draft') then 'collecting_evidence'::public.loss_case_status
    else 'detected'::public.loss_case_status
  end,
  case
    when r.owner_type = 'carrier' then 'carrier'::public.loss_counterparty_type
    when r.owner_type = 'three_pl' then '3pl'::public.loss_counterparty_type
    when r.owner_type = 'warehouse' then 'warehouse'::public.loss_counterparty_type
    when r.owner_type = 'supplier' then 'supplier'::public.loss_counterparty_type
    when r.owner_type = 'returns_provider' then 'returns_provider'::public.loss_counterparty_type
    when r.owner_type = 'payment_dispute_provider' then 'payment_processor'::public.loss_counterparty_type
    when r.owner_type in ('merchant_support', 'merchant_ops', 'merchant_finance') then 'internal_team'::public.loss_counterparty_type
    else 'unknown'::public.loss_counterparty_type
  end,
  round(coalesce(r.estimated_recoverable_max, r.eligible_loss_amount, r.merchant_loss_amount) * 100)::bigint,
  upper(r.currency),
  'source_verified'::public.loss_source_confidence,
  'recovery_cases:' || r.id::text,
  'confirmed',
  r.recovery_type::text,
  case when r.status = 'closed_unrecoverable' then 'not_recoverable' else 'recoverable' end,
  r.created_at,
  jsonb_build_object(
    'origin', 'recovery_case',
    'recovery_case_id', r.id,
    'merchant_loss_amount', r.merchant_loss_amount
  )
from public.recovery_cases r
where r.loss_case_id is null
  and coalesce(r.prevention_only, false) = false
  and r.merchant_loss_amount > 0
on conflict do nothing;

update public.recovery_cases r
set loss_case_id = lc.id
from public.loss_cases lc
where r.loss_case_id is null
  and r.merchant_id = lc.merchant_id
  and lc.source_fingerprint = 'recovery_cases:' || r.id::text;

insert into public.case_financial_entries (
  merchant_id,
  support_payout_case_id,
  recovery_case_id,
  state,
  amount_minor,
  currency,
  direction,
  effective_at,
  metadata
)
select
  r.merchant_id,
  r.support_payout_case_id,
  r.id,
  'confirmed_loss',
  round(r.merchant_loss_amount * 100)::bigint,
  upper(r.currency),
  'debit',
  r.created_at,
  jsonb_build_object('migration_key', 'reconciliation:recovery:confirmed_loss:' || r.id)
from public.recovery_cases r
where r.merchant_loss_amount > 0
  and upper(r.currency) ~ '^[A-Z]{3}$'
  and upper(r.currency) <> 'XXX'
on conflict do nothing;

insert into public.case_financial_summaries (
  merchant_id, support_payout_case_id, currency, requested_minor, exposed_minor,
  approved_minor, paid_minor, estimated_loss_minor, confirmed_loss_minor,
  recoverable_minor, recovered_minor, prevented_minor, written_off_minor,
  last_event_id, updated_at
)
select e.merchant_id, e.support_payout_case_id, e.currency,
  coalesce(sum(e.amount_minor) filter (where e.state = 'requested'), 0),
  coalesce(sum(e.amount_minor) filter (where e.state = 'exposed'), 0),
  coalesce(sum(e.amount_minor) filter (where e.state = 'approved'), 0),
  coalesce(sum(e.amount_minor) filter (where e.state = 'paid'), 0),
  coalesce(sum(e.amount_minor) filter (where e.state = 'estimated_loss'), 0),
  coalesce(sum(e.amount_minor) filter (where e.state = 'confirmed_loss'), 0),
  coalesce(sum(e.amount_minor) filter (where e.state = 'recoverable'), 0),
  coalesce(sum(e.amount_minor) filter (where e.state = 'recovered'), 0),
  coalesce(sum(e.amount_minor) filter (where e.state = 'prevented'), 0),
  coalesce(sum(e.amount_minor) filter (where e.state = 'written_off'), 0),
  (array_agg(e.id order by e.effective_at desc, e.created_at desc))[1],
  now()
from public.case_financial_entries e
where e.support_payout_case_id is not null
group by e.merchant_id, e.support_payout_case_id, e.currency
on conflict (merchant_id, support_payout_case_id, currency) do update set
  requested_minor = excluded.requested_minor,
  exposed_minor = excluded.exposed_minor,
  approved_minor = excluded.approved_minor,
  paid_minor = excluded.paid_minor,
  estimated_loss_minor = excluded.estimated_loss_minor,
  confirmed_loss_minor = excluded.confirmed_loss_minor,
  recoverable_minor = excluded.recoverable_minor,
  recovered_minor = excluded.recovered_minor,
  prevented_minor = excluded.prevented_minor,
  written_off_minor = excluded.written_off_minor,
  last_event_id = excluded.last_event_id,
  updated_at = excluded.updated_at;

create or replace function public.enforce_recovery_case_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not new.prevention_only and new.loss_case_id is null then
    raise exception 'recovery case requires a canonical loss case';
  end if;
  if new.loss_case_id is not null and not exists (
    select 1 from public.loss_cases l
    where l.id = new.loss_case_id and l.merchant_id = new.merchant_id
  ) then
    raise exception 'recovery case loss must belong to the same merchant';
  end if;
  if new.eligible_loss_amount is not null and new.eligible_loss_amount > new.merchant_loss_amount then
    raise exception 'eligible recovery cannot exceed merchant loss';
  end if;
  if new.estimated_recoverable_min is not null and new.estimated_recoverable_max is not null
     and new.estimated_recoverable_min > new.estimated_recoverable_max then
    raise exception 'minimum recovery estimate cannot exceed maximum';
  end if;
  if new.estimated_recoverable_max is not null
     and new.estimated_recoverable_max > coalesce(new.eligible_loss_amount, new.merchant_loss_amount) then
    raise exception 'recovery estimate cannot exceed eligible loss';
  end if;
  if new.amount_recovered is not null and new.amount_recovered > new.merchant_loss_amount then
    raise exception 'recovered amount cannot exceed merchant loss';
  end if;
  return new;
end
$$;

drop trigger if exists recovery_case_integrity on public.recovery_cases;
create trigger recovery_case_integrity
before insert or update on public.recovery_cases
for each row execute function public.enforce_recovery_case_integrity();

notify pgrst, 'reload schema';
commit;
