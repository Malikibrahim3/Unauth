import { OPTIONAL_FIELD_GROUPS, REQUIRED_FIELDS, type RequiredField } from '@/lib/csv/headerAliases';
import type { RecentImport } from '@/components/upload/uploadClientTypes';

export const EMPTY_RECENT_IMPORTS: RecentImport[] = [];

export const CSV_TEMPLATE_HEADERS =
  'order_id,order_date,customer_email,customer_name,shipping_address,order_total,order_status,currency,customer_phone,billing_address,refund_status,refund_reason,refund_date,refund_amount,payment_method,ip_address,device_id,card_last4,card_bin,card_fingerprint,browser_fingerprint,cookie_id,user_agent,asn,account_id';

export const EXAMPLE_ROW =
  'ORD-001,2024-01-15,alice@example.com,Alice Smith,"123 Main St",99.99,paid,USD,+1-555-0100,"123 Main St",not_refunded,,,,Visa,203.0.113.42,device_abc,4242,411111,fp_abc,bf_xyz,ck_123,Mozilla/5.0,AS15169,acc_001';

export const UPLOAD_STEP_LABELS = ['Upload', 'Map fields', 'Confirm & run'] as const;

export const FIELD_LABELS: Record<RequiredField, string> = {
  order_id: 'Order ID',
  order_date: 'Order date',
  customer_email: 'Customer email',
  customer_name: 'Customer name',
  shipping_address: 'Shipping address',
  order_total: 'Order total',
  currency: 'Currency',
  order_status: 'Order status',
  customer_phone: 'Customer phone',
  billing_address: 'Billing address',
  refund_status: 'Refund status',
  refund_reason: 'Refund reason',
  refund_date: 'Refund date',
  refund_amount: 'Refund amount',
  payment_method: 'Payment method',
  ip_address: 'IP address',
  device_id: 'Device ID',
  card_last4: 'Card last 4',
  card_bin: 'Card BIN',
  card_fingerprint: 'Card fingerprint',
  browser_fingerprint: 'Browser fingerprint',
  cookie_id: 'Cookie / visitor ID',
  user_agent: 'User agent',
  asn: 'ASN',
  account_id: 'Account ID',
  ground_truth_label: 'Ground truth label',
  chargeback_dispute: 'Chargeback filed',
  chargeback_date: 'Chargeback date',
  chargeback_reason_code: 'Chargeback reason code',
  refund_requested: 'Refund requested',
  return_requested: 'Return requested',
  delivery_status: 'Delivery status',
  delivery_method: 'Delivery method',
  tracking_number: 'Tracking number',
};

export const VISIBLE_OPTIONAL_FIELD_GROUPS = OPTIONAL_FIELD_GROUPS.filter((group) => !group.collapsed);
export const COLLAPSED_OPTIONAL_FIELD_GROUPS = OPTIONAL_FIELD_GROUPS.filter((group) => group.collapsed);

export const REQUIRED_FIELDS_LIST = REQUIRED_FIELDS;

export const UPLOAD_TYPE_OPTIONS = [
  {
    value: 'standard' as const,
    title: 'Regular upload',
    description: 'Periodic export - a week, a month, a quarter.',
  },
  {
    value: 'historical' as const,
    title: 'Historical import',
    description: 'One-time bulk import of past data. Builds your baseline without triggering new alerts.',
  },
  {
    value: 'investigation' as const,
    title: 'Customer lookup',
    description: "Targeted analysis for a specific customer. Doesn't affect population statistics.",
  },
];

export const ADVANCED_INTEGRATIONS = [
  {
    title: 'Checkout tracking',
    description: 'Device fingerprint, session ID, and visitor signals captured at checkout.',
    icon: '🖥️',
  },
  {
    title: 'Payment provider',
    description: 'Card fingerprint, AVS/CVV/3DS results directly from your PSP.',
    icon: '💳',
  },
  {
    title: 'Courier / delivery',
    description: 'Tracking events, proof of delivery, and failed delivery signals.',
    icon: '📦',
  },
  {
    title: 'IP intelligence',
    description: 'VPN, proxy, and Tor detection on the IP used at checkout.',
    icon: '🌐',
  },
];

export function readExportGuideOpenPreference(): boolean {
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('unauth.exportGuide.open') : null;
    if (stored !== null) return stored !== '0';
  } catch {
    /* ignore */
  }
  return false;
}
