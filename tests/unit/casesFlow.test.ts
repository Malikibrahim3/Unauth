import { buildCasesFlowSnapshot } from '@/app/(app)/cases/casesFlow';

describe('buildCasesFlowSnapshot', () => {
  it('derives thirty-day movement, backlog, age, and verified close intervals', () => {
    const snapshot = buildCasesFlowSnapshot([
      { id: 'active', status: 'open', submitted_at: '2026-08-12T09:00:00Z', created_at: '2026-08-12T09:00:00Z' },
      { id: 'fast', status: 'resolved_refunded', submitted_at: '2026-08-10T09:00:00Z', created_at: '2026-08-10T09:00:00Z' },
      { id: 'slow', status: 'resolved_denied', submitted_at: '2026-07-20T09:00:00Z', created_at: '2026-07-20T09:00:00Z' },
    ], [
      { claim_id: 'fast', updated_at: '2026-08-12T09:00:00Z' },
      { claim_id: 'slow', updated_at: '2026-08-15T09:00:00Z' },
    ], new Date('2026-08-22T12:00:00Z'));

    expect(snapshot.opened30d).toBe(2);
    expect(snapshot.closed30d).toBe(2);
    expect(snapshot.netChange).toBe(0);
    expect(snapshot.medianOpenAgeDays).toBeCloseTo(10.125);
    expect(snapshot.medianTimeToCloseDays).toBeCloseTo(14);
    expect(snapshot.closedWithinSlaPercent).toBe(50);
    expect(snapshot.daily.at(-1)?.backlog).toBe(1);
  });

  it('does not invent closure metrics without a canonical outcome time', () => {
    const snapshot = buildCasesFlowSnapshot([
      { id: 'active', status: 'open', submitted_at: '2026-08-20T09:00:00Z', created_at: null },
    ], [], new Date('2026-08-22T12:00:00Z'));

    expect(snapshot.closed30d).toBe(0);
    expect(snapshot.medianTimeToCloseDays).toBeNull();
    expect(snapshot.closedWithinSlaPercent).toBeNull();
  });
});
