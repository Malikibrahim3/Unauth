import { formatClaimAge, getClaimSlaState } from '@/lib/claims/sla';

describe('claim SLA helpers', () => {
  const now = new Date('2026-05-27T12:00:00.000Z');

  it('marks open claims older than 72h as overdue', () => {
    expect(getClaimSlaState({ status: 'open', submitted_at: '2026-05-23T11:59:00.000Z' }, now).state).toBe('overdue');
  });

  it('marks 48-72h claims as approaching SLA', () => {
    expect(getClaimSlaState({ status: 'open', submitted_at: '2026-05-25T08:00:00.000Z' }, now).state).toBe('approaching');
  });

  it('marks newer claims as normal', () => {
    expect(getClaimSlaState({ status: 'open', submitted_at: '2026-05-26T12:00:00.000Z' }, now).state).toBe('normal');
  });

  it('does not mark resolved claims as open overdue', () => {
    const claim = { status: 'resolved_refunded', submitted_at: '2026-05-20T12:00:00.000Z' };
    expect(getClaimSlaState(claim, now).state).toBe('resolved');
    expect(formatClaimAge(claim, now)).toContain('Resolved in');
  });
});
