import { ORDER_STATUSES, REFUND_STATUSES, REFUND_REASONS, GROUND_TRUTH_LABELS } from './schema';
import { HEADER_ALIASES } from './headerAliases';

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

/**
 * Parse permissive truthy/falsy values from a CSV cell into a boolean.
 * Accepts: true/false, yes/no, y/n, 1/0, t/f — case-insensitive.
 * Returns null when the cell is empty or unrecognised (so absence stays absent,
 * not a silent `false`).
 */
export function cleanBoolean(value: unknown): boolean | null {
  const raw = cleanString(value).toLowerCase();
  if (!raw) return null;
  if (['true', 'yes', 'y', '1', 't'].includes(raw)) return true;
  if (['false', 'no', 'n', '0', 'f'].includes(raw)) return false;
  return null;
}

export function cleanGroundTruth(value: unknown): GroundTruthLabel | undefined {
  const raw = cleanString(value).toLowerCase();
  if (!raw) return undefined;
  return GROUND_TRUTH_MAP[raw] ?? undefined;
}

/**
 * COLUMN_ALIASES is derived from the single source of truth in
 * headerAliases.ts (HEADER_ALIASES).
 *
 * Derivation: for every field → alias list entry we normalise the alias
 * (trim, lowercase, spaces → underscores) and emit `normalisedAlias → field`.
 * When two fields share a normalised alias (e.g. 'name' appears in both
 * order_id and customer_name), the **last writer wins** — iteration order of
 * HEADER_ALIASES means more-specific fields (customer_name) overwrite
 * less-specific ones (order_id), which matches the original hand-maintained
 * table behaviour.
 *
 * Additional postcode/zip aliases that are not canonical RequiredFields but
 * are used by the shipping-address normaliser are appended manually below
 * because HEADER_ALIASES deliberately maps them to shipping_address instead.
 */
export const COLUMN_ALIASES: Record<string, string> = {
  // ── Derived from HEADER_ALIASES (single source of truth) ─────────────────
  ...Object.fromEntries(
    (Object.entries(HEADER_ALIASES) as [string, string[]][]).flatMap(
      ([field, aliases]) =>
        aliases.map((alias) => [alias.trim().toLowerCase().replace(/[\s-]+/g, '_'), field]),
    ),
  ),
  shipping_postcode: 'shipping_postcode',
  shipping_zip: 'shipping_postcode',
  shipping_zipcode: 'shipping_postcode',
  shipping_postal_code: 'shipping_postcode',
  ship_postal_code: 'shipping_postcode',
  ship_zipcode: 'shipping_postcode',
  ship_zip: 'shipping_postcode',
  postcode: 'postcode',
  post_code: 'postcode',
  postal_code: 'postcode',
  zip: 'postcode',
  zip_code: 'postcode',
  shipping_country: 'shipping_country',
  shipping_country_code: 'shipping_country',
  ship_country: 'shipping_country',
  country: 'shipping_country',
  // Shopify exports use "Name" for the order name/order number. Customer
  // person names are covered by more specific aliases like billing_name,
  // shipping_name, buyer_name, and customer_name.
  name: 'order_id',
};

export function cleanHeader(raw: string): string {
  const k = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return COLUMN_ALIASES[k] ?? k;
}

export function cleanRow(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(raw)) {
    const canonical = cleanHeader(key);
    const existing = out[canonical];
    const next = cleanString(val);
    const hasExisting = cleanString(existing) !== '';
    if (hasExisting && next === '') continue;
    if (hasExisting && next !== '' && canonical !== key) continue;
    out[canonical] = val;
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
