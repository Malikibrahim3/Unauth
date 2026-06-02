import { clearClaimDraft, loadClaimDraft, saveClaimDraft } from '@/components/claims/claimReviewDraft';

describe('claim review draft persistence', () => {
  const storage: Record<string, string> = {};

  beforeEach(() => {
    for (const k of Object.keys(storage)) delete storage[k];
    (global as any).window = {
      localStorage: {
        getItem: (k: string) => (k in storage ? storage[k] : null),
        setItem: (k: string, v: string) => { storage[k] = v; },
        removeItem: (k: string) => { delete storage[k]; },
      },
    };
  });

  afterEach(() => {
    delete (global as any).window;
  });

  it('saves, loads, and clears a draft by profile', () => {
    saveClaimDraft('p1', { selectedOrderId: 'o1', customerReason: 'package not received' });
    expect(loadClaimDraft('p1')).toMatchObject({ selectedOrderId: 'o1', customerReason: 'package not received' });
    clearClaimDraft('p1');
    expect(loadClaimDraft('p1')).toBeNull();
  });
});
