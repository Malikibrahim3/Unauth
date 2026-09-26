/**
 * The active migration history used by every local release-proof command.
 *
 * Keep this list explicit. Deriving a release history from whatever happens to
 * be present on disk can silently include an unreviewed SQL file, while a
 * duplicated list lets a reviewed migration disappear from one of the gates.
 */
export const ACTIVE_MIGRATIONS = Object.freeze([
  '20260720000000_canonical_production_baseline.sql',
  '20260720100000_canonical_environment_supplement.sql',
  '20260721120000_durable_sensitive_audit.sql',
  '20260722100000_tenant_authorization_hardening.sql',
  '20260722200000_webhook_event_safety.sql',
  '20260722300000_privacy_erasure_retention.sql',
  '20260722400000_source_to_recovery_integrity.sql',
  '20260722500000_ownership_transfer_integrity.sql',
  '20260723100000_release1_relationship_credential_integrity.sql',
  '20260723150000_release1_case_issue_correction.sql',
  '20260723200000_release1_investigations.sql',
  '20260723300000_release1_responsibility_recovery.sql',
  '20260723400000_release1_investigation_email_dispatch.sql',
  '20260723500000_release1_investigation_privacy.sql',
  '20260723600000_release1_reporting_truthfulness.sql',
  '20260724100000_operational_work_read_model.sql',
  '20260724110000_work_saved_views.sql',
  '20260724120000_exception_resolution_integrity.sql',
  '20260725100000_evidence_reconciliation_pivot.sql',
  '20260727100000_work_views_claimed_items_grants.sql',
  '20260727130000_recovery_source_freshness.sql',
  '20260801120000_repair_release1_investigation_schema_drift.sql',
  '20260813120000_distinctive_analytics_read_models.sql',
  '20260822100000_cases_external_recovery_truth.sql',
  '20260822110000_repair_required_schema_drift.sql',
  '20260822120000_repair_cases_runtime_read_models.sql',
  '20260822130000_reconcile_live_schema_to_canonical.sql',
  '20260822140000_restore_canonical_privileges.sql',
  '20260823100000_mr0_commercial_authority.sql',
  '20260823130000_mr3_work_and_external_actions.sql',
  '20260823160000_mr4_recovery_money_truth.sql',
  '20260823190000_mr5_merchant_administration.sql',
  '20260902120000_loss_desk_durable_capabilities.sql',
  '20260906120000_merchant_clarity_p02_financial_scope.sql',
  '20260906170000_merchant_clarity_p05_manual_replacement.sql',
  '20260906173000_merchant_clarity_p05_replacement_corroboration_repair.sql',
  '20260906174000_merchant_clarity_p05_replacement_source_identity_repair.sql',
  '20260906180000_merchant_clarity_p02_close_snapshot_repair.sql',
  '20260906190000_merchant_clarity_p07_claim_pack_zip.sql',
  '20260906200000_merchant_clarity_p08_policy_preview.sql',
  '20260907220000_new_main_free_tier_security.sql',
]);

export const ACTIVE_MIGRATION_VERSIONS = Object.freeze(
  ACTIVE_MIGRATIONS.map((file) => file.slice(0, 14)),
);

// Canonical hash of a clean replay of the active migration set.
export const EXPECTED_SCHEMA_HASH =
  '52d749b3e3aa3c81ca5c4ace345ddf9ae052f8bf17dc505f10030a9691a67952';

export const EXPECTED_CANONICAL_COUNTS = Object.freeze({
  tables: '155',
  views: '2',
  sequences: '2',
  enums: '45',
  columns: '2325',
  not_null_columns: '1315',
  constraints: '916',
  indexes: '585',
  functions: '140',
  triggers: '134',
  policies: '170',
});

export function assertActiveMigrationLayout(actualMigrations) {
  const actual = [...actualMigrations].sort();
  const expected = [...ACTIVE_MIGRATIONS].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Active migration layout mismatch. Expected ${expected.length} reviewed SQL files, received ${actual.length}.`,
    );
  }

  const versions = ACTIVE_MIGRATIONS.map((file) => file.slice(0, 14));
  const duplicateVersions = versions.filter(
    (version, index) => versions.indexOf(version) !== index,
  );
  if (duplicateVersions.length > 0) {
    throw new Error(
      `Active migration manifest contains duplicate timestamps: ${[...new Set(duplicateVersions)].join(', ')}`,
    );
  }
}
