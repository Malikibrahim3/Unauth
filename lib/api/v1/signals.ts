const FLAG_HUMAN_LABELS: Record<string, string> = {
  cross_merchant: 'Refund abuse across multiple merchants',
  crossmerchant: 'Refund abuse across multiple merchants',
  address_clustering: 'Address cluster detected',
  addressclustering: 'Address cluster detected',
  billing_address_clustering: 'Billing address cluster detected',
  inrabuse: 'High INR velocity',
  inr_abuse: 'High INR velocity',
  inrspeed: 'Fast item-not-received claims',
  inr_speed: 'Fast item-not-received claims',
  refund_rate: 'Elevated refund rate',
  refundrate: 'Elevated refund rate',
  refund_pattern: 'Suspicious refund pattern',
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

export function humanizeFraudFlags(flags: string[]): string[] {
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
