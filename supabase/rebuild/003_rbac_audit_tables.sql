-- ============================================================================
-- 003 — RBAC delegation + compliance audit tables (post-cutover, 2026-06-11)
--
-- The v2 cutover (001) modeled tenancy via merchant_users (role enum) and the
-- k-anonymous network_access_log, but dropped three tables the application
-- layer still depends on and that a major-retailer deployment needs for
-- compliance + RBAC:
--   * user_permission_grants  — per-user delegated permissions beyond role
--                               defaults (lib/permissions hasPermission; the
--                               team permissions UI). Was a phantom even in
--                               legacy_v1 — delegation has been non-functional.
--   * user_action_log         — privileged-action audit trail (138 legacy rows)
--   * access_audit_log        — customer-lookup audit trail, distinct from the
--                               k-anon network_access_log (664 legacy rows)
--
-- All merchant-scoped under the single is_merchant_member() predicate. Logs are
-- insert-only for members; grants are owner/admin-managed.
-- ============================================================================

-- ── user_permission_grants (delegation) ────────────────────────────────────
create table if not exists user_permission_grants (
  id               uuid primary key default gen_random_uuid(),
  merchant_id      uuid not null references merchants(id) on delete cascade,
  grantee_user_id  uuid not null references auth.users(id) on delete cascade,
  permission       text not null,
  granted_by       uuid references auth.users(id) on delete set null,
  revoked          boolean not null default false,
  created_at       timestamptz not null default now(),
  revoked_at       timestamptz,
  unique (merchant_id, grantee_user_id, permission)
);
create index if not exists idx_user_permission_grants_lookup
  on user_permission_grants(merchant_id, grantee_user_id) where not revoked;
alter table user_permission_grants enable row level security;
revoke all on user_permission_grants from anon;
grant all on user_permission_grants to service_role;
grant select on user_permission_grants to authenticated;
drop policy if exists user_permission_grants_member_select on user_permission_grants;
create policy user_permission_grants_member_select on user_permission_grants
  for select to authenticated using (is_merchant_member(merchant_id));
drop policy if exists user_permission_grants_owner_write on user_permission_grants;
create policy user_permission_grants_owner_write on user_permission_grants
  for all to authenticated using (merchant_role(merchant_id) in ('owner','admin'));

-- ── user_action_log (privileged-action audit) ──────────────────────────────
create table if not exists user_action_log (
  id             uuid primary key default gen_random_uuid(),
  merchant_id    uuid not null references merchants(id) on delete cascade,
  actor_user_id  uuid not null references auth.users(id) on delete cascade,
  actor_role     text not null,
  action         text not null,
  resource_type  text,
  resource_id    text,
  metadata       jsonb not null default '{}'::jsonb,
  request_ip     text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_user_action_log_merchant on user_action_log(merchant_id, created_at desc);
alter table user_action_log enable row level security;
revoke all on user_action_log from anon;
grant all on user_action_log to service_role;
grant select on user_action_log to authenticated;
drop policy if exists user_action_log_member_select on user_action_log;
create policy user_action_log_member_select on user_action_log
  for select to authenticated using (is_merchant_member(merchant_id));

-- ── access_audit_log (customer-lookup audit; distinct from network_access_log)
create table if not exists access_audit_log (
  id                    uuid primary key default gen_random_uuid(),
  merchant_id           uuid not null references merchants(id) on delete cascade,
  identity_id           uuid,                       -- not FK: historical ids predate v2 identities
  query_type            text not null,
  k_anonymity_satisfied boolean not null,
  result_returned       boolean not null,
  queried_hashes        text[],
  matched_merchant_count integer,
  lookup_type           text,
  request_ip            text,
  created_at            timestamptz not null default now()
);
create index if not exists idx_access_audit_log_merchant on access_audit_log(merchant_id, created_at desc);
alter table access_audit_log enable row level security;
revoke all on access_audit_log from anon;
grant all on access_audit_log to service_role;
grant select on access_audit_log to authenticated;
drop policy if exists access_audit_log_member_select on access_audit_log;
create policy access_audit_log_member_select on access_audit_log
  for select to authenticated using (is_merchant_member(merchant_id));

-- ── migrate historical rows where the merchant still exists in v2 ───────────
insert into user_action_log
  (id, merchant_id, actor_user_id, actor_role, action, resource_type, resource_id, metadata, request_ip, created_at)
select l.id, l.merchant_id, l.actor_user_id, l.actor_role, l.action, l.resource_type, l.resource_id,
       coalesce(l.metadata, '{}'::jsonb), l.request_ip, l.created_at
from legacy_v1.user_action_log l
join merchants m on m.id = l.merchant_id
join auth.users u on u.id = l.actor_user_id
on conflict (id) do nothing;

insert into access_audit_log
  (id, merchant_id, identity_id, query_type, k_anonymity_satisfied, result_returned,
   queried_hashes, matched_merchant_count, lookup_type, request_ip, created_at)
select l.id, l.merchant_id, l.identity_id, l.query_type, l.k_anonymity_satisfied, l.result_returned,
       l.queried_hashes, l.matched_merchant_count, l.lookup_type, l.request_ip, l.created_at
from legacy_v1.access_audit_log l
join merchants m on m.id = l.merchant_id
on conflict (id) do nothing;

notify pgrst, 'reload schema';
