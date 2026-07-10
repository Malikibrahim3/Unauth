// Human-readable evidence/attribution labels for internal claim-history flag
// codes. Wording follows docs/product/TERMINOLOGY.md: describe the observed
// pattern for merchant review, never accuse ("fraud", "abuse", "ring", etc.).
const FLAG_HUMAN_LABELS: Record<string, string> = {
  cross_merchant: 'Repeat claim pattern across multiple merchants',
  crossmerchant: 'Repeat claim pattern across multiple merchants',
  address_clustering: 'Address cluster identified',
  addressclustering: 'Address cluster identified',
  billing_address_clustering: 'Billing address cluster identified',
  inrabuse: 'High item-not-received claim velocity',
  inr_abuse: 'High item-not-received claim velocity',
  inrspeed: 'Fast item-not-received claims',
  inr_speed: 'Fast item-not-received claims',
  refund_rate: 'Elevated refund rate',
  refundrate: 'Elevated refund rate',
  refund_pattern: 'Claim pattern requires review under merchant policy',
  velocity: 'Unusual order velocity',
  payment_churn: 'Payment method churn',
  dispute_history: 'Prior dispute history',
  network_device_link: 'Shared device across identities',
  item_not_received_repeat: 'Repeat item-not-received claims',
  chargeback_after_delivery: 'Chargeback after delivery',
  shared_email: 'Shared email across accounts',
  shared_address: 'Shared shipping address',
  shared_card: 'Shared payment card',
  shared_device: 'Shared device fingerprint',
};

function normalizeFlagKey(flag: string): string {
  return flag.trim().toLowerCase().replace(/\s+/g, '_');
}

/**
 * Converts internal claim-history signal codes into merchant-facing evidence
 * labels. Does not alter which flags exist or how they are computed upstream
 * — this only maps a code to approved-vocabulary text (see
 * docs/product/TERMINOLOGY.md).
 */
export function humanizeClaimHistorySignals(flags: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of flags) {
    const key = normalizeFlagKey(raw);
    const label =
      FLAG_HUMAN_LABELS[key] ??
      FLAG_HUMAN_LABELS[key.replace(/_/g, '')] ??
      raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (!seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

/** @deprecated Use `humanizeClaimHistorySignals`. Kept as an alias for callers not yet migrated. */
export const humanizeFraudFlags = humanizeClaimHistorySignals;

export function crossMerchantSummary(
  merchantCount: number,
  claimCount: number,
  flagged?: boolean
): { merchant_count: number; claim_count: number; flagged?: boolean } | null {
  if (merchantCount < 3) return null;
  const base = {
    merchant_count: merchantCount,
    claim_count: claimCount,
  };
  if (flagged === undefined) return base;
  return { ...base, flagged };
}
