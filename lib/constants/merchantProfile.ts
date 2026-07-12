export const ORDER_VOLUME_OPTIONS = [
  { value: 'under_10k', label: 'Under 10,000 / yr' },
  { value: '10k_50k', label: '10,000–50,000 / yr' },
  { value: '50k_250k', label: '50,000–250,000 / yr' },
  { value: 'over_250k', label: 'Over 250,000 / yr' },
] as const;

export type OrderVolumeValue = (typeof ORDER_VOLUME_OPTIONS)[number]['value'];

export const LOSS_CONCERN_OPTIONS = [
  { value: 'refund_abuse', label: 'Refund and reship leakage' },
  { value: 'chargebacks', label: 'Chargeback losses' },
  { value: 'account_takeover', label: 'Account takeover payouts' },
  { value: 'multi_accounting', label: 'Repeat claim patterns' },
  { value: 'promo_abuse', label: 'Promo and voucher leakage' },
  { value: 'all', label: 'All post-purchase loss types' },
] as const;

export type LossConcernValue = (typeof LOSS_CONCERN_OPTIONS)[number]['value'];

// Back-compat only: the database/user metadata column is still
// primary_fraud_concern until the approved schema reconciliation lands.
export const FRAUD_CONCERN_OPTIONS = LOSS_CONCERN_OPTIONS;
export type FraudConcernValue = LossConcernValue;
