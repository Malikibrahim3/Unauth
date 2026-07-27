/**
 * Phase 3 — canonical terminology, merchant-facing states, and money copy.
 * Mirrors §6.4 of docs/IMPL_product_polish_and_screenshot_readiness.md.
 */
const EVIDENCE = 'docs/phase-reports/product-polish/evidence';

export default {
  phase: 3,
  report: 'docs/phase-reports/product-polish/phase-03.md',
  ownedIds: Array.from({ length: 17 }, (_, index) => `COPY-${String(index + 1).padStart(2, '0')}`),
  checks: [
    { name: 'TypeScript', command: 'npm', args: ['run', 'typecheck'] },
    { name: 'Lint (zero warnings)', command: 'npm', args: ['run', 'lint', '--', '--max-warnings=0'] },
    { name: 'Merchant copy source scan', command: 'npm', args: ['run', 'verify:merchant-copy'] },
    {
      name: 'Phase 3 focused label and money suite',
      kind: 'jest',
      minTestFiles: 2,
      args: ['tests/unit/uiLabels.test.ts', 'tests/unit/moneyFormatting.test.ts'],
    },
    {
      name: 'Financial truth and export contracts',
      kind: 'jest',
      minTestFiles: 2,
      args: ['tests/unit/intelligenceReporting.test.ts', 'tests/unit/reportingExport.test.ts'],
    },
    {
      name: 'Seeded browser rendered copy pass',
      kind: 'artifact',
      path: `${EVIDENCE}/phase-03-browser-copy.json`,
      mustContain: [
        '"status": "PASS"',
        '"rawUuidCount": 0',
        '"currencyUnitLeakageCount": 0',
        '"prohibitedNounCount": 0',
        '"pluralisation": "3 cases"',
        '"minor": 5500',
      ],
    },
  ],
};
