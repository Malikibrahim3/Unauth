-- The pending account-selection handoff is service-role-only. Its original
-- migration defined RLS but omitted the underlying PostgreSQL table grant.

begin;

grant select, insert, update, delete
  on table public.pending_provider_account_selections
  to service_role;

commit;
