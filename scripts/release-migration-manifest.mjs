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
]);

export const ACTIVE_MIGRATION_VERSIONS = Object.freeze(
  ACTIVE_MIGRATIONS.map((file) => file.slice(0, 14)),
);

// Canonical hash of a clean replay of the active migration set.
export const EXPECTED_SCHEMA_HASH =
  '217dc180c6b1282d7f36e4079b6504fd63cb7fcaa7e33612315ececfa259a27c';

export const EXPECTED_CANONICAL_COUNTS = Object.freeze({
  tables: '143',
  views: '2',
  sequences: '2',
  enums: '45',
  columns: '2090',
  not_null_columns: '1177',
  constraints: '789',
  indexes: '536',
  functions: '90',
  triggers: '102',
  policies: '161',
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
