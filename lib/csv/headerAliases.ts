export type RequiredField =
  | 'order_id'
  | 'order_date'
  | 'customer_email'
  | 'customer_name'
  | 'shipping_address'
  | 'order_total'
  | 'currency'
  | 'order_status'
  | 'customer_phone'
  | 'billing_address'
  | 'refund_status'
  | 'refund_reason'
  | 'refund_date'
  | 'refund_amount'
  | 'payment_method'
  | 'ip_address'
  | 'device_id'
  | 'card_last4'
  | 'card_bin'
  | 'card_fingerprint'
  | 'browser_fingerprint'
  | 'cookie_id'
  | 'user_agent'
  | 'asn'
  | 'account_id'
  | 'ground_truth_label';

export const REQUIRED_FIELDS: RequiredField[] = [
  'order_id',
  'order_date',
  'customer_email',
  'customer_name',
  'shipping_address',
  'order_total',
  'order_status',
];

export const OPTIONAL_FIELDS: RequiredField[] = [
  'currency',
  'customer_phone',
  'billing_address',
  'refund_status',
  'refund_reason',
  'refund_date',
  'refund_amount',
  'payment_method',
  'ip_address',
  'device_id',
  'card_last4',
  'card_bin',
  'card_fingerprint',
  'browser_fingerprint',
  'cookie_id',
  'user_agent',
  'asn',
  'account_id',
  'ground_truth_label',
];

/** Logical grouping of optional fields for the mapping UI */
export const OPTIONAL_FIELD_GROUPS: { label: string; fields: RequiredField[] }[] = [
  {
    label: 'Order details',
    fields: ['currency', 'customer_phone', 'billing_address'],
  },
  {
    label: 'Refund information',
    fields: ['refund_status', 'refund_reason', 'refund_date', 'refund_amount'],
  },
  {
    label: 'Payment & card signals',
    fields: ['payment_method', 'card_last4', 'card_bin', 'card_fingerprint'],
  },
  {
    label: 'Device & network signals',
    fields: ['ip_address', 'device_id', 'browser_fingerprint', 'cookie_id', 'user_agent', 'asn'],
  },
  {
    label: 'Account & eval',
    fields: ['account_id', 'ground_truth_label'],
  },
];

export const HEADER_ALIASES: Record<RequiredField, string[]> = {
  order_id:            ['order_id', 'order id', 'name', 'order number', 'order_name', 'id'],
  order_date:          ['order_date', 'order date', 'paid at', 'created at', 'processed at', 'date'],
  customer_email:      ['customer_email', 'email', 'customer email', 'buyer email', 'email address'],
  customer_name:       ['customer_name', 'billing name', 'customer name', 'shipping name', 'full name', 'name'],
  shipping_address:    ['shipping_address', 'shipping address', 'shipping address1', 'shipping street', 'delivery address'],
  order_total:         ['order_total', 'total', 'subtotal', 'lineitem price', 'amount', 'order amount'],
  currency:            ['currency', 'currency code'],
  order_status:        ['order_status', 'financial status', 'status', 'fulfillment status', 'order status'],
  customer_phone:      ['customer_phone', 'phone', 'billing phone', 'shipping phone', 'telephone', 'mobile'],
  billing_address:     ['billing_address', 'billing address', 'billing address1', 'billing street'],
  refund_status:       ['refund_status', 'refund status', 'refunded amount', 'is refunded'],
  refund_reason:       ['refund_reason', 'refund notes', 'refund reason', 'return reason'],
  refund_date:         ['refund_date', 'refunded at', 'refund date', 'return date'],
  refund_amount:       ['refund_amount', 'refunded amount', 'refund amount', 'amount refunded'],
  payment_method:      ['payment_method', 'payment method', 'payment gateway', 'payment type'],
  ip_address:          ['ip_address', 'ip address', 'buyer ip', 'browser ip', 'customer ip', 'ip'],
  device_id:           ['device_id', 'device id', 'device fingerprint', 'device_fingerprint'],
  card_last4:          ['card_last4', 'card last 4', 'last 4', 'last four', 'last4', 'card number last 4'],
  card_bin:            ['card_bin', 'card bin', 'bin', 'iin', 'card iin', 'bank identification number'],
  card_fingerprint:    ['card_fingerprint', 'card fingerprint', 'payment fingerprint', 'stripe card fingerprint', 'psp fingerprint'],
  browser_fingerprint: ['browser_fingerprint', 'browser fingerprint', 'fp', 'fingerprint', 'canvas fingerprint'],
  cookie_id:           ['cookie_id', 'cookie id', 'session id', 'session_id', 'visitor id', 'visitor_id'],
  user_agent:          ['user_agent', 'user agent', 'useragent', 'browser', 'ua'],
  asn:                 ['asn', 'autonomous system', 'asn number', 'isp asn', 'network asn'],
  account_id:          ['account_id', 'account id', 'customer id', 'customer_id', 'user id', 'user_id', 'member id'],
  ground_truth_label:  ['ground_truth_label', 'ground truth', 'label', 'fraud label', 'known fraud', 'is_fraud'],
};

export function autoMapHeaders(csvHeaders: string[]): Partial<Record<RequiredField, string>> {
  const mapping: Partial<Record<RequiredField, string>> = {};
  const normalized = csvHeaders.map((h) => h.trim().toLowerCase());

  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [RequiredField, string[]][]) {
    for (const alias of aliases) {
      const idx = normalized.indexOf(alias.toLowerCase());
      if (idx !== -1) {
        mapping[field] = csvHeaders[idx];
        break;
      }
    }
  }

  return mapping;
}
