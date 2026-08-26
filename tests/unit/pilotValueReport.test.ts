import { buildPilotValueReport } from '@/lib/reporting/pilotValue';

describe('MR4 pilot value report', () => {
  it('withholds net value when a positive or negative term lacks cited evidence', () => {
    const report = buildPilotValueReport({ currency: 'GBP', preventedMinor: 1000, receivedRecoveryMinor: 500,
      evidence: { prevented: 'canonical prevented ledger', received_recovery: 'matched provider credits' } });
    expect(report.netValueMinor).toBeNull();
    expect(report.complete).toBe(false);
  });

  it('computes the agreed formula only when every term is evidenced', () => {
    const evidence = { prevented: 'ledger', received_recovery: 'credit events', attributable_time_saved: 'time study',
      customer_friction_cost: 'pilot survey', implementation_operating_cost: 'invoice ledger' } as const;
    const report = buildPilotValueReport({ currency: 'GBP', preventedMinor: 1000, receivedRecoveryMinor: 500,
      attributableTimeSavedMinor: 200, customerFrictionCostMinor: 100, implementationOperatingCostMinor: 300, evidence });
    expect(report.netValueMinor).toBe(1300);
    expect(report.complete).toBe(true);
  });
});
