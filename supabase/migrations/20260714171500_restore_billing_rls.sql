-- Restore the billing and credit RLS contract after the public-schema rebuild.
--
-- These tables were recreated without RLS while their migration-history entries
-- remained applied. Keep all mutations behind service-role billing workflows;
-- authenticated merchant members may only read their own billing state.

begin;

alter table public.plans enable row level security;
alter table public.merchant_subscriptions enable row level security;
alter table public.merchant_credits enable row level security;
alter table public.credit_topup_log enable row level security;
alter table public.billing_events_log enable row level security;
alter table public.context_credit_events enable row level security;
alter table public.migration_orphans enable row level security;

drop policy if exists plans_select_all on public.plans;
create policy plans_select_all
  on public.plans
  for select
  to anon, authenticated
  using (true);

drop policy if exists merchant_subscriptions_select_own on public.merchant_subscriptions;
create policy merchant_subscriptions_select_own
  on public.merchant_subscriptions
  for select
  to authenticated
  using (public.is_merchant_member(merchant_id));

drop policy if exists merchant_credits_select_own on public.merchant_credits;
create policy merchant_credits_select_own
  on public.merchant_credits
  for select
  to authenticated
  using (public.is_merchant_member(merchant_id));

drop policy if exists credit_topup_log_select_own on public.credit_topup_log;
create policy credit_topup_log_select_own
  on public.credit_topup_log
  for select
  to authenticated
  using (public.is_merchant_member(merchant_id));

drop policy if exists billing_events_log_select_own on public.billing_events_log;
create policy billing_events_log_select_own
  on public.billing_events_log
  for select
  to authenticated
  using (public.is_merchant_member(merchant_id));

drop policy if exists context_credit_events_select_own_merchant on public.context_credit_events;
create policy context_credit_events_select_own_merchant
  on public.context_credit_events
  for select
  to authenticated
  using (public.is_merchant_member(merchant_id));

-- Remove the broad grants introduced by the rebuild before restoring the
-- minimum privileges required by the API roles.
revoke all on public.plans from anon, authenticated;
revoke all on public.merchant_subscriptions from anon, authenticated;
revoke all on public.merchant_credits from anon, authenticated;
revoke all on public.credit_topup_log from anon, authenticated;
revoke all on public.billing_events_log from anon, authenticated;
revoke all on public.context_credit_events from anon, authenticated;
revoke all on public.migration_orphans from anon, authenticated;

grant select on public.plans to anon, authenticated;
grant select on public.merchant_subscriptions to authenticated;
grant select on public.merchant_credits to authenticated;
grant select on public.credit_topup_log to authenticated;
grant select on public.billing_events_log to authenticated;
grant select on public.context_credit_events to authenticated;

grant all on public.plans to service_role;
grant all on public.merchant_subscriptions to service_role;
grant all on public.merchant_credits to service_role;
grant all on public.credit_topup_log to service_role;
grant all on public.billing_events_log to service_role;
grant all on public.context_credit_events to service_role;
grant all on public.migration_orphans to service_role;

commit;
