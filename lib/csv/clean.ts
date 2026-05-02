import { ORDER_STATUSES, REFUND_STATUSES, REFUND_REASONS, GROUND_TRUTH_LABELS } from './schema';

type OrderStatus = (typeof ORDER_STATUSES)[number];
type RefundStatus = (typeof REFUND_STATUSES)[number];
type RefundReason = (typeof REFUND_REASONS)[number];
type GroundTruthLabel = (typeof GROUND_TRUTH_LABELS)[number];

const STATUS_MAP: Record<string, OrderStatus> = {
  complete: 'completed',
  completed: 'completed',
  shipped: 'completed',
  delivered: 'completed',
  fulfilled: 'completed',
  processed: 'completed',
  paid: 'completed',
  pending: 'pending',
  awaiting: 'pending',
  processing: 'pending',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  refunded: 'refunded',
  return: 'refunded',
  returned: 'refunded',
};

const REFUND_MAP: Record<string, RefundStatus> = {
  none: 'none',
  no: 'none',
  false: 'none',
  0: 'none',
  '': 'none',
  partial: 'partial',
  partly: 'partial',
  some: 'partial',
  full: 'full',
  yes: 'full',
  true: 'full',
  1: 'full',
  refunded: 'full',
};

const REASON_MAP: Record<string, RefundReason> = {
  inr: 'inr',
  'item not received': 'inr',
  'not received': 'inr',
  'never arrived': 'inr',
  'did not arrive': 'inr',
  'non delivery': 'inr',
  undelivered: 'inr',
  lost: 'inr',
  damaged: 'damaged',
  broken: 'damaged',
  defective: 'damaged',
  'not as described': 'not_as_described',
  'wrong item': 'not_as_described',
  'not as advertised': 'not_as_described',
  'not fit for purpose': 'not_as_described',
  'changed mind': 'changed_mind',
  'change of mind': 'changed_mind',
  'no longer wanted': 'changed_mind',
  unwanted: 'changed_mind',
  'friendly fraud': 'friendly_fraud',
  chargeback: 'friendly_fraud',
  dispute: 'friendly_fraud',
  other: 'other',
  misc: 'other',
};

const GROUND_TRUTH_MAP: Record<string, GroundTruthLabel> = {
  fraud: 'fraud',
  fraudulent: 'fraud',
  bad: 'fraud',
  1: 'fraud',
  true: 'fraud',
  yes: 'fraud',
  legitimate: 'legitimate',
  legit: 'legitimate',
  good: 'legitimate',
  0: 'legitimate',
  false: 'legitimate',
  no: 'legitimate',
  // Identity-model labels
  same_person: 'same_person',
  'same person': 'same_person',
  linked: 'same_person',
  different_people: 'different_people',
  'different people': 'different_people',
  different: 'different_people',
  unknown: 'unknown',
};

export function cleanString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function cleanOrderStatus(value: unknown): OrderStatus | undefined {
  const raw = cleanString(value).toLowerCase();
  if (!raw) return undefined;
  return STATUS_MAP[raw] ?? undefined;
}

export function cleanRefundStatus(value: unknown): RefundStatus | undefined {
  const raw = cleanString(value).toLowerCase();
  return REFUND_MAP[raw] ?? undefined;
}

export function cleanRefundReason(value: unknown): RefundReason | undefined {
  const raw = cleanString(value).toLowerCase();
  return REASON_MAP[raw] ?? undefined;
}

export function cleanCurrency(value: unknown): string {
  const raw = cleanString(value).toUpperCase();
  // Remove currency symbols and take first 3 alpha chars if possible
  const stripped = raw.replace(/[^A-Z]/g, '');
  if (stripped.length >= 3) return stripped.slice(0, 3);
  return raw.slice(0, 3);
}

export function cleanOrderTotal(value: unknown): string {
  const raw = cleanString(value);
  if (!raw) return ''; // blank cell — let schema validation reject it rather than silently scoring as £0
  // Remove currency symbols, commas, spaces; keep digits, decimal point, minus
  const cleaned = raw.replace(/[^\d.\-]/g, '');
  // Handle multiple dots (keep first)
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }
  return cleaned || '';
}

export function cleanEmail(value: unknown): string {
  return cleanString(value).toLowerCase();
}

export function cleanGroundTruth(value: unknown): GroundTruthLabel | undefined {
  const raw = cleanString(value).toLowerCase();
  if (!raw) return undefined;
  return GROUND_TRUTH_MAP[raw] ?? undefined;
}

export const COLUMN_ALIASES: Record<string, string> = {
  orderid: 'order_id',
  order_number: 'order_id',
  order_ref: 'order_id',
  transaction_id: 'order_id',
  id: 'order_id',

  orderdate: 'order_date',
  date: 'order_date',
  order_datetime: 'order_date',
  created_at: 'order_date',

  email: 'customer_email',
  customeremail: 'customer_email',
  buyer_email: 'customer_email',
  user_email: 'customer_email',

  name: 'customer_name',
  customername: 'customer_name',
  buyer_name: 'customer_name',
  full_name: 'customer_name',

  address: 'shipping_address',
  shippingaddress: 'shipping_address',
  delivery_address: 'shipping_address',
  ship_to: 'shipping_address',

  total: 'order_total',
  amount: 'order_total',
  grand_total: 'order_total',
  price: 'order_total',
  value: 'order_total',

  currencycode: 'currency',
  currency_code: 'currency',

  status: 'order_status',
  orderstatus: 'order_status',
  order_state: 'order_status',

  phone: 'customer_phone',
  customerphone: 'customer_phone',
  telephone: 'customer_phone',
  mobile: 'customer_phone',
  buyer_phone: 'customer_phone',

  billingaddress: 'billing_address',
  bill_to: 'billing_address',
  invoice_address: 'billing_address',

  refundstatus: 'refund_status',
  refund_state: 'refund_status',
  refund_type: 'refund_status',

  refundreason: 'refund_reason',
  reason: 'refund_reason',
  refund_cause: 'refund_reason',

  refunddate: 'refund_date',
  refund_datetime: 'refund_date',

  refundamount: 'refund_amount',
  refunded_amount: 'refund_amount',

  paymentmethod: 'payment_method',
  payment_type: 'payment_method',
  payment: 'payment_method',

  ip: 'ip_address',
  ipaddress: 'ip_address',
  client_ip: 'ip_address',

  device: 'device_id',
  deviceid: 'device_id',
  device_fingerprint: 'device_id',

  cardfp: 'card_fingerprint',
  card_fingerprint: 'card_fingerprint',
  card_token: 'card_fingerprint',

  bin: 'card_bin',
  cardbin: 'card_bin',
  card_bin: 'card_bin',

  last4: 'card_last4',
  cardlast4: 'card_last4',
  card_last_four: 'card_last4',

  browserfp: 'browser_fingerprint',
  browser_fingerprint: 'browser_fingerprint',

  cookie: 'cookie_id',
  cookieid: 'cookie_id',

  useragent: 'user_agent',
  ua: 'user_agent',

  account: 'account_id',
  accountid: 'account_id',
  user_id: 'account_id',
  customer_id: 'account_id',

  groundtruth: 'ground_truth_label',
  ground_truth: 'ground_truth_label',
  label: 'ground_truth_label',
  is_fraud: 'ground_truth_label',
  fraud_label: 'ground_truth_label',
};

export function cleanHeader(raw: string): string {
  const k = raw.trim().toLowerCase().replace(/\s+/g, '_');
  return COLUMN_ALIASES[k] ?? k;
}

export function cleanRow(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(raw)) {
    out[cleanHeader(key)] = val;
  }

  // Clean values
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(out)) {
    switch (key) {
      case 'order_status':
        result[key] = cleanOrderStatus(val);
        break;
      case 'refund_status':
        result[key] = cleanRefundStatus(val);
        break;
      case 'refund_reason':
        result[key] = cleanRefundReason(val);
        break;
      case 'currency':
        result[key] = cleanCurrency(val);
        break;
      case 'order_total':
        result[key] = cleanOrderTotal(val);
        break;
      case 'refund_amount':
        result[key] = cleanOrderTotal(val); // same cleaning logic
        break;
      case 'customer_email':
        result[key] = cleanEmail(val);
        break;
      case 'ground_truth_label':
        result[key] = cleanGroundTruth(val);
        break;
      default:
        result[key] = cleanString(val);
    }
  }

  return result;
}
