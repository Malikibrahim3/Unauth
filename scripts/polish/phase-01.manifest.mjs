/**
 * Phase 1 — the seven active schema/API/read-path requirements in §4 of
 * docs/IMPL_product_polish_and_screenshot_readiness.md.
 *
 * Former RUN-07 and RUN-09–RUN-21 work is owned by later phases. Keeping this
 * manifest narrow prevents the retired fixture, artifact, and duplicate
 * runtime machinery from becoming a second completion contract.
 */
export default {
  phase: 1,
  report: 'docs/phase-reports/product-polish/phase-01.md',
  ownedIds: ['RUN-01', 'RUN-02', 'RUN-03', 'RUN-04', 'RUN-05', 'RUN-06', 'RUN-08'],
  checks: [
    { name: 'TypeScript', command: 'npm', args: ['run', 'typecheck'] },
    { name: 'Lint (zero warnings)', command: 'npm', args: ['run', 'lint', '--', '--max-warnings=0'] },
    { name: 'Canonical database fresh replay', command: 'npm', args: ['run', 'verify:canonical-db'] },
    {
      name: 'Phase 1 focused suite',
      kind: 'jest',
      minTestFiles: 6,
      args: [
        'tests/security/evidenceReconciliationMigration.test.ts',
        'tests/security/release1InvestigationMigration.test.ts',
        'tests/api/claimsRoutes.test.ts',
        'tests/lib/caseReadModel.test.ts',
        'tests/unit/reconciliation/caseStore.test.ts',
        'tests/components/workQueueResultModel.test.tsx',
      ],
    },
  ],
};
