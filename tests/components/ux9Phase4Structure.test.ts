import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

function expectInOrder(source: string, markers: string[]) {
  let cursor = -1;
  for (const marker of markers) {
    const next = source.indexOf(marker, cursor + 1);
    expect(next).toBeGreaterThan(cursor);
    cursor = next;
  }
}

describe('UX9-4 task-first composition', () => {
  it('puts Overview attention work before financial analytics and diagnostics', () => {
    const source = read('components/dashboard/DashboardOverview.tsx');
    expectInOrder(source, [
      'Needs attention now',
      'Payout position',
      'Realised loss by cause',
      'Data trust',
    ]);
    expect(source).toContain('confirmed zero for the current scope, not missing data');
  });

  it('groups the seven Work system views and progressively discloses advanced filters', () => {
    const source = read('components/work/WorkQueueOperations.tsx');
    expect(source).toContain("new Set<WorkView>(['mine', 'open', 'overdue', 'integration-exceptions'])");
    expect(source).toContain('SECONDARY_VIEW_TABS');
    expect(source).toContain('More system views');
    expect(source).toContain('className={styles.advancedFilters}');
    expect(source).toContain('Clear filters');
  });

  it('keeps financial work ahead of secondary analysis', () => {
    const losses = read('components/losses/LossLedgerOperations.tsx');
    expectInOrder(losses, ['Loss entries requiring financial review', 'Analyse realised loss by cause']);

    const reconciliation = read('components/reconciliation/ReconciliationOperations.tsx');
    expectInOrder(reconciliation, ['Exceptions requiring review', 'Current reconciliation outcomes', 'Analyse match quality and source variance']);

    const recovery = read('components/recoveries/RecoveryBoardOperations.tsx');
    expectInOrder(recovery, ['Next recovery work', 'Review 30-day recovery outcomes']);
  });

  it('keeps provider position, received credit, matched credit and reconciliation separate', () => {
    const detail = read('components/recoveries/RecoveryDetailOperations.tsx');
    expectInOrder(detail, ['Provider position', 'Received credit', 'Matched credit', 'Reconciled money']);
    expect(detail).toContain('Later stages are never inferred from partner approval');
  });

  it('opens Reports with merchant questions before analytical stages and source diagnostics', () => {
    const source = read('components/reporting/IntelligenceReportView.tsx');
    expectInOrder(source, ['<ReportCommandIndex', '<FinancialStageLadder', '<ReportSourceCoverage']);
  });
});
