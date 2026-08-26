import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20260822100000_cases_external_recovery_truth.sql",
  "utf8",
);
const requiredSchemaRepair = readFileSync(
  "supabase/migrations/20260822110000_repair_required_schema_drift.sql",
  "utf8",
);
const runtimeReadModelRepair = readFileSync(
  "supabase/migrations/20260822120000_repair_cases_runtime_read_models.sql",
  "utf8",
);
const liveSchemaReconciliation = readFileSync(
  "supabase/migrations/20260822130000_reconcile_live_schema_to_canonical.sql",
  "utf8",
);
const canonicalPrivilegeRepair = readFileSync(
  "supabase/migrations/20260822140000_restore_canonical_privileges.sql",
  "utf8",
);

describe("Cases external recovery migration contract", () => {
  it("contains the additive provenance fields and all three append-only recovery tables", () => {
    expect(migration).toContain("case_source_class");
    expect(migration).toContain("source_lineage_root_id");
    expect(migration).toContain(
      "create table if not exists public.recovery_claim_packs",
    );
    expect(migration).toContain(
      "create table if not exists public.recovery_claim_submissions",
    );
    expect(migration).toContain(
      "create table if not exists public.recovery_provider_responses",
    );
    expect(migration).toContain("recovery_claim_history_is_append_only");
  });

  it("uses tenant predicates and refuses final packs unless readiness is ready_to_submit", () => {
    expect(migration).toContain("public.is_merchant_member(merchant_id)");
    expect(migration).toContain(
      "p_state = 'final' and p_readiness <> 'ready_to_submit'",
    );
    expect(migration).toContain("current_claim_pack_id");
    expect(migration).toContain("p_idempotency_key");
    expect(migration).toContain(
      "where id = p_receipt_evidence_item_id and merchant_id = p_merchant_id",
    );
    expect(migration).toContain(
      "where id = p_response_correspondence_id and merchant_id = p_merchant_id",
    );
  });

  it("repairs every live Cases read-model field without replacing unknown money with inferred recovery", () => {
    expect(requiredSchemaRepair).toContain(
      "add column if not exists responsibility_confirmation_state",
    );
    expect(requiredSchemaRepair).toContain(
      "create table if not exists public.case_prevention_observations",
    );
    expect(runtimeReadModelRepair).toContain(
      "add column if not exists amount_sought_minor",
    );
    expect(runtimeReadModelRepair).toContain(
      "add column if not exists amount_approved_minor",
    );
    expect(runtimeReadModelRepair).toContain(
      "add column if not exists is_primary",
    );
    expect(runtimeReadModelRepair).toContain(
      "add column if not exists evidence_gap",
    );
    expect(runtimeReadModelRepair).toContain(
      "Provider approval amount. Approval is not recovered cash.",
    );
  });

  it("reconciles legacy schema drift without inventing identity or request-IP evidence", () => {
    expect(liveSchemaReconciliation).toContain(
      "to_regclass('public.case_investigation_dispatches') IS NULL",
    );
    expect(liveSchemaReconciliation).toContain(
      "SET request_ip = '0.0.0.0'::inet",
    );
    expect(liveSchemaReconciliation).toContain(
      "DISABLE TRIGGER trg_network_access_log_noupd",
    );
    expect(liveSchemaReconciliation).toContain(
      "merchant_users_owner_is_active CHECK",
    );
    expect(liveSchemaReconciliation).toContain(
      "user_id IS NOT NULL) NOT VALID",
    );
  });

  it("keeps the public schema and canonical read paths usable by application roles", () => {
    expect(canonicalPrivilegeRepair).toContain(
      "GRANT USAGE ON SCHEMA public TO authenticated",
    );
    expect(canonicalPrivilegeRepair).toContain(
      "GRANT USAGE ON SCHEMA public TO service_role",
    );
    expect(canonicalPrivilegeRepair).toContain(
      "GRANT ALL ON public.merchant_users TO service_role",
    );
    expect(canonicalPrivilegeRepair).toContain(
      "GRANT ALL ON FUNCTION public.is_merchant_member(uuid) TO authenticated",
    );
  });
});
