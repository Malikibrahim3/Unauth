/**
 * Phase 1 — Schema, API, read-model, and runtime integrity.
 *
 * Mirrors §4.2 of docs/IMPL_product_polish_and_screenshot_readiness.md: every
 * listed command plus an artifact gate for each non-command proof, so the
 * runner fails closed when an evidence file is absent, empty or stale.
 */
const EVIDENCE = 'docs/phase-reports/product-polish/evidence';

export default {
  phase: 1,
  report: 'docs/phase-reports/product-polish/phase-01.md',
  ownedIds: Array.from({ length: 21 }, (_, index) => `RUN-${String(index + 1).padStart(2, '0')}`),
  checks: [
    { name: 'TypeScript', command: 'npm', args: ['run', 'typecheck'] },
    { name: 'Lint (zero warnings)', command: 'npm', args: ['run', 'lint', '--', '--max-warnings=0'] },
    { name: 'Supabase contract audit', command: 'npm', args: ['run', 'audit:supabase-contract'] },
    { name: 'Canonical database fresh replay A', command: 'npm', args: ['run', 'verify:canonical-db'] },
    { name: 'Canonical database fresh replay B', command: 'npm', args: ['run', 'verify:canonical-db'] },
    { name: 'Schema preflight', command: 'npm', args: ['run', 'verify:schema-preflight'] },
    { name: 'Durable audit runtime', command: 'npm', args: ['run', 'verify:durable-audit-runtime'] },
    { name: 'Tenant boundaries', command: 'npm', args: ['run', 'verify:tenant-boundaries'] },
    { name: 'Investigations runtime', command: 'npm', args: ['run', 'verify:investigations-runtime'] },
    { name: 'Source-to-recovery runtime', command: 'npm', args: ['run', 'verify:source-to-recovery'] },
    { name: 'Atomic P0 evidence ledger', command: 'npm', args: ['run', 'verify:p0-ledger'] },
    { name: 'Rollout rehearsal', command: 'npm', args: ['run', 'verify:rollout-rehearsal'] },
    {
      name: 'Phase 1 focused suite',
      kind: 'jest',
      minTestFiles: 10,
      args: [
        'tests/security/evidenceReconciliationMigration.test.ts',
        'tests/security/release1InvestigationMigration.test.ts',
        'tests/api/claimsRoutes.test.ts',
        'tests/lib/caseReadModel.test.ts',
        'tests/unit/reconciliation/caseStore.test.ts',
        'tests/unit/reconciliation/recommendations.test.ts',
        'tests/lib/crossModuleFinancialIntegrity.test.ts',
        'tests/unit/connectionReadModel.test.ts',
        'tests/lib/claimsSla.test.ts',
        'tests/customers/orderSearch.test.ts',
      ],
    },
    {
      name: 'Phase 1 owned-requirement regressions',
      kind: 'jest',
      minTestFiles: 1,
      args: ['tests/polish/phase01'],
    },
    { name: 'Phase 1 QA fixture seed', command: 'npm', args: ['run', 'seed:phase1-qa', '--', '--reset'] },
    { name: 'Phase 1 QA fixture seed (idempotence)', command: 'npm', args: ['run', 'seed:phase1-qa'] },
    { name: 'Phase 1 QA fixture validation', command: 'npm', args: ['run', 'validate:phase1-qa'] },
    { name: 'Reconciliation route smoke', command: 'npm', args: ['run', 'smoke:reconciliation'] },
    {
      name: 'RUN-04 read-purity row counts',
      kind: 'artifact',
      path: `${EVIDENCE}/phase-01-read-purity.json`,
      mustContain: ['"reloads": 5', '"mutated": false'],
    },
    {
      name: 'RUN-13 production route performance',
      kind: 'artifact',
      path: `${EVIDENCE}/phase-01-route-performance.json`,
      mustContain: ['"navigations": 20', '"p75"', '"p95"', '"readySignal"'],
    },
    {
      name: 'RUN-14 required/optional failure injection',
      kind: 'artifact',
      path: `${EVIDENCE}/phase-01-completeness-injection.json`,
      mustContain: ['"requiredFailureBlocks": true', '"optionalFailureIsLocal": true'],
    },
    {
      name: 'Browser runtime sweep',
      kind: 'artifact',
      path: `${EVIDENCE}/phase-01-browser-runtime.json`,
      mustContain: [
        '"consoleErrors": 0',
        '"hydrationWarnings": 0',
        '"requiredRequestFailures": 0',
        '"unexpectedWrites": 0',
        'money.currency_missing',
      ],
    },
    {
      name: 'RUN-03 claimed item and source line render',
      kind: 'artifact',
      path: `${EVIDENCE}/phase-01-claimed-item-render.json`,
      mustContain: ['"claimedItemVisible": true', '"sourceLineVisible": true', '"errorPlaceholderPresent": false'],
    },
    {
      name: 'Phase 1 QA fixture matrix',
      kind: 'artifact',
      path: `${EVIDENCE}/phase-01-fixture-matrix.json`,
      mustContain: ['knownZero', 'missingCurrency', 'mixedCurrency', 'missingSource', 'timezoneBoundary', 'dueToday', 'overdue'],
    },
  ],
};
