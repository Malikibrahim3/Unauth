-- The version table was created after the project's baseline grants and needs
-- explicit privileges in addition to RLS policies.
begin;

grant select on table public.merchant_rule_versions to authenticated;
grant select, insert, update, delete on table public.merchant_rule_versions to service_role;

commit;
