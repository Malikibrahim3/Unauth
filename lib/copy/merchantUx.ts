/** Merchant-facing labels — plain language, no fraud-ops jargon. */

export const EVIDENCE_PACKAGE_ACTION = 'Build evidence package';

export const CONFIDENCE_TIER_LABELS: Record<string, string> = {
  definite: 'Strong match — very likely the same shopper',
  probable: 'Likely match — same shopper is probable',
  possible: 'Possible match — review before acting',
  weak: 'Weak signals — limited evidence',
};

export const PRIVACY_BADGE_LABEL = 'Privacy-safe';

export const PRIVACY_BADGE_TOOLTIP =
  'Cross-store comparisons use hashed identifiers only. No other merchant can see your customer list.';
