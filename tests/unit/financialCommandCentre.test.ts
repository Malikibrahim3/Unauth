import {
  buildReconciliationBacklog,
  buildRecoveryCommandModel,
  financialWeekStart,
  type RecoveryFinancialEntry,
} from '@/lib/financial/commandCentre';
import type { RecoveryCase, RecoveryCaseStatus } from '@/lib/recoveries/types';

function recovery(input: {
  id: string;
  status: RecoveryCaseStatus;
  sought: number;
  approved?: number;
  recovered?: number;
  writtenOff?: number;
  currency?: string;
}): RecoveryCase {
  return {
    id: input.id,
    status: input.status,
    currency: input.currency ?? 'GBP',
    amount_sought_minor: input.sought,
    amount_approved_minor: input.approved ?? 0,
    amount_recovered_minor: input.recovered ?? 0,
    amount_written_off_minor: input.writtenOff ?? 0,
  } as RecoveryCase;
}

describe('financial command centre arithmetic', () => {
  it('keeps eligible, submitted, approved, received and outstanding as independently reconciled stage totals', () => {
    const model = buildRecoveryCommandModel({
      currency: 'GBP',
      recoveries: [
        recovery({ id: 'a', status: 'paid', sought: 10_000, approved: 8_000, recovered: 8_000 }),
        recovery({ id: 'b', status: 'partially_approved', sought: 6_000, approved: 3_000, recovered: 1_000 }),
        recovery({ id: 'c', status: 'evidence_needed', sought: 4_000 }),
        recovery({ id: 'usd', status: 'paid', sought: 99_000, approved: 99_000, recovered: 99_000, currency: 'USD' }),
      ],
      entries: [],
    });

    expect(Object.fromEntries(model.stages.map((stage) => [stage.key, stage.valueMinor]))).toEqual({
      eligible: 20_000,
      submitted: 16_000,
      approved: 11_000,
      recovered: 9_000,
      outstanding: 11_000,
    });
    expect(model.conversionRate).toBe(0.45);
  });

  it('builds interval additions, cash receipts and closing outstanding from append-only entries', () => {
    const entries: RecoveryFinancialEntry[] = [
      { recovery_case_id: 'a', state: 'recoverable', amount_minor: 10_000, currency: 'GBP', effective_at: '2026-07-06T10:00:00.000Z' },
      { recovery_case_id: 'a', state: 'recovered', amount_minor: 2_000, currency: 'GBP', effective_at: '2026-07-13T10:00:00.000Z' },
      { recovery_case_id: 'b', state: 'recoverable', amount_minor: 5_000, currency: 'GBP', effective_at: '2026-07-20T10:00:00.000Z' },
      { recovery_case_id: 'b', state: 'written_off', amount_minor: 1_000, currency: 'GBP', effective_at: '2026-07-20T12:00:00.000Z' },
    ];
    const model = buildRecoveryCommandModel({ currency: 'GBP', recoveries: [], entries });

    expect(model.intervals.map((point) => ({
      new: point.newRecoverableMinor,
      received: point.receivedMinor,
      outstanding: point.outstandingMinor,
    }))).toEqual([
      { new: 10_000, received: 0, outstanding: 10_000 },
      { new: 0, received: 2_000, outstanding: 8_000 },
      { new: 5_000, received: 0, outstanding: 12_000 },
    ]);
  });

  it('does not manufacture a conversion percentage for a verified zero eligible denominator', () => {
    const model = buildRecoveryCommandModel({ currency: 'GBP', recoveries: [], entries: [] });
    expect(model.eligibleMinor).toBe(0);
    expect(model.conversionRate).toBeNull();
  });

  it('reconstructs reconciliation backlog from opened and settled lifecycle dates', () => {
    const points = buildReconciliationBacklog([
      { created_at: '2026-07-06T09:00:00.000Z', resolved_at: null, status: 'open' },
      { created_at: '2026-07-07T09:00:00.000Z', resolved_at: '2026-07-14T09:00:00.000Z', status: 'resolved' },
      { created_at: '2026-07-20T09:00:00.000Z', resolved_at: '2026-07-21T09:00:00.000Z', status: 'dismissed' },
    ]);

    expect(points.map((point) => ({ opened: point.opened, settled: point.settled, backlog: point.backlog }))).toEqual([
      { opened: 2, settled: 0, backlog: 2 },
      { opened: 0, settled: 1, backlog: 1 },
      { opened: 1, settled: 1, backlog: 1 },
    ]);
  });

  it('uses Monday-start weekly buckets even for short financial date ranges', () => {
    expect(financialWeekStart('2026-08-07T12:00:00.000Z')).toBe('2026-08-03');
    expect(financialWeekStart('2026-08-09T23:59:59.000Z')).toBe('2026-08-03');
    expect(financialWeekStart('2026-08-10T00:00:00.000Z')).toBe('2026-08-10');
  });
});
