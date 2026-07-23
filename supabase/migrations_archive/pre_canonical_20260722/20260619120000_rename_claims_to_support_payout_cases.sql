-- 20260619120000_rename_claims_to_support_payout_cases.sql
--
-- Renames public.claims -> public.support_payout_cases and adds additive
-- payout-exposure / loss-attribution / recovery-path columns.
--
-- SCOPE: data-layer rename + additive columns ONLY. No scoring / matching /
-- cluster logic. All existing data preserved (RENAME, not recreate).
--
-- DELIBERATE: child FK columns (claim_events.claim_id, claim_outcomes.claim_id,
-- claim_evidence.claim_id, rule_evaluations.claim_id) are KEPT to limit blast
-- radius. FK constraint names also stay claims_* — they are never referenced by
-- app code and there are no PostgREST embeds by name. The index / constraint /
-- trigger / policy renames below are cosmetic and fully idempotent.
--
-- Fully guarded so it is a no-op on a database whose rebuild snapshot already
-- creates the table under the final name (see supabase/rebuild/001_new_schema.sql).

begin;

-- 1. Rename the table. Indexes, constraints, triggers, RLS policies, grants,
--    and all inbound FKs follow automatically and keep working.
alter table if exists public.claims rename to support_payout_cases;

-- 2. (Cosmetic, DB-internal only) align child object names with the new table.
alter index if exists idx_claims_order             rename to idx_support_payout_cases_order;
alter index if exists idx_claims_merchant_status    rename to idx_support_payout_cases_merchant_status;
alter index if exists idx_claims_identity           rename to idx_support_payout_cases_identity;
alter index if exists idx_claims_merchant_submitted rename to idx_support_payout_cases_merchant_submitted;

do $$ begin
  if exists (select 1 from pg_trigger where tgname = 'trg_claims_updated') then
    execute 'alter trigger trg_claims_updated on public.support_payout_cases rename to trg_support_payout_cases_updated';
  end if;
  if exists (select 1 from pg_trigger where tgname = 'trg_claims_status_audit') then
    execute 'alter trigger trg_claims_status_audit on public.support_payout_cases rename to trg_support_payout_cases_status_audit';
  end if;
  if exists (select 1 from pg_policies where policyname = 'claims_member_select' and tablename = 'support_payout_cases') then
    execute 'alter policy claims_member_select on public.support_payout_cases rename to support_payout_cases_member_select';
  end if;
  if exists (select 1 from pg_policies where policyname = 'claims_member_update' and tablename = 'support_payout_cases') then
    execute 'alter policy claims_member_update on public.support_payout_cases rename to support_payout_cases_member_update';
  end if;
end $$;

-- 3. New enums (real PG enums, neutral non-accusatory vocabularies — these MUST
--    match the TypeScript enums in lib/payouts/types.ts exactly). Guarded.
do $$ begin
  create type requested_action as enum (
    'refund','reship','replacement','discount','store_credit','escalation','unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type loss_attribution as enum (
    'customer_claim','carrier_loss','carrier_damage','failed_delivery_evidence',
    'warehouse_mispick','warehouse_missing_item','three_pl_late_dispatch',
    'supplier_defect','packaging_failure','merchant_policy','unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attribution_confidence as enum (
    'high','medium','low','needs_more_evidence');
exception when duplicate_object then null; end $$;

do $$ begin
  create type recoverability as enum (
    'recoverable','possibly_recoverable','not_recoverable','needs_more_evidence','unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type recovery_owner as enum (
    'carrier','three_pl','warehouse','supplier','merchant','unknown');
exception when duplicate_object then null; end $$;

-- 4. Additive columns. All nullable (or defaulted) so existing rows stay valid.
--    Money columns reuse the existing support_payout_cases.currency column.
alter table public.support_payout_cases
  add column if not exists refund_amount              numeric(12,2),
  add column if not exists replacement_item_value     numeric(12,2),
  add column if not exists replacement_shipping_cost  numeric(12,2),
  add column if not exists discount_amount            numeric(12,2),
  add column if not exists store_credit_amount        numeric(12,2),
  add column if not exists estimated_support_cost     numeric(12,2),
  add column if not exists total_estimated_loss       numeric(12,2),
  add column if not exists requested_action           requested_action not null default 'unknown',
  add column if not exists loss_attribution           loss_attribution,
  add column if not exists attribution_confidence     attribution_confidence,
  add column if not exists recoverability             recoverability,
  add column if not exists recovery_owner             recovery_owner,
  add column if not exists recovery_required_evidence text[] not null default '{}',
  add column if not exists recovery_next_action       text;

-- 5. Indexes for new filterable columns (merchant_id / status / claim_type /
--    created_at are already covered by the carried-over indexes).
create index if not exists idx_support_payout_cases_requested_action
  on public.support_payout_cases (merchant_id, requested_action);
create index if not exists idx_support_payout_cases_loss_attribution
  on public.support_payout_cases (merchant_id, loss_attribution)
  where loss_attribution is not null;
create index if not exists idx_support_payout_cases_recoverability
  on public.support_payout_cases (merchant_id, recoverability)
  where recoverability is not null;

comment on table public.support_payout_cases is
  'Renamed from claims (2026-06-19). Support payout cases: payout exposure, '
  'loss attribution (advisory), and recovery path. Child FK columns retain '
  'claim_id naming by design to limit blast radius.';

-- 6. PostgREST schema reload.
notify pgrst, 'reload schema';

commit;
