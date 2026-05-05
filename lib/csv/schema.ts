import { z } from 'zod';

export const ORDER_STATUSES = ['completed', 'cancelled', 'refunded', 'pending'] as const;
export const REFUND_STATUSES = ['none', 'partial', 'full'] as const;
export const REFUND_REASONS = [
  'inr',
  'damaged',
  'not_as_described',
  'changed_mind',
  'friendly_fraud',
  'other',
] as const;
export const GROUND_TRUTH_LABELS = [
  'fraud',
  'legitimate',
  'same_person',
  'different_people',
  'unknown',
] as const;

export const csvRowSchema = z.object({
  order_id: z.string().min(1, 'order_id is required'),
  order_date: z.string().min(1, 'order_date is required').refine((v) => {
    const d = new Date(v);
    return !isNaN(d.getTime());
  }, 'order_date must be a valid date (e.g. 2024-01-31 or 2024-01-31T14:22:00Z)'),
  customer_email: z.string().min(1, 'customer_email is required'),
  customer_name: z.string().optional(),
  shipping_address: z.string().optional(),
  order_total: z.string().refine((v) => {
    if (v === '') return false; // blank cell is not valid
    const n = parseFloat(v);
    return !isNaN(n) && n >= 0;
  }, 'order_total must be a non-negative number'),
  currency: z.string().min(1, 'currency is required').optional(),
  order_status: z.string().optional(),

  customer_phone: z.string().optional(),
  billing_address: z.string().optional(),
  shipping_postcode: z.string().optional(),
  postcode: z.string().optional(),
  refund_status: z.string().optional(),
  refund_reason: z.string().optional(),
  refund_date: z.string().optional().refine((v) => {
    if (!v || v === '') return true; // optional, blank is fine
    const d = new Date(v);
    return !isNaN(d.getTime());
  }, 'refund_date must be a valid date'),
  refund_amount: z.string().optional().refine((v) => {
    if (!v || v === '') return true;
    const n = parseFloat(v);
    return !isNaN(n) && n >= 0;
  }, 'refund_amount must be a non-negative number'),
  payment_method: z.string().optional(),
  ip_address: z.string().optional(),
  device_id: z.string().optional(),
  card_fingerprint: z.string().optional(),
  card_bin: z.string().optional(),
  card_last4: z.string().optional(),
  browser_fingerprint: z.string().optional(),
  cookie_id: z.string().optional(),
  user_agent: z.string().optional(),
  asn: z.string().optional(),
  account_id: z.string().optional(),
  ground_truth_label: z.string().optional(),

  // Dispute-history intelligence (§1 consortium signal).
  // Accepted forms are parsed by cleanBoolean: true/false, yes/no, 1/0, y/n.
  chargeback_dispute: z.string().optional(),
  refund_requested: z.string().optional(),
  return_requested: z.string().optional(),
});

export type CsvRow = z.infer<typeof csvRowSchema>;

export const REQUIRED_COLUMNS = [
  'order_id',
  'order_date',
  'customer_email',
  'order_total',
] as const;
