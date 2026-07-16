-- Second one-off purge: the first big-merchant seed run for Simeon Murray Store
-- (af070af9-df1a-46ba-89f8-29409926ef61) had a customer-name generation bug
-- (every customer got last name "Chen"). This clears that run's rows so the
-- corrected seed script can insert clean data. Scoped strictly to this
-- merchant_id. merchant_rules / merchant_rule_versions / partners /
-- partner_recovery_rules are left untouched (content-identical, upserted in place).

begin;

alter table public.claim_events disable trigger user;
alter table public.case_decisions disable trigger user;
alter table public.case_outcomes disable trigger user;
alter table public.recovery_case_events disable trigger user;
alter table public.case_financial_entries disable trigger user;

delete from public.notifications where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.work_tasks where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';

delete from public.recovery_case_events
where recovery_case_id in (select id from public.recovery_cases where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61');

delete from public.recovery_cases where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.loss_cases where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';

delete from public.claim_outcomes
where claim_id in (select id from public.support_payout_cases where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61');

delete from public.case_financial_summaries where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.case_financial_entries where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.case_decisions where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.case_outcomes where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.integration_evidence_items where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.claim_events where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';

delete from public.support_payout_cases where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.source_tickets where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.source_shipments where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.source_orders where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.source_customers where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';

alter table public.claim_events enable trigger user;
alter table public.case_decisions enable trigger user;
alter table public.case_outcomes enable trigger user;
alter table public.recovery_case_events enable trigger user;
alter table public.case_financial_entries enable trigger user;

commit;
