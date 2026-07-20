-- Third purge for Simeon Murray Store (af070af9-df1a-46ba-89f8-29409926ef61):
-- every source_orders/source_customers/source_tickets row for this merchant
-- traces back to seed scripts (manual demo seed, seed-shopify-orders.ts
-- adversarial identity fixtures, e2e acceptance fixtures) rather than genuine
-- store activity. This clears all seeded data and its derived rows (payout
-- cases, recoveries, losses, identity resolution) so only future real
-- Shopify-synced activity remains. Scoped strictly to this merchant_id.
--
-- Left untouched (connection/config, not data): merchants, merchant_users,
-- store_connections, merchant_integrations, source_accounts,
-- helpdesk_connections, merchant_rules, merchant_rule_versions, partners,
-- partner_recovery_rules. The Shopify connection and webhooks stay live so
-- real orders continue to sync in.

begin;

alter table public.claim_events disable trigger user;
alter table public.case_decisions disable trigger user;
alter table public.case_outcomes disable trigger user;
alter table public.recovery_case_events disable trigger user;
alter table public.case_financial_entries disable trigger user;
alter table public.domain_events disable trigger user;

delete from public.notifications where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.work_tasks where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';

delete from public.recovery_case_events
where recovery_case_id in (select id from public.recovery_cases where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61');
delete from public.recovery_cases where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.loss_cases where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';

delete from public.claim_outcomes
where claim_id in (select id from public.support_payout_cases where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61');

delete from public.domain_event_deliveries
where domain_event_id in (select id from public.domain_events where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61');
delete from public.case_financial_summaries where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.case_financial_entries where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.case_decisions where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.case_outcomes where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.integration_evidence_items where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.claim_events where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.domain_events where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';

delete from public.record_match_resolutions where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.record_match_candidates where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.merchant_customer_signals where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.entity_relationships where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.source_records where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.ingestion_events where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';

delete from public.support_payout_cases where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.identity_signals where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.source_tickets where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.source_orders where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.source_addresses where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.source_customers where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';
delete from public.merchant_customers where merchant_id = 'af070af9-df1a-46ba-89f8-29409926ef61';

alter table public.claim_events enable trigger user;
alter table public.case_decisions enable trigger user;
alter table public.case_outcomes enable trigger user;
alter table public.recovery_case_events enable trigger user;
alter table public.case_financial_entries enable trigger user;
alter table public.domain_events enable trigger user;

commit;
