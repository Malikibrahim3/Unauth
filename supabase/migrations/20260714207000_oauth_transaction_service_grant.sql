-- The OAuth transaction ledger is intentionally service-role-only. The
-- original migration added its RLS policy after revoking browser roles, but
-- omitted the underlying table grant that PostgreSQL still requires before
-- RLS is evaluated.

begin;

grant select, insert, update, delete
  on table public.oauth_connection_transactions
  to service_role;

commit;
