import { shouldAttemptClaimViewed } from '@/components/claims/claimReviewDraft';

describe('claim viewed guard', () => {
  it('allows first attempt for unread claim', () => {
    const attempted = new Set<string>();
    expect(shouldAttemptClaimViewed('c1', null, attempted)).toBe(true);
  });

  it('blocks retries for same claim after first attempt', () => {
    const attempted = new Set<string>(['c1']);
    expect(shouldAttemptClaimViewed('c1', null, attempted)).toBe(false);
  });

  it('blocks when claim is already viewed', () => {
    const attempted = new Set<string>();
    expect(shouldAttemptClaimViewed('c1', new Date().toISOString(), attempted)).toBe(false);
  });
});
