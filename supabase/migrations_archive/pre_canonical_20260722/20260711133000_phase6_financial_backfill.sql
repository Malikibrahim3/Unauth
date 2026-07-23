-- Phase 6: idempotent financial-ledger backfill and summary rebuild.
begin;

create unique index if not exists case_financial_entries_migration_key_unique
  on public.case_financial_entries (merchant_id, ((metadata ->> 'migration_key')))
  where metadata ? 'migration_key';

insert into public.case_financial_entries (
  merchant_id, support_payout_case_id, state, amount_minor, currency,
  direction, effective_at, metadata
)
select c.merchant_id, c.id, 'exposed', round(c.amount_at_risk * 100)::bigint,
       upper(coalesce(c.primary_currency, c.currency)), 'memo',
       coalesce(c.submitted_at, c.created_at),
       jsonb_build_object('migration_key', 'phase6:case:exposed:' || c.id)
from public.support_payout_cases c
where c.amount_at_risk > 0
  and coalesce(c.primary_currency, c.currency) is not null
on conflict do nothing;

insert into public.case_financial_entries (
  merchant_id, support_payout_case_id, state, amount_minor, currency,
  direction, effective_at, metadata
)
select c.merchant_id, o.claim_id, state.value, round(o.amount_refunded * 100)::bigint,
       upper(coalesce(c.primary_currency, c.currency)), 'debit',
       coalesce(o.decided_at, o.updated_at, c.updated_at),
       jsonb_build_object('migration_key', 'phase6:outcome:' || state.value || ':' || o.id)
from public.claim_outcomes o
join public.support_payout_cases c on c.id = o.claim_id
cross join lateral (values ('paid'), ('confirmed_loss')) as state(value)
where o.amount_refunded > 0
  and coalesce(c.primary_currency, c.currency) is not null
on conflict do nothing;

insert into public.case_financial_entries (
  merchant_id, support_payout_case_id, recovery_case_id, state, amount_minor,
  currency, direction, effective_at, metadata
)
select r.merchant_id, r.support_payout_case_id, r.id, 'recoverable',
       round(coalesce(r.estimated_recoverable_max, r.estimated_recoverable_min, r.eligible_loss_amount) * 100)::bigint,
       upper(r.currency), 'memo', r.created_at,
       jsonb_build_object('migration_key', 'phase6:recovery:recoverable:' || r.id)
from public.recovery_cases r
where coalesce(r.estimated_recoverable_max, r.estimated_recoverable_min, r.eligible_loss_amount) > 0
on conflict do nothing;

insert into public.case_financial_entries (
  merchant_id, support_payout_case_id, recovery_case_id, state, amount_minor,
  currency, direction, effective_at, metadata
)
select r.merchant_id, r.support_payout_case_id, r.id, 'recovered',
       round(r.amount_recovered * 100)::bigint, upper(r.currency), 'credit',
       r.updated_at,
       jsonb_build_object('migration_key', 'phase6:recovery:recovered:' || r.id)
from public.recovery_cases r
where r.amount_recovered > 0
on conflict do nothing;

insert into public.case_financial_entries (
  merchant_id, support_payout_case_id, state, amount_minor, currency,
  direction, effective_at, metadata
)
select c.merchant_id, o.claim_id, 'prevented', round(c.amount_at_risk * 100)::bigint,
       upper(coalesce(c.primary_currency, c.currency)), 'memo',
       coalesce(o.decided_at, o.updated_at, c.updated_at),
       jsonb_build_object('migration_key', 'phase6:outcome:prevented:' || o.id)
from public.claim_outcomes o
join public.support_payout_cases c on c.id = o.claim_id
where o.decision in ('denied', 'no_action')
  and c.amount_at_risk > 0
  and coalesce(c.primary_currency, c.currency) is not null
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
  (array_agg(e.id order by e.effective_at desc, e.created_at desc))[1], now()
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

notify pgrst, 'reload schema';
commit;
