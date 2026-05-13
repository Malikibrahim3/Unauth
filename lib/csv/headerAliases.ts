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
  | 'ground_truth_label'
  | 'chargeback_dispute'
  | 'chargeback_date'
  | 'chargeback_reason_code'
  | 'refund_requested'
  | 'return_requested'
  | 'delivery_status'
  | 'delivery_method'
  | 'tracking_number';

/** Fields that MUST be mapped before the upload can proceed. */
export const REQUIRED_FIELDS: RequiredField[] = [
  'order_id',
  'order_date',
  'customer_email',
  'order_total',
];

/** How important each field is for the UI warnings. */
export type FieldImportance = 'required' | 'match_improver' | 'nice_to_have';

export const FIELD_IMPORTANCE: Record<RequiredField, FieldImportance> = {
  order_id: 'required',
  order_date: 'required',
  customer_email: 'required',
  order_total: 'required',

  // Match improvers — shown with amber indicator when unmapped
  customer_name: 'match_improver',
  shipping_address: 'match_improver',
  customer_phone: 'match_improver',
  billing_address: 'match_improver',
  ip_address: 'match_improver',
  card_last4: 'match_improver',
  card_bin: 'match_improver',
  card_fingerprint: 'match_improver',
  browser_fingerprint: 'match_improver',
  device_id: 'match_improver',
  cookie_id: 'match_improver',
  user_agent: 'match_improver',
  asn: 'match_improver',
  account_id: 'match_improver',
  payment_method: 'match_improver',

  // Nice-to-have — no indicator when unmapped
  currency: 'nice_to_have',
  order_status: 'nice_to_have',
  refund_status: 'nice_to_have',
  refund_reason: 'nice_to_have',
  refund_date: 'nice_to_have',
  refund_amount: 'nice_to_have',
  ground_truth_label: 'nice_to_have',
  chargeback_dispute: 'nice_to_have',
  chargeback_date: 'nice_to_have',
  chargeback_reason_code: 'nice_to_have',
  refund_requested: 'nice_to_have',
  return_requested: 'nice_to_have',
  delivery_status: 'nice_to_have',
  delivery_method: 'nice_to_have',
  tracking_number: 'nice_to_have',
};

export const OPTIONAL_FIELDS: RequiredField[] = Object.keys(FIELD_IMPORTANCE).filter(
  (f): f is RequiredField => !REQUIRED_FIELDS.includes(f as RequiredField)
);

/** Logical grouping of optional fields for the mapping UI */
export const OPTIONAL_FIELD_GROUPS: { label: string; fields: RequiredField[]; importance?: FieldImportance; collapsed?: boolean }[] = [
  {
    label: 'Identity fields',
    fields: [
      'customer_name',
      'shipping_address',
      'customer_phone',
      'billing_address',
      'account_id',
    ],
    importance: 'match_improver',
  },
  {
    label: 'Payment signals — Card BIN + last 4 are not unique by themselves, but support other matches.',
    fields: ['payment_method', 'card_last4', 'card_bin'],
    importance: 'match_improver',
  },
  {
    label: 'Refund & dispute fields',
    fields: [
      'refund_status',
      'refund_requested',
      'refund_reason',
      'refund_date',
      'refund_amount',
      'return_requested',
      'chargeback_dispute',
      'chargeback_date',
      'chargeback_reason_code',
    ],
    importance: 'nice_to_have',
  },
  {
    label: 'Order & delivery fields',
    fields: ['currency', 'order_status', 'delivery_status', 'delivery_method', 'tracking_number'],
    importance: 'nice_to_have',
  },
  {
    label: 'Advanced optional CSV fields',
    fields: ['ip_address', 'user_agent'],
    importance: 'nice_to_have',
    collapsed: true,
  },
];

export const HEADER_ALIASES: Record<RequiredField, string[]> = {
  order_id: [
    'order_id', 'order id', 'order number', 'order_name', 'id', 'name',
    'order #', 'order#', 'orderid', 'order-id', 'transaction_id', 'transaction id',
    'order ref', 'order reference', 'reference', 'order_no', 'order no',
    'receipt id', 'receipt_id', 'receipt-id',
  ],

  order_date: [
    'order_date', 'order date',
    // Shopify
    'created_at', 'created at', 'created at',
    'paid at', 'processed at',
    // WooCommerce
    'date_created', 'date created', 'date_created_gmt',
    // BigCommerce
    'order_date',
    // Magento
    'purchase_date', 'purchase date',
    // Amazon Seller
    'order-date', 'order date', 'purchase-date', 'purchase date',
    // Etsy
    'sale date', 'sale_date', 'transaction date', 'transaction_date',
    // General
    'orderdate', 'order_created', 'date', 'timestamp', 'created', 'placed_at',
    'placed_on', 'order time', 'order_timestamp', 'datetime', 'date_time',
  ],

  customer_email: [
    'customer_email',
    // Shopify
    'email', 'customer email', 'buyer email', 'buyer_email',
    // WooCommerce
    'billing_email', 'billing email',
    // Amazon
    'buyer-email',
    // General
    'email_address', 'emailaddress', 'e-mail', 'e mail', 'contact email',
  ],

  customer_name: [
    'customer_name',
    // Shopify
    'name', 'billing name', 'shipping name',
    // WooCommerce (split — we handle concatenation in normalise.ts)
    'billing_first_name', 'billing last name', 'billing_firstname', 'billing_lastname',
    'shipping_first_name', 'shipping last name', 'shipping_firstname', 'shipping_lastname',
    'first_name', 'last_name', 'firstname', 'lastname',
    // General
    'full name', 'full_name', 'buyer_name', 'buyer name', 'customername',
    'customer name', 'contact name', 'contact_name', 'recipient name',
  ],

  shipping_address: [
    'shipping_address',
    // Shopify
    'shipping street', 'shipping address', 'shipping_address1', 'shipping address1',
    'shipping address 1', 'shipping_address_1',
    // WooCommerce
    'shipping_address_1', 'shipping address 1',
    // General
    'delivery address', 'delivery_address', 'ship to', 'ship_to',
    'ship address 1', 'ship_address_1', 'ship-address-1',
    'address', 'address 1', 'address_1', 'street_address', 'street address', 'shipping', 'delivery',
  ],

  order_total: [
    'order_total',
    // Shopify
    'total', 'subtotal', 'total_price', 'total price',
    // WooCommerce
    'order_total', 'total',
    // General
    'amount', 'grand_total', 'grand total', 'order_amount', 'order amount',
    'price', 'item-price', 'item price', 'order value', 'order_value', 'order_value_gbp', 'order value gbp',
    'revenue', 'net total', 'gross total', 'value',
  ],

  currency: [
    'currency', 'currency code', 'currency_code', 'currency id', 'currency_id',
    'order currency', 'order_currency',
  ],

  order_status: [
    'order_status', 'order status',
    'financial status', 'financial_status',
    'fulfillment status', 'fulfillment_status',
    'status', 'order state', 'order_state',
  ],

  customer_phone: [
    'customer_phone', 'customer phone',
    // Shopify
    'phone', 'billing phone', 'billing_phone', 'shipping phone', 'shipping_phone',
    // WooCommerce
    'billing_phone',
    // General
    'phone_number', 'phone number', 'telephone', 'tel', 'mobile',
    'buyer phone number', 'buyer_phone_number', 'buyer-phone-number',
    'contact_number', 'contact number', 'cell', 'cellphone', 'cell_phone',
  ],

  billing_address: [
    'billing_address', 'billing address', 'billing_address1', 'billing address1',
    'billing address 1', 'billing_address_1', 'billing_address_2',
    'billing street', 'billing street',
  ],

  refund_status: [
    'refund_status', 'refund status',
    'refunded', 'is_refunded', 'is refunded', 'has_refund', 'has refund',
    'return_requested', 'return requested', 'return status', 'return_status',
  ],

  refund_reason: [
    'refund_reason', 'refund reason',
    'return_reason', 'return reason', 'cancellation_reason', 'cancellation reason',
    'refund_notes', 'refund notes', 'refund note',
  ],

  refund_date: [
    'refund_date', 'refund date',
    'refunded_at', 'refunded at', 'return date', 'return_date',
  ],

  refund_amount: [
    'refund_amount', 'refund amount',
    'refunded_amount', 'refunded amount', 'amount_refunded', 'amount refunded',
    'refund_total', 'refund total',
  ],

  payment_method: [
    'payment_method', 'payment method',
    'payment_gateway', 'payment gateway', 'gateway',
    'payment_type', 'payment type', 'payment instrument',
  ],

  ip_address: [
    'ip_address', 'ip address',
    'buyer ip', 'buyer_ip', 'browser ip', 'browser_ip',
    'customer ip', 'customer_ip', 'checkout_ip', 'checkout ip',
    'customer ip address', 'customer_ip_address',
    'ip', 'remote_ip', 'remote ip', 'client_ip', 'client ip',
  ],

  device_id: [
    'device_id', 'device id',
    'device fingerprint', 'device_fingerprint', 'device hash',
  ],

  card_last4: [
    'card_last4', 'card last 4', 'card last four',
    'last4', 'last 4', 'last_four', 'card_last_four',
    'last_4_digits', 'last 4 digits', 'card number last 4',
  ],

  card_bin: [
    'card_bin', 'card bin',
    'bin', 'iin', 'card iin', 'card_iin',
    'first6', 'first 6', 'first_6', 'bank identification number',
  ],

  card_fingerprint: [
    'card_fingerprint', 'card fingerprint',
    'payment fingerprint', 'stripe card fingerprint', 'psp fingerprint',
    'card hash', 'payment method fingerprint',
  ],

  browser_fingerprint: [
    'browser_fingerprint', 'browser fingerprint',
    'fp', 'fingerprint', 'canvas fingerprint', 'browser hash',
  ],

  cookie_id: [
    'cookie_id', 'cookie id',
    'session id', 'session_id', 'visitor id', 'visitor_id',
    'session cookie', 'session_cookie',
  ],

  user_agent: [
    'user_agent', 'user agent', 'useragent',
    'browser', 'ua', 'client',
  ],

  asn: [
    'asn', 'autonomous system', 'asn number', 'isp asn', 'network asn',
    'isp', 'network',
  ],

  account_id: [
    'account_id', 'account id',
    // Shopify
    'customer id', 'customer_id', 'Customer ID', 'customerid',
    // WooCommerce
    'user_id', 'user id',
    // General
    'account_number', 'account number', 'customer number', 'customer_number',
    'member id', 'member_id', 'account',
  ],

  ground_truth_label: [
    'ground_truth_label', 'ground truth',
    'label', 'fraud label', 'known fraud', 'is_fraud', 'fraud_flag',
    'flag', 'risk_label',
  ],

  chargeback_dispute: [
    'chargeback_dispute',
    'chargeback', 'is_chargeback', 'is chargeback', 'has_chargeback', 'has chargeback',
    'dispute', 'disputed', 'dispute_filed', 'dispute filed',
    'chargeback filed', 'chargeback_filed', 'chargeback status',
  ],

  refund_requested: [
    'refund_requested', 'refund requested',
    'refund_claim', 'refund claim', 'refund_claimed', 'claimed_refund',
    'has_refund_claim', 'has refund claim', 'refund request',
  ],

  return_requested: [
    'return_requested', 'return requested',
    'return_claim', 'return claim', 'return_claimed',
    'has_return', 'has return', 'return_filed', 'return filed',
  ],

  chargeback_date: [
    'chargeback_date', 'chargeback date',
    'dispute_date', 'dispute date', 'disputed_at', 'chargeback_at',
    'chargeback filed date', 'chargeback_filed_date',
  ],

  chargeback_reason_code: [
    'chargeback_reason_code', 'chargeback reason code',
    'dispute_reason', 'dispute reason', 'chargeback_reason', 'chargeback reason',
    'reason code', 'reason_code', 'dispute_code', 'dispute code',
  ],

  delivery_status: [
    'delivery_status', 'delivery status',
    'fulfillment_status', 'fulfillment status',
    'shipment_status', 'shipment status',
    'shipping_status', 'shipping status',
  ],

  delivery_method: [
    'delivery_method', 'delivery method',
    'shipping_method', 'shipping method',
    'fulfillment_method', 'fulfillment method',
    'carrier', 'shipping_carrier', 'shipping carrier',
    'courier', 'shipment_method', 'shipment method',
  ],

  tracking_number: [
    'tracking_number', 'tracking number',
    'tracking_id', 'tracking id',
    'shipment_tracking', 'shipment tracking',
    'tracking_code', 'tracking code',
    'tracking', 'track', 'courier_tracking',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Fuzzy fallback — substring patterns for headers that miss exact alias match
// ─────────────────────────────────────────────────────────────────────────────

interface FuzzyRule {
  field: RequiredField;
  test: (header: string) => boolean;
}

const FUZZY_RULES: FuzzyRule[] = [
  // High-confidence specific substrings (checked first)
  {
    field: 'customer_email',
    test: (h) =>
      h.includes('email') &&
      !h.includes('status') &&
      !h.includes('phone'),
  },
  {
    field: 'customer_phone',
    test: (h) =>
      h.includes('phone') ||
      h.includes('mobile') ||
      h.includes('tel') ||
      h.includes('cell'),
  },
  {
    field: 'ip_address',
    test: (h) =>
      (h.includes('ip') || h.includes('client')) &&
      h.length < 20 &&
      !h.includes('shipping') &&
      !h.includes('zip'),
  },
  {
    field: 'card_last4',
    test: (h) =>
      (h.includes('card') || h.includes('cc')) &&
      (h.includes('last') || h.includes('4') || h.includes('four') || h.includes('digit')),
  },
  {
    field: 'chargeback_dispute',
    test: (h) =>
      h.includes('chargeback') ||
      h.includes('dispute') ||
      h.includes('cbk'),
  },
  {
    field: 'refund_amount',
    test: (h) =>
      h.includes('refund') &&
      (h.includes('amount') || h.includes('total') || h.includes('sum') || h.includes('value')),
  },
  {
    field: 'refund_reason',
    test: (h) =>
      h.includes('refund') &&
      (h.includes('reason') || h.includes('note') || h.includes('cause')),
  },
  {
    field: 'refund_status',
    test: (h) =>
      h.includes('refund') &&
      (h.includes('status') || h.includes('state') || h.includes('flag')),
  },
  {
    field: 'refund_date',
    test: (h) =>
      h.includes('refund') &&
      (h.includes('date') || h.includes('time') || h.includes('at')),
  },
  {
    field: 'refund_requested',
    test: (h) =>
      h.includes('refund') &&
      (h.includes('request') || h.includes('claim') || h.includes('ask')),
  },
  // Broader fallbacks (checked later)
  {
    field: 'order_total',
    test: (h) =>
      (h.includes('total') || h.includes('amount') || h.includes('revenue') || h.includes('sum')) &&
      !h.includes('refund') &&
      !h.includes('subtotal') &&
      !h.includes('tax') &&
      !h.includes('shipping') &&
      !h.includes('discount'),
  },
  {
    field: 'shipping_address',
    test: (h) =>
      (h.includes('zip') || h.includes('post') || h.includes('address') || h.includes('street')) &&
      !h.includes('email') &&
      !h.includes('ip'),
  },
  {
    field: 'customer_name',
    test: (h) =>
      h.includes('name') &&
      !h.includes('email') &&
      !h.includes('product') &&
      !h.includes('item') &&
      !h.includes('category') &&
      !h.includes('company'),
  },
  {
    field: 'order_date',
    test: (h) =>
      (h.includes('date') || h.includes('time') || h.includes('created') || h.includes('placed')) &&
      !h.includes('refund') &&
      !h.includes('birth') &&
      !h.includes('delivery'),
  },
  {
    field: 'account_id',
    test: (h) =>
      (h.includes('customer') || h.includes('user') || h.includes('account')) &&
      (h.includes('id') || h.includes('number') || h.includes('code')) &&
      !h.includes('order') &&
      !h.includes('product'),
  },
  {
    field: 'card_bin',
    test: (h) =>
      (h.includes('bin') || h.includes('iin')) &&
      (h.includes('card') || h.includes('bank')),
  },
  {
    field: 'device_id',
    test: (h) =>
      h.includes('device') &&
      (h.includes('id') || h.includes('finger') || h.includes('hash')),
  },
  {
    field: 'browser_fingerprint',
    test: (h) =>
      h.includes('finger') ||
      (h.includes('browser') && (h.includes('id') || h.includes('hash'))),
  },
];

export interface AutoMapResult {
  /** Confident exact-alias matches */
  exact: Partial<Record<RequiredField, string>>;
  /** Fuzzy substring suggestions — show with "?" in UI for merchant confirmation */
  fuzzy: Partial<Record<RequiredField, string>>;
}

/**
 * Map raw CSV headers to canonical fields using exact aliases first,
 * then fuzzy substring fallback for anything still unmapped.
 *
 * Returns both confident exact matches and lower-confidence fuzzy suggestions.
 * A single CSV header is never assigned to more than one field.
 */
export function autoMapHeaders(csvHeaders: string[]): AutoMapResult {
  const exact: Partial<Record<RequiredField, string>> = {};
  const fuzzy: Partial<Record<RequiredField, string>> = {};

  const normalized = csvHeaders.map((h) => h.trim().toLowerCase());
  const used = new Set<number>();

  // ── Pass 1: exact alias matching ──
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [RequiredField, string[]][]) {
    for (const alias of aliases) {
      const aliasNorm = alias.toLowerCase();
      const idx = normalized.findIndex((h, i) => !used.has(i) && h === aliasNorm);
      if (idx !== -1) {
        exact[field] = csvHeaders[idx];
        used.add(idx);
        break;
      }
    }
  }

  // ── Pass 2: fuzzy substring fallback ──
  // Collect remaining unused headers
  const remaining = csvHeaders.map((raw, i) => ({ raw, norm: normalized[i], idx: i })).filter((h) => !used.has(h.idx));

  for (const { raw, norm } of remaining) {
    for (const rule of FUZZY_RULES) {
      // Skip if this field already has an exact or fuzzy match
      if (exact[rule.field] || fuzzy[rule.field]) continue;
      if (rule.test(norm)) {
        fuzzy[rule.field] = raw;
        break; // one header = one suggestion
      }
    }
  }

  return { exact, fuzzy };
}
