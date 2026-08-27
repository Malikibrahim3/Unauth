\set ON_ERROR_STOP on

begin;

create temporary table mr4_state (key text primary key, payload jsonb not null) on commit drop;

insert into public.merchants (id, name, is_demo)
values ('40000000-0000-4000-8000-000000000001', 'MR4 rollback merchant', true);

insert into public.support_payout_cases (id, merchant_id, claim_type, status, submitted_at, manual_reference)
values (
  '40000000-0000-4000-8000-000000000002',
  '40000000-0000-4000-8000-000000000001',
  'item_not_received', 'recovery_opened', now() - interval '2 days', 'MR4-ROLLBACK-CASE'
);

insert into public.loss_cases (
  id, merchant_id, support_payout_case_id, case_category, case_type,
  recovery_route, status, currency, financial_state
) values (
  '40000000-0000-4000-8000-000000000003',
  '40000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000002',
  'delivery_loss', 'carrier_loss', 'carrier_claim', 'approved', 'GBP', 'confirmed'
);

insert into public.recovery_cases (
  id, merchant_id, support_payout_case_id, loss_case_id, recovery_type,
  owner_type, status, merchant_loss_amount, eligible_loss_amount,
  amount_sought_minor, amount_approved_minor, currency, provider_position,
  claim_readiness, provider_claim_stage
) values (
  '40000000-0000-4000-8000-000000000004',
  '40000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000002',
  '40000000-0000-4000-8000-000000000003',
  'carrier_claim', 'carrier', 'approved', 100, 100,
  10000, 10000, 'GBP', 'accepted', 'provider_position_recorded', 'approved'
);

insert into public.source_records (
  id, merchant_id, source_system, source_entity_type, external_id,
  canonical_entity_type, canonical_entity_id, source_updated_at
) values
  ('40000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000001', 'ups', 'provider_credit', 'credit-4000', 'recovery_case', '40000000-0000-4000-8000-000000000004', now()),
  ('40000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000001', 'ups', 'provider_credit', 'credit-6000', 'recovery_case', '40000000-0000-4000-8000-000000000004', now()),
  ('40000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000001', 'ups', 'provider_credit', 'reversal-1000', 'recovery_case', '40000000-0000-4000-8000-000000000004', now());

-- A source position/approval alone has no received-money effect.
do $proof$
begin
  if (select amount_recovered_minor from public.recovery_cases where id = '40000000-0000-4000-8000-000000000004') <> 0 then
    raise exception 'MR4 approval incorrectly advanced received value';
  end if;
end
$proof$;

insert into mr4_state
select 'credit-1', public.record_provider_credit_v1(
  '40000000-0000-4000-8000-000000000001', 'ups', 'credit-4000', 'claim-1', 'order-1', 'shipment-1',
  'credit', 4000, 'GBP', now() - interval '1 day', now(), 'source_observed', null,
  '40000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000004',
  '40000000-0000-4000-8000-000000000002', null, null, 'UPS source credit observed', '{}'::jsonb, 'mr4-credit-observed-1'
);

do $proof$
begin
  if (select amount_recovered_minor from public.recovery_cases where id = '40000000-0000-4000-8000-000000000004') <> 0 then
    raise exception 'MR4 observation incorrectly advanced received value';
  end if;
end
$proof$;

insert into mr4_state
select 'credit-1-match', public.transition_provider_credit_v1(
  '40000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004',
  (select (payload->'credit'->>'id')::uuid from mr4_state where key = 'credit-1'),
  'matched', 1, 'external_claim_reference', 1, null, 'Claim and credit reference agree', 'mr4-credit-match-1'
);

do $proof$
begin
  if (select amount_recovered_minor from public.recovery_cases where id = '40000000-0000-4000-8000-000000000004') <> 4000 then
    raise exception 'MR4 matched credit did not advance received value';
  end if;
  if (select reconciliation_status from public.provider_credit_records where id = (select (payload->'credit'->>'id')::uuid from mr4_state where key = 'credit-1')) <> 'received_unreconciled' then
    raise exception 'MR4 match incorrectly skipped received-unreconciled';
  end if;
end
$proof$;

insert into mr4_state
select 'credit-1-reconcile', public.transition_provider_credit_v1(
  '40000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004',
  (select (payload->'credit'->>'id')::uuid from mr4_state where key = 'credit-1'),
  'reconciled', 2, null, null, null, 'Ledger entry independently checked', 'mr4-credit-reconcile-1'
);

insert into mr4_state
select 'credit-2', public.record_provider_credit_v1(
  '40000000-0000-4000-8000-000000000001', 'ups', 'credit-6000', 'claim-1', 'order-1', 'shipment-1',
  'credit', 6000, 'GBP', now(), now(), 'source_observed', null,
  '40000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000004',
  '40000000-0000-4000-8000-000000000002', null, null, 'UPS settlement balance observed', '{}'::jsonb, 'mr4-credit-observed-2'
);
insert into mr4_state
select 'credit-2-match', public.transition_provider_credit_v1(
  '40000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004',
  (select (payload->'credit'->>'id')::uuid from mr4_state where key = 'credit-2'),
  'matched', 1, 'external_claim_reference', 1, null, 'Settlement reference agrees', 'mr4-credit-match-2'
);
insert into mr4_state
select 'credit-2-reconcile', public.transition_provider_credit_v1(
  '40000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004',
  (select (payload->'credit'->>'id')::uuid from mr4_state where key = 'credit-2'),
  'reconciled', 2, null, null, null, 'Settlement reconciled to ledger', 'mr4-credit-reconcile-2'
);

do $proof$
begin
  if not exists (select 1 from public.recovery_cases where id = '40000000-0000-4000-8000-000000000004' and amount_recovered_minor = 10000 and status = 'paid' and claim_readiness = 'reconciled') then
    raise exception 'MR4 full recovery did not reach paid/reconciled';
  end if;
end
$proof$;

-- A correction is a new source fact and a new reversing ledger entry.
insert into mr4_state
select 'reversal', public.record_provider_credit_v1(
  '40000000-0000-4000-8000-000000000001', 'ups', 'reversal-1000', 'claim-1', 'order-1', 'shipment-1',
  'reversal', 1000, 'GBP', now(), now(), 'source_observed', null,
  '40000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000004',
  '40000000-0000-4000-8000-000000000002',
  (select (payload->'credit'->>'id')::uuid from mr4_state where key = 'credit-1'),
  null, 'UPS reversed part of the original credit', '{}'::jsonb, 'mr4-credit-reversal-observed'
);
insert into mr4_state
select 'reversal-match', public.transition_provider_credit_v1(
  '40000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004',
  (select (payload->'credit'->>'id')::uuid from mr4_state where key = 'reversal'),
  'matched', 1, 'reversal_reference', 1, null, 'Reversal reference agrees', 'mr4-credit-reversal-match'
);

do $proof$
declare original_entry uuid;
begin
  select id into original_entry from public.case_financial_entries
  where provider_credit_record_id = (select (payload->'credit'->>'id')::uuid from mr4_state where key = 'credit-1');
  if not exists (select 1 from public.case_financial_entries where reverses_entry_id = original_entry and amount_minor = 1000) then
    raise exception 'MR4 reversal did not append a reversing ledger entry';
  end if;
  if (select amount_recovered_minor from public.recovery_cases where id = '40000000-0000-4000-8000-000000000004') <> 9000 then
    raise exception 'MR4 reversal did not reduce the recovery projection';
  end if;
end
$proof$;

-- Manual received edits and history edits fail closed.
do $proof$
begin
  begin
    update public.recovery_cases set amount_recovered_minor = 8999
    where id = '40000000-0000-4000-8000-000000000004';
    raise exception 'MR4 manual received edit unexpectedly succeeded';
  exception when sqlstate '22023' then null;
  end;
  begin
    update public.provider_credit_events set reason = 'rewrite';
    raise exception 'MR4 provider credit history rewrite unexpectedly succeeded';
  exception when sqlstate '55000' then null;
  end;
end
$proof$;

-- Exception 101 remains reachable, and Recovery "View all" reaches later pages.
insert into public.case_exceptions (
  merchant_id, support_payout_case_id, exception_type, confidence, status,
  title, detail, context, source_system, dedup_key, created_at
)
select '40000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002',
  'unmatched_refund', 'probable', 'open', 'MR4 exception ' || n, 'Paging proof',
  jsonb_build_object('currency', 'GBP'), 'shopify', 'mr4-exception-' || n,
  now() - (n || ' seconds')::interval
from generate_series(1, 101) n;

insert into public.recovery_cases (
  merchant_id, support_payout_case_id, loss_case_id, recovery_type, owner_type,
  status, merchant_loss_amount, eligible_loss_amount, amount_sought_minor, currency
)
select '40000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002',
  '40000000-0000-4000-8000-000000000003', 'carrier_claim', 'carrier', 'draft', 1, 1, 100, 'GBP'
from generate_series(1, 50);

do $proof$
declare exceptions jsonb; recoveries jsonb; aggregate jsonb;
begin
  exceptions := public.reconciliation_page_v1('40000000-0000-4000-8000-000000000001', 'open', null, 'GBP', null, 5, 25);
  if (exceptions->>'total_count')::integer <> 101 or jsonb_array_length(exceptions->'rows') <> 1 then
    raise exception 'MR4 exception 101 is not reachable';
  end if;
  recoveries := public.recovery_page_v1('40000000-0000-4000-8000-000000000001', 'all', 'GBP', null, 3, 25);
  if (recoveries->>'total_count')::integer <> 51 or jsonb_array_length(recoveries->'rows') <> 1 then
    raise exception 'MR4 Recovery View all does not reach the final page';
  end if;
  aggregate := public.financial_aggregate_v1('40000000-0000-4000-8000-000000000001', null, null, 'GBP');
  if aggregate->>'definition_version' <> 'mr4-financial-v1'
     or aggregate->>'mixed_currency_policy' <> 'separated'
     or aggregate->>'unknown_policy' <> 'withheld_not_zero' then
    raise exception 'MR4 canonical aggregate metadata drifted';
  end if;
end
$proof$;

select 'MR4_SQL_RECOVERY_MONEY_TRUTH_PASS' as result;
rollback;
