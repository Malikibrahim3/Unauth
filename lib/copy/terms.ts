/**
 * lib/copy/terms.ts
 *
 * Canonical user-facing copy constants for ParcelClaim.
 *
 * PRODUCT DIRECTION: This app is an identity intelligence and evidence review
 * tool. It identifies order/identity matches and presents evidence for merchant
 * review. It does NOT accuse customers of fraud or imply guilt.
 *
 * Use these constants throughout the UI to keep language consistent and neutral.
 */

// ---------------------------------------------------------------------------
// Disclaimer — shown at key decision points
// ---------------------------------------------------------------------------

export const DISCLAIMER =
  'ParcelClaim identifies identity and order-pattern matches. Final decisions should be made by the merchant using the underlying evidence.';

export const DISCLAIMER_SHORT =
  'Matches are indicative only. Merchant review required before action.';

// ---------------------------------------------------------------------------
// Section / card titles
// ---------------------------------------------------------------------------

export const COPY = {
  // Profile summary
  whyMatched: 'Why this profile was matched',
  evidenceSignals: 'Evidence signals',
  linkedOrders: 'Linked orders',
  confidenceLevel: 'Confidence level',
  recommendedAction: 'Recommended review action',
  matchSummary: 'Identity match summary',

  // Status labels
  profilesForReview: 'Profiles for review',
  matchedProfiles: 'Matched profiles',
  strongEvidenceSignals: 'Strong evidence signals',
  identityMatchConfidence: 'Identity match confidence',
  orderValueUnderReview: 'Order value under review',
  reviewList: 'Review list',

  // Confidence grades (identity match, not guilt)
  gradeA: 'Grade A — definite identity match',
  gradeB: 'Grade B — probable identity match',
  gradeC: 'Grade C — possible identity match',
  gradeD: 'Grade D — weak match signals',
  gradeF: 'Grade F — insufficient signals',

  // Match confidence levels (replaces "fraud" tiers)
  definiteMatch: 'Definite match',
  probableMatch: 'Probable match',
  possibleMatch: 'Possible match',
  weakSignals: 'Weak signals',

  // Chart / stat labels
  matchedTransactions: 'Matched transactions',
  matchRate: 'Match rate',
  reviewWorthy: 'For review',
  cleanOrders: 'No signals',

  // Action labels (review-based, not accusatory)
  reviewBeforeRefund: 'Review before refund',
  requestVerification: 'Request additional verification',
  compareDeliveryEvidence: 'Compare delivery evidence',
  escalateForManualReview: 'Escalate for manual review',
  markAsReviewed: 'Mark as reviewed',
  markAsNotAMatch: 'Mark as not a match',
  addToReviewList: 'Add to review list',
  markAsCleared: 'Mark as cleared',

  // Filter labels
  allCustomers: 'All customers',
  flaggedForReview: 'Flagged for review',
  linkedAccounts: 'Linked accounts',
  highRefundRate: 'High refund rate',
  withMatchSignals: 'With match signals',

  // Page subtitles
  dashboardSubtitle: 'Monitor identity match signals and review evidence across all your uploads.',
  uploadSubtitle: 'Upload a CSV export of your orders to detect identity matches and repeated claim patterns.',
  historyDescription: 'Upload your first CSV to start reviewing identity match patterns.',
  watchlistDescription: "Profiles you're monitoring will appear here with their latest match confidence every time you upload new orders.",

  // App metadata
  appTitle: 'Unauth — Order Identity Review',
  appDescription: 'CSV-based identity match and evidence review tool for ecommerce merchants.',
  loginSubtitle: 'Identity match review for ecommerce merchants',

  // Insight copy
  matchRateIncreased: (from: string, to: string) =>
    `Match rate increased from ${from}% to ${to}% in the latest upload.`,
  matchRateDecreased: (from: string, to: string) =>
    `Match rate decreased from ${from}% to ${to}% in the latest upload.`,
} as const;

// ---------------------------------------------------------------------------
// Banned user-facing terms (for test enforcement)
// ---------------------------------------------------------------------------

export const BANNED_UI_TERMS = [
  'fraudster',
  'scammer',
  'bad actor',
  'confirmed fraud',
  'fraud confirmed',
  'abuse confirmed',
  'definite fraud',
  'probable fraud',
  'possible fraud',
  'block customer',
  'deny claim',
  'guilty',
  'not a fraudster',
] as const;
