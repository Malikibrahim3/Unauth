-- One-off purge of E2E/webhook-test debris on the Simeon Murray Store merchant
-- (af070af9-df1a-46ba-89f8-29409926ef61) so it can be reseeded as a clean,
-- realistic "big merchant" sample dataset. Scoped strictly to this merchant_id.
-- merchant_rules / merchant_rule_versions are intentionally left untouched —
-- they are legitimate seeded rules, not test debris.

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
delete from public.source_orders where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.source_customers where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';

alter table public.claim_events enable trigger user;
alter table public.case_decisions enable trigger user;
alter table public.case_outcomes enable trigger user;
alter table public.recovery_case_events enable trigger user;
alter table public.case_financial_entries enable trigger user;

commit;
