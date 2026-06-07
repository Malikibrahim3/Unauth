export type WidgetReviewLevel =
  | 'established'
  | 'standard'
  | 'review_recommended'
  | 'additional_review';

export type TrustSignalInput = {
  orderCount: number;
  claimCount: number;
  claimRate: number;
  recentClaimCount: number;
  confidenceGrade: string | null;
  networkSignalAvailable: boolean;
  ce3EvidenceAvailable: boolean;
  /** ISO timestamp of the customer's most recent claim at this store. */
  lastClaimAt?: string | null;
};

/** Compute the agent-facing review level from claim signals. Exported for analytics logging. */
export function computeWidgetReviewLevel(input: TrustSignalInput): WidgetReviewLevel {
  if (input.recentClaimCount >= 2) return 'additional_review';
  if (input.claimRate >= 0.5 && input.claimCount >= 2) return 'additional_review';
  if (input.claimCount >= 1) return 'review_recommended';
  if (input.orderCount >= 3 && input.claimCount === 0) return 'established';
  return 'standard';
}

/** Format a relative "X days/months ago" string from an ISO date. Returns null when blank or unparseable. */
function formatDaysAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const days = Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
  if (days < 1) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

export function computeWidgetTrustSummary(input: TrustSignalInput): string {
  const level = computeWidgetReviewLevel(input);
  const orderWord = input.orderCount === 1 ? 'order' : 'orders';
  const claimWord = input.claimCount === 1 ? 'claim' : 'claims';
  const lastSeen = formatDaysAgo(input.lastClaimAt);
  const lastPart = lastSeen ? ` · last ${lastSeen}` : '';
  switch (level) {
    case 'established':
      return `Established customer · ${input.orderCount} ${orderWord}, no prior claims`;
    case 'standard':
      if (input.orderCount > 0) {
        return `Standard handling · ${input.orderCount} ${orderWord} at this store`;
      }
      return 'Standard handling · new to this store';
    case 'review_recommended':
      return `Review recommended · ${input.claimCount} ${claimWord} from ${input.orderCount} ${orderWord}${lastPart}`;
    case 'additional_review':
      if (input.recentClaimCount >= 2) {
        const recentWord = input.recentClaimCount === 1 ? 'claim' : 'claims';
        return `Additional review recommended · ${input.recentClaimCount} ${recentWord} in last 90 days${lastPart}`;
      }
      return `Additional review recommended · ${input.claimCount} ${claimWord}, ${Math.round(input.claimRate * 100)}% claim rate${lastPart}`;
  }
}
