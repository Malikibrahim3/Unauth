export const ORDER_VOLUME_OPTIONS = [
  { value: 'under_10k', label: 'Under 10,000 / yr' },
  { value: '10k_50k', label: '10,000–50,000 / yr' },
  { value: '50k_250k', label: '50,000–250,000 / yr' },
  { value: 'over_250k', label: 'Over 250,000 / yr' },
] as const;

export type OrderVolumeValue = (typeof ORDER_VOLUME_OPTIONS)[number]['value'];

export const FRAUD_CONCERN_OPTIONS = [
  { value: 'refund_abuse', label: 'Refund abuse / INR claims' },
  { value: 'chargebacks', label: 'Chargebacks' },
  { value: 'account_takeover', label: 'Account takeover' },
  { value: 'multi_accounting', label: 'Multi-accounting' },
  { value: 'promo_abuse', label: 'Promo / voucher abuse' },
  { value: 'all', label: 'All of the above' },
] as const;

export type FraudConcernValue = (typeof FRAUD_CONCERN_OPTIONS)[number]['value'];
