/**
 * Data Quality Assessment
 *
 * Scores a CSV upload based on which identity fields are present and how
 * complete they are. Used server-side (against NormalisedOrder[]) in the
 * worker pipeline and client-side (against column mappings) in the upload UI.
 *
 * Grade thresholds use RAW point totals, not normalised percentages:
 *   rich     ≥ 60  — hardware signals present, matching will be strong
 *   adequate 35–59 — some enrichment, moderate matching
 *   sparse   15–34 — limited to soft signals only
 *   minimal  < 15  — required fields only, very limited matching
 *
 * A field present in fewer than 20% of rows is treated as absent for
 * scoring purposes and listed separately in `partlyEmptyFields`.
 */

import type { NormalisedOrder } from '@/lib/engine/types';

export type ConfidenceGrade = 'definite' | 'probable' | 'possible' | 'weak';
export type DataQualityGrade = 'rich' | 'adequate' | 'sparse' | 'minimal';

// ---------------------------------------------------------------------------
// Field tier definitions
// ---------------------------------------------------------------------------

export const FIELD_TIERS = {
  /** Always present — no scoring contribution */
  required: [
    'order_id', 'order_date', 'customer_email',
    'customer_name', 'shipping_address', 'order_total',
  ],
  /** Hardware / PSP signals — dramatically improve matching */
  high: [
    'card_fingerprint',
    'browser_fingerprint',
    'device_id',
    'ip_address',
    'card_last4',
    'cookie_id',
  ],
  /** Enrichment signals — moderate improvement */
  medium: [
    'card_bin',
    'customer_phone',
    'billing_address',
    'account_id',
    'payment_method',
  ],
  /** Marginal improvement */
  low: [
    'refund_status',
    'refund_reason',
    'refund_date',
    'refund_amount',
    'user_agent',
    'asn',
  ],
} as const;

/** Point values for each optional field */
export const FIELD_SCORES: Record<string, number> = {
  card_fingerprint:    25,
  browser_fingerprint: 15,
  device_id:           15,
  ip_address:          12,
  card_last4:          10,
  cookie_id:            8,
  card_bin:             6,
  customer_phone:       5,
  billing_address:      5,
  account_id:           5,
  payment_method:       3,
  refund_status:        2,
  refund_reason:        2,
  refund_date:          2,
  refund_amount:        2,
  user_agent:           1,
  asn:                  1,
};

/** Minimum row coverage for a field to count as "present" */
const COVERAGE_THRESHOLD = 0.2;

const ALL_OPTIONAL_FIELDS: readonly string[] = [
  ...FIELD_TIERS.high,
  ...FIELD_TIERS.medium,
  ...FIELD_TIERS.low,
];

// ---------------------------------------------------------------------------
// Report types
// ---------------------------------------------------------------------------

export interface DataQualityReport {
  score: number;                        // raw sum of point values for present fields
  grade: DataQualityGrade;
  presentFields: string[];              // fields effectively present (coverage >= 20%)
  missingHighValue: string[];           // high-tier fields not present
  missingMediumValue: string[];         // medium-tier fields not present
  rowCoverage: Record<string, number>;  // per-field % of rows with a non-null value
  partlyEmptyFields: string[];          // fields in header but coverage < 20%
  maxAchievableGrade: ConfidenceGrade;  // highest cluster grade the engine can produce
  recommendations: DataQualityRecommendation[];
}

export interface DataQualityRecommendation {
  field: string;
  humanLabel: string;   // plain English label
  impact: string;       // why it helps
  howToExport: string;  // platform-specific guidance
  priority: 'high' | 'medium' | 'low';
}

// ---------------------------------------------------------------------------
// Recommendation catalogue
// ---------------------------------------------------------------------------

const RECOMMENDATION_CATALOGUE: Record<
  string,
  Omit<DataQualityRecommendation, 'field' | 'priority'>
> = {
  card_fingerprint: {
    humanLabel: 'Card fingerprint (PSP token)',
    impact:
      'Strongest single identity signal. A PSP card token is unique to a card across all merchants using the same PSP — even if the customer changes their email or address.',
    howToExport:
      'Not available in standard platform exports. Available in Stripe Dashboard → Payments → export with "Payment method fingerprint" column. In Adyen: Transaction Overview export. Most small merchants will not have this field.',
  },
  browser_fingerprint: {
    humanLabel: 'Browser fingerprint',
    impact:
      'Canvas/WebGL composite hash — links orders from the same browser even across email changes and incognito mode.',
    howToExport:
      'Not available in any standard platform export. Requires custom frontend instrumentation (e.g. FingerprintJS) installed on your storefront. Contact your development team.',
  },
  device_id: {
    humanLabel: 'Device ID',
    impact:
      'Persistent device identifier — survives email and account changes on the same physical device.',
    howToExport:
      'Not available in standard platform exports. Requires a device fingerprinting library (e.g. FingerprintJS) installed on your storefront.',
  },
  ip_address: {
    humanLabel: 'IP address',
    impact:
      'Links orders placed from the same location. Especially useful when combined with other signals.',
    howToExport:
      'IP addresses are often visible in the order admin UI but are NOT included in many default CSV exports. To include IP addresses in bulk, use a third-party export app or your platform\'s reporting tools; for some platforms (e.g. WooCommerce) it may be available via plugins or direct DB export.',
  },
  card_last4: {
    humanLabel: 'Card last 4 digits',
    impact:
      'Enables card matching between different email addresses. Weaker than card fingerprint but widely available.',
    howToExport:
      'Many platform order exports include a "Credit Card Last 4" column. If it\'s not present, check your platform export settings or your PSP\'s reporting portal.',
  },
  cookie_id: {
    humanLabel: 'Cookie / session ID',
    impact:
      'Persistent first-party browser cookie — survives incognito mode if the same browser profile is reused.',
    howToExport:
      'Not available in standard platform exports. Requires custom session tracking or first-party cookie instrumentation in your storefront.',
  },
  card_bin: {
    humanLabel: 'Card BIN (first 6–8 digits)',
    impact:
      'Combined with last 4, creates a near-unique card identifier. Significantly improves card matching accuracy.',
    howToExport:
      'Available in Stripe exports. In some platforms the BIN is not exported directly — your PSP may include it in their own reporting portal.',
  },
  customer_phone: {
    humanLabel: 'Customer phone number',
    impact:
      'Phone numbers are harder to change than email addresses. Strong corroborating signal when other identity signals are weak.',
    howToExport:
      'Most platform order exports include billing and shipping phone columns. Check your export columns or platform documentation.',
  },
  billing_address: {
    humanLabel: 'Billing address',
    impact:
      'Separate from shipping address — a systematic mismatch between billing and delivery can be a meaningful pattern.',
    howToExport:
      'Many platform order exports include billing address columns (street, city, region, postal code, country). Check your export columns or platform docs.',
  },
  account_id: {
    humanLabel: 'Account / customer ID',
    impact:
      'Platform customer ID definitively links multiple orders to the same account even if the email changes.',
    howToExport:
      'Some platforms include a stable customer/account ID in order exports (e.g. Customer ID). Check your platform export for an account identifier.',
  },
  payment_method: {
    humanLabel: 'Payment method',
    impact:
      'Useful for detecting patterns — e.g. the same digital wallet appearing under different names.',
    howToExport:
      'Payment method is commonly included in order exports as a payment method or gateway column. Check your platform export settings.',
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function gradeFromScore(score: number): DataQualityGrade {
  if (score >= 60) return 'rich';
  if (score >= 35) return 'adequate';
  if (score >= 15) return 'sparse';
  return 'minimal';
}

function maxClusterGrade(g: DataQualityGrade): ConfidenceGrade {
  if (g === 'rich') return 'definite';
  if (g === 'adequate') return 'probable';
  return 'possible'; // sparse and minimal both cap at possible
}

function buildRecommendations(
  missingHigh: string[],
  missingMedium: string[],
): DataQualityRecommendation[] {
  const recs: DataQualityRecommendation[] = [];
  for (const f of missingHigh) {
    const cat = RECOMMENDATION_CATALOGUE[f];
    if (cat) recs.push({ field: f, ...cat, priority: 'high' });
  }
  for (const f of missingMedium) {
    const cat = RECOMMENDATION_CATALOGUE[f];
    if (cat) recs.push({ field: f, ...cat, priority: 'medium' });
  }
  return recs;
}

function buildReport(
  effectiveFields: string[],
  rowCoverage: Record<string, number>,
  partlyEmptyFields: string[],
): DataQualityReport {
  let score = 0;
  for (const f of effectiveFields) score += FIELD_SCORES[f] ?? 0;

  const grade = gradeFromScore(score);
  const missingHighValue = FIELD_TIERS.high.filter(
    (f) => !effectiveFields.includes(f),
  );
  const missingMediumValue = FIELD_TIERS.medium.filter(
    (f) => !effectiveFields.includes(f),
  );

  return {
    score,
    grade,
    presentFields: effectiveFields,
    missingHighValue,
    missingMediumValue,
    rowCoverage,
    partlyEmptyFields,
    maxAchievableGrade: maxClusterGrade(grade),
    recommendations: buildRecommendations(missingHighValue, missingMediumValue),
  };
}

// ---------------------------------------------------------------------------
// Server-side: assess from NormalisedOrder[]
// ---------------------------------------------------------------------------

/** Maps canonical field name → boolean accessor on NormalisedOrder */
const FIELD_ACCESSOR: Record<string, (o: NormalisedOrder) => boolean> = {
  card_fingerprint:    (o) => !!o.cardFingerprint,
  browser_fingerprint: (o) => !!o.browserFingerprint,
  device_id:           (o) => !!o.deviceIdHash,
  ip_address:          (o) => !!o.ipHash,
  card_last4:          (o) => !!o.cardLast4,
  cookie_id:           (o) => !!o.cookieIdHash,
  card_bin:            (o) => !!o.cardBin,
  customer_phone:      (o) => !!o.phoneHash,
  billing_address:     (o) => !!o.billingAddressHash,
  account_id:          (o) => !!o.accountIdHash,
  payment_method:      (o) => !!o.paymentMethod,
  refund_status:       (o) => o.refundStatus !== 'none',
  refund_reason:       (o) => !!o.refundReason,
  refund_date:         (o) => !!o.refundDate,
  refund_amount:       (o) => o.refundAmount !== null,
  user_agent:          (o) => !!o.userAgentHash,
  asn:                 (o) => !!o.asnHash,
};

/**
 * Assess data quality from a batch of normalised orders.
 * Called server-side in the worker after row normalization.
 */
export function assessDataQuality(rows: NormalisedOrder[]): DataQualityReport {
  if (rows.length === 0) {
    return buildReport([], {}, []);
  }

  const rowCoverage: Record<string, number> = {};
  const effectiveFields: string[] = [];
  const partlyEmptyFields: string[] = [];

  for (const field of ALL_OPTIONAL_FIELDS) {
    const accessor = FIELD_ACCESSOR[field];
    if (!accessor) continue;

    const nonNull = rows.filter(accessor).length;
    const coverage = nonNull / rows.length;
    rowCoverage[field] = coverage;

    if (coverage >= COVERAGE_THRESHOLD) {
      effectiveFields.push(field);
    } else if (coverage > 0) {
      partlyEmptyFields.push(field);
    }
  }

  return buildReport(effectiveFields, rowCoverage, partlyEmptyFields);
}

// ---------------------------------------------------------------------------
// Client-side: assess from column mapping + optional raw row samples
// ---------------------------------------------------------------------------

/**
 * Assess data quality from a column mapping (used in the upload UI before
 * processing). Optionally accepts raw CSV row samples for coverage calculation.
 *
 * @param columnMap   - mapping of canonical field name → CSV header name
 * @param rowSamples  - raw parsed rows (keyed by CSV header name), up to 100
 */
export function assessDataQualityFromMapping(
  columnMap: Partial<Record<string, string>>,
  rowSamples?: Array<Record<string, string>>,
): DataQualityReport {
  const rowCoverage: Record<string, number> = {};
  const effectiveFields: string[] = [];
  const partlyEmptyFields: string[] = [];

  for (const field of ALL_OPTIONAL_FIELDS) {
    const csvHeader = columnMap[field];
    if (!csvHeader) continue; // field not mapped — treat as absent

    if (rowSamples && rowSamples.length > 0) {
      const nonNull = rowSamples.filter((r) => {
        const v = r[csvHeader];
        return v !== null && v !== undefined && String(v).trim() !== '';
      }).length;
      const coverage = nonNull / rowSamples.length;
      rowCoverage[field] = coverage;

      if (coverage >= COVERAGE_THRESHOLD) {
        effectiveFields.push(field);
      } else if (coverage > 0) {
        partlyEmptyFields.push(field);
      }
    } else {
      // No row samples — assume full coverage if the column is mapped
      rowCoverage[field] = 1;
      effectiveFields.push(field);
    }
  }

  return buildReport(effectiveFields, rowCoverage, partlyEmptyFields);
}
