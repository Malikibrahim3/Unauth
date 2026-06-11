-- ============================================================================
-- 002 — Post-test-suite fixes (2026-06-11, test report scripts/v2-tests/REPORT.md)
-- C1: claim status transitions audited at DB level
-- C2: claims listing index (merchant_id, submitted_at desc)
-- C3: merchant_widget_tokens restored into v2 (was never migrated at cutover)
-- C5: lookup_network_identity k_anonymity_satisfied semantics documented
-- ============================================================================

-- ── C1: status-change audit trigger.
-- Guarantees a claim_events row for every status transition regardless of the
-- mutation path (app, SQL, future tooling). App-layer event writes remain
-- richer (actor, notes); this is the floor, not the ceiling.
create or replace function audit_claim_status_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into claim_events (claim_id, merchant_id, event_type, from_status, to_status, metadata)
    values (new.id, new.merchant_id, 'status_changed', old.status, new.status,
            jsonb_build_object('source', 'db_trigger'));
  end if;
  return new;
end $$;

drop trigger if exists trg_claims_status_audit on claims;
create trigger trg_claims_status_audit
  after update of status on claims
  for each row execute function audit_claim_status_change();

-- ── C2: claims listing query index (was Seq Scan)
create index if not exists idx_claims_merchant_submitted
  on claims (merchant_id, submitted_at desc);

-- ── C3: widget token table (same shape as legacy_v1.merchant_widget_tokens)
create table if not exists merchant_widget_tokens (
  id           uuid primary key default gen_random_uuid(),
  merchant_id  uuid not null references merchants(id) on delete cascade,
  api_key_id   uuid references merchant_api_keys(id) on delete cascade,
  token_hash   text not null unique,
  token_prefix text not null,
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz
);
create index if not exists idx_widget_tokens_merchant on merchant_widget_tokens(merchant_id) where revoked_at is null;
alter table merchant_widget_tokens enable row level security;
revoke all on merchant_widget_tokens from anon;
drop policy if exists widget_tokens_member_select on merchant_widget_tokens;
create policy widget_tokens_member_select on merchant_widget_tokens
  for select to authenticated using (is_merchant_member(merchant_id));
-- writes are server-side only (service_role bypasses RLS)

insert into merchant_widget_tokens (id, merchant_id, api_key_id, token_hash, token_prefix, created_at, revoked_at)
select id, merchant_id, api_key_id, token_hash, token_prefix, created_at, revoked_at
from legacy_v1.merchant_widget_tokens
on conflict (id) do nothing;

-- ── C5: document k_anonymity_satisfied semantics (behavior unchanged)
comment on column network_access_log.k_anonymity_satisfied is
  'bool_and(merchant_count >= 3) over identities MATCHED by the queried hashes '
  '(pre-disclosure-filter). Vacuously TRUE when zero identities matched — nothing '
  'was disclosed. FALSE flags that an under-k identity matched (e.g. own-merchant '
  'exception disclosures).';

notify pgrst, 'reload schema';
