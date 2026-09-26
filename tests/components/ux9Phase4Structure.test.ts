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

describe('full-app visual authority composition', () => {
  it('keeps the supplied Overview hierarchy without the retired task-first composition', () => {
    const source = read('components/visual-authority/generated/Overview-Clean.tsx');
    expectInOrder(source, [
      'FINANCIAL POSITION',
      'RECOVERY STAGES',
      'WHAT NEEDS ATTENTION',
      'EVIDENCE COVERAGE',
    ]);
    const runtime = read('components/dashboard/ExactDashboardOverview.tsx');
    expect(runtime).toContain('No verified financial position for this range');
    expect(read('app/(app)/overview/page.tsx')).not.toContain("from '@/components/dashboard/DashboardOverview'");
  });

  it('uses the supplied direct Work queue without the retired system-view strip', () => {
    const source = read('components/work/WorkQueueOperations.tsx');
    expect(source).toContain('data-visual-world="supplied-package"');
    expect(source).toContain('Decide today');
    expect(source).toContain('Waiting on someone else');
    expect(source).not.toContain('SYSTEM VIEWS');
    expect(source).not.toContain('styles.');
  });

  it('keeps canonical financial operations connected without requiring retired outer layout wrappers', () => {
    const losses = read('app/(app)/financials/losses/LossesPage.tsx');
    expect(losses).toContain('<LossLedgerOperations');
    expect(read('components/losses/LossLedgerOperations.tsx')).toContain('data-screen-label="Loss ledger"');

    const reconciliation = read('app/(app)/financials/reconciliation/page.tsx');
    expect(reconciliation).toContain('<ReconciliationOperations');

    const recovery = read('app/(app)/financials/recovery/RecoveryPage.tsx');
    expect(recovery).toContain('<RecoveryBoardOperations');
  });

  it('keeps provider position, received credit, matched credit and reconciliation separate', () => {
    const detail = read('components/recoveries/RecoveryDetailOperations.tsx');
    expectInOrder(detail, ['MONEY STAGES', 'approval is not receipt · receipt is not reconciled']);
    for (const stage of ['Sought', 'Approved', 'Received', 'Matched', 'Reconciled']) expect(detail).toContain(`label: '${stage}'`);
    expect(detail).toContain('Nothing is counted as recovered until a source credit is observed');
    expect(detail).toContain('matching and reconciliation are recorded separately');
  });

  it('opens Reports with merchant questions before analytical stages and source diagnostics', () => {
    const source = read('components/reporting/IntelligenceReportView.tsx');
    expectInOrder(source, ['<ReportCommandIndex', '<FinancialStageLadder', '<ReportSourceCoverage']);
  });
});
