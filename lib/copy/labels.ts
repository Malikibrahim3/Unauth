function humanizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export const LABELS = {
  disputeHistory: 'Claim history',
  cluster_id: 'Linked profile ID',
  signals_matched: 'Review reasons',
  elevated_refund_rate: 'Refund rate elevated',
  value_escalation: 'Unusually high order value',
  crossMerchantSignal: 'Matches across merchants',
  networkDeviceLink: 'Shared device',
  ipCluster: 'Shared IP address',

  email: 'Email',
  emails: 'Emails',
  name: 'Name',
  names: 'Names',
  address: 'Address',
  addresses: 'Addresses',
  phone: 'Phone number',
  phones: 'Phone numbers',
  ip: 'IP address',
  ips: 'IP addresses',
  device_ip: 'IP address',
  card: 'Payment card',
  cards: 'Payment cards',
  card_last4: 'Card ending',
  payment: 'Payment method',

  shared_email: 'Shared email address',
  shared_phone: 'Shared phone number',
  shared_address: 'Shared delivery address',
  shared_card: 'Shared payment card',
  shared_account_id: 'Shared account',
  shared_ip: 'Shared IP address',
  shared_device: 'Shared device',
  refund_velocity: 'Fast repeat claims',
  chargeback_after_delivery: 'Chargeback after delivery',
  item_not_received_repeat: "Repeated 'item not received' claims",
  address_mismatch: 'Address mismatch',
  name_variant: 'Name variation',
  behavioral_anomaly: 'Unusual order behaviour',

  crossmerchant: 'Matches across merchants',
  crossmerchant_identity_match: 'Matches across merchants',
  refund_rate: 'Refund rate elevated',
  refund_rate_over_60pct: 'Refund rate 60%',
  payment_fingerprint_match: 'Shared payment card',
  address_normalization_match: 'Shared address',
  address_clustering: 'Shared address',
  card_reuse_observed: 'Shared payment card',
  refund_velocity_14d: 'Fast repeat claims',
  network_device_link: 'Shared device',
  ip_cluster: 'Shared IP address',
} as const;

export function labelFor(key: string): string {
  return LABELS[key as keyof typeof LABELS] ?? humanizeKey(key);
}
