import type { ClaimReviewState } from '@/components/claims/claimReviewReducer';

/** Fields persisted to localStorage for the claim review workbench. */
export type ClaimReviewDraft = Pick<
  ClaimReviewState,
  | 'selectedOrderId'
  | 'claimType'
  | 'customerReason'
  | 'notes'
  | 'claimId'
  | 'decision'
  | 'outcome'
  | 'evidenceType'
  | 'source'
  | 'evidenceUrl'
  | 'evidenceHash'
  | 'metaRows'
  | 'manualOrderRef'
  | 'manualOrderSource'
  | 'manualModeExplicit'
  | 'orderValue'
  | 'statusToSet'
>;

function storageKey(profileId: string) {
  return `claims.review.draft.${profileId}`;
}

export function loadClaimDraft(profileId: string): Partial<ClaimReviewDraft> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(profileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ClaimReviewDraft>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function saveClaimDraft(profileId: string, draft: Partial<ClaimReviewDraft>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(profileId), JSON.stringify(draft));
  } catch {
    /* Ignore storage failures */
  }
}

export function clearClaimDraft(profileId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(profileId));
  } catch {
    /* noop */
  }
}

export function shouldAttemptClaimViewed(
  claimId: string | null | undefined,
  firstViewedAt: string | null | undefined,
  attemptedIds: Set<string>,
) {
  if (!claimId) return false;
  if (firstViewedAt) return false;
  if (attemptedIds.has(claimId)) return false;
  return true;
}
