import { claimHasEvidence } from '@/lib/claims/events';

describe('claim lifecycle evidence state', () => {
  it('counts evidence item without event', () => {
    expect(claimHasEvidence({ evidence_count: 1, events: [] })).toBe(true);
  });

  it('counts evidence event without item', () => {
    expect(claimHasEvidence({ evidence_count: 0, events: [{ event_type: 'evidence_added' }] })).toBe(true);
  });

  it('shows pending when no evidence exists', () => {
    expect(claimHasEvidence({ evidence_count: 0, events: [{ event_type: 'claim_created' }] })).toBe(false);
  });

  it('updates after adding evidence event', () => {
    const events = [{ event_type: 'claim_created' }];
    expect(claimHasEvidence({ evidence_count: 0, events })).toBe(false);
    expect(claimHasEvidence({ evidence_count: 0, events: [...events, { event_type: 'evidence_added' }] })).toBe(true);
  });
});
