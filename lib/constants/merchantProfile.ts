export const ORDER_VOLUME_OPTIONS = [
  { value: 'under_1000', label: 'Under 1,000 per month' },
  { value: '1000_8000', label: '1,000 – 8,000 per month' },
  { value: '8000_15000', label: '8,000 – 15,000 per month' },
  { value: 'over_15000', label: 'Over 15,000 per month' },
] as const;

// Retain the actual meaning of previously saved annual bands; never silently
// reinterpret them as the supplied monthly choices.
export const LEGACY_ORDER_VOLUME_OPTIONS = [
  { value: 'under_10k', label: 'Under 10,000 / yr' },
  { value: '10k_50k', label: '10,000–50,000 / yr' },
  { value: '50k_250k', label: '50,000–250,000 / yr' },
  { value: 'over_250k', label: 'Over 250,000 / yr' },
] as const;

export type OrderVolumeValue = (typeof ORDER_VOLUME_OPTIONS)[number]['value'];

export const LOSS_CONCERN_OPTIONS = [
  { value: 'delivery_disputes', label: 'Delivery disputes' },
  { value: 'returns', label: 'Returns' },
  { value: 'damage', label: 'Damage' },
  { value: 'chargebacks', label: 'Chargebacks' },
  { value: 'all', label: 'Not sure yet' },
] as const;

export const LEGACY_LOSS_CONCERN_OPTIONS = [
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

/** Annual bands cannot establish a monthly band: seasonal distribution is unknown. */
export function isMonthlyOrderVolume(value: unknown): value is OrderVolumeValue {
  return typeof value === 'string' && ORDER_VOLUME_OPTIONS.some(option => option.value === value);
}

export function orderVolumeCorrection(value: unknown): string | null {
  if (value == null || value === '' || isMonthlyOrderVolume(value)) return null;
  const annual = LEGACY_ORDER_VOLUME_OPTIONS.find(option => option.value === value);
  return annual
    ? `Previously saved: ${annual.label}. Select a monthly range or clear this value; an annual band cannot establish your monthly volume.`
    : 'The saved order-volume unit is unknown. Select a monthly range or clear this value before saving.';
}
