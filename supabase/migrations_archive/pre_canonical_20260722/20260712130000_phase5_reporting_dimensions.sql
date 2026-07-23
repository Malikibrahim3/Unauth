-- Phase 5 reporting dimensions. Additive: historical facts are not rewritten.
begin;
create index if not exists idx_case_financial_summaries_merchant_currency
  on public.case_financial_summaries (merchant_id, currency, support_payout_case_id);
create index if not exists idx_support_payout_cases_reporting_period
  on public.support_payout_cases (merchant_id, submitted_at, currency, status);
create index if not exists idx_support_payout_cases_reporting_reason
  on public.support_payout_cases (merchant_id, reason_normalized, submitted_at);
create index if not exists idx_recovery_cases_reporting_period
  on public.recovery_cases (merchant_id, updated_at, currency, status);

create or replace view public.reporting_case_dimensions
with (security_invoker = true) as
select c.merchant_id, c.id as support_payout_case_id,
       coalesce(c.submitted_at, c.created_at) as period_at,
       c.currency, c.status, c.claim_type, c.reason_normalized,
       c.loss_attribution, c.recovery_owner,
       f.requested_minor, f.paid_minor, f.prevented_minor,
       f.confirmed_loss_minor, f.recoverable_minor, f.recovered_minor,
       f.written_off_minor, f.updated_at as financial_updated_at
from public.support_payout_cases c
left join public.case_financial_summaries f
  on f.merchant_id = c.merchant_id and f.support_payout_case_id = c.id;
comment on view public.reporting_case_dimensions is
  'Derived merchant-scoped reporting dimensions; preserves source and ledger facts.';
commit;
