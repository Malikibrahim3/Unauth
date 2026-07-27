import {
  fromMinorUnits,
  minorUnitExponent,
  normaliseCurrencyOrNull,
  toMinorUnits,
} from '@/lib/canonical/money';

/**
 * Merchant-facing vocabulary for the authenticated product.
 *
 * Database names and API names deliberately stay outside this registry. A
 * route can use those names internally, but anything that reaches a merchant
 * should resolve through one of these maps or through `humanise` in
 * `lib/ui/labels.ts`.
 */

export const ENTITY_LABELS = {
  overview: { singular: 'Overview', plural: 'Overview' },
  work: { singular: 'Work', plural: 'Work' },
  case: { singular: 'Case', plural: 'Cases' },
  claim: { singular: 'Claim', plural: 'Claims' },
  chargeback: { singular: 'Chargeback', plural: 'Chargebacks' },
  customer: { singular: 'Customer', plural: 'Customers' },
  order: { singular: 'Order', plural: 'Orders' },
  loss: { singular: 'Loss', plural: 'Losses' },
  recovery: { singular: 'Recovery', plural: 'Recoveries' },
  rule: { singular: 'Rule', plural: 'Rules' },
  flow: { singular: 'Flow', plural: 'Flows' },
  connection: { singular: 'Connection', plural: 'Connections' },
  source: { singular: 'Source', plural: 'Sources' },
  timeline: { singular: 'Case activity', plural: 'Case activity' },
} as const;

export type EntityName = keyof typeof ENTITY_LABELS;

/**
 * These are deliberately separate from `requested`, `exposed`, and other
 * storage/reporting states. They are the six concepts that must never be
 * compressed into one generic "decision" or "outcome" label in product copy.
 */
export const FINANCIAL_STAGE_DEFINITIONS = {
  recommendation: {
    label: 'Recommendation',
    definition: 'A rule- and evidence-based suggestion for the merchant to review.',
  },
  merchant_decision: {
    label: 'Merchant decision',
    definition: 'The action the merchant recorded. It does not execute that action.',
  },
  source_observed_outcome: {
    label: 'Source-observed outcome',
    definition: 'The result reported by a connected commerce or support source.',
  },
  confirmed_loss: {
    label: 'Confirmed loss',
    definition: 'A loss supported by an observed outcome in the selected scope.',
  },
  eligible_recovery: {
    label: 'Eligible recovery',
    definition: 'Confirmed loss with a documented provider route that may still recover value.',
  },
  recovered_cash: {
    label: 'Recovered cash',
    definition: 'Value actually received or credited back to the merchant.',
  },
  requested: {
    label: 'Requested value',
    definition: 'Value requested by the customer or support source.',
  },
  maximum_exposure: {
    label: 'Maximum exposure',
    definition: 'The most the current case could cost if the request were met in full.',
  },
  observed_payout: {
    label: 'Observed payout',
    definition: 'A payout that a connected source confirmed actually happened.',
  },
  estimated_loss: {
    label: 'Estimated loss',
    definition: 'A provisional loss value with visible assumptions.',
  },
  prevented: {
    label: 'Prevented',
    definition: 'Exposure that remained unpaid through the observation window.',
  },
  written_off: {
    label: 'Written off',
    definition: 'Confirmed loss the merchant explicitly closed without recovery.',
  },
  outstanding_recovery: {
    label: 'Outstanding recovery',
    definition: 'Eligible recovery less recovered cash and any written-off balance.',
  },
  final_net_loss: {
    label: 'Final net loss',
    definition: 'Confirmed loss less recovered cash for the same case scope.',
  },
} as const;

export type FinancialStageName = keyof typeof FINANCIAL_STAGE_DEFINITIONS;

export const DATA_STATE_COPY = {
  zero: {
    label: '0',
    description: 'The source confirms there are no records in this scope.',
  },
  unavailable: {
    label: 'Unavailable',
    description: 'This value could not be calculated from the available records.',
  },
  inapplicable: {
    label: '—',
    description: 'This field does not apply to the selected record or scope.',
  },
  loading: {
    label: 'Loading',
    description: 'The requested records are still being loaded.',
  },
  error: {
    label: 'Could not load',
    description: 'We could not load this data. Try again or check the connection.',
  },
  stale: {
    label: 'Stale',
    description: 'The source has not reported a recent update.',
  },
  disconnected: {
    label: 'Not connected',
    description: 'Connect this source before relying on new records from it.',
  },
  unknown_source: {
    label: 'Source not identified',
    description: 'The record does not include enough source information to verify it.',
  },
} as const;

export type DataState = keyof typeof DATA_STATE_COPY;

export const TIME_RANGE_LABELS = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
} as const;

export const PROVIDER_LABELS: Record<string, string> = {
  shopify: 'Shopify',
  gorgias: 'Gorgias',
  zendesk: 'Zendesk',
  shipbob: 'ShipBob',
  ups: 'UPS',
  fedex: 'FedEx',
  dhl: 'DHL',
  royal_mail: 'Royal Mail',
  dpd: 'DPD',
  stripe: 'Stripe',
  loop_returns: 'Loop Returns',
  aftership: 'AfterShip',
  custom: 'Custom source',
  csv: 'CSV import',
};

const COUNT_FORMATTER = new Intl.NumberFormat('en-GB');

export function formatCount(value: number): string {
  return Number.isFinite(value) ? COUNT_FORMATTER.format(value) : DATA_STATE_COPY.unavailable.label;
}

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural;
}

export function countLabel(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${formatCount(count)} ${pluralize(count, singular, plural)}`;
}

export function entityLabel(entity: EntityName, count?: number): string {
  const labels = ENTITY_LABELS[entity];
  return count == null ? labels.singular : count === 1 ? labels.singular : labels.plural;
}

export function financialStageLabel(stage: string | null | undefined): string {
  if (!stage) return DATA_STATE_COPY.unavailable.label;
  return FINANCIAL_STAGE_DEFINITIONS[stage as FinancialStageName]?.label ?? sentenceCase(stage);
}

export function financialStageDefinition(stage: string | null | undefined): string {
  if (!stage) return DATA_STATE_COPY.unavailable.description;
  return FINANCIAL_STAGE_DEFINITIONS[stage as FinancialStageName]?.definition ?? DATA_STATE_COPY.unavailable.description;
}

export function sentenceCase(value: string): string {
  const words = value.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
}

export function providerLabel(value: string | null | undefined): string {
  if (!value) return DATA_STATE_COPY.unknown_source.label;
  const key = value.trim().toLowerCase();
  return PROVIDER_LABELS[key] ?? sentenceCase(value);
}

export function sourceLabel(value: string | null | undefined): string {
  return value ? providerLabel(value) : DATA_STATE_COPY.unknown_source.label;
}

/**
 * Parse a merchant-entered major-unit amount without losing precision. The
 * API continues to receive integer minor units, but the user never needs to
 * know that storage detail.
 */
export function parseMajorUnitInput(
  value: string,
  currency: string | null | undefined,
): number | null {
  const code = normaliseCurrencyOrNull(currency);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!code || !/^-?(?:\d+)(?:\.\d+)?$/.test(trimmed)) return null;

  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [wholePart, fractionPart = ''] = unsigned.split('.');
  const exponent = minorUnitExponent(code);
  const significantFraction = fractionPart.replace(/0+$/, '');
  if (significantFraction.length > exponent) return null;

  const paddedFraction = fractionPart.slice(0, exponent).padEnd(exponent, '0');
  const factor = 10 ** exponent;
  const whole = Number.parseInt(wholePart, 10);
  const fraction = paddedFraction ? Number.parseInt(paddedFraction, 10) : 0;
  const minor = whole * factor + fraction;
  return negative ? -minor : minor;
}

export function formatMajorUnitInput(
  minor: number | null | undefined,
  currency: string | null | undefined,
): string {
  const code = normaliseCurrencyOrNull(currency);
  if (minor == null || !Number.isInteger(minor) || !code) return '';
  return fromMinorUnits(minor, code).toFixed(minorUnitExponent(code));
}

/** Provider-specific copy should preserve brand casing but use sentence case. */
export function sentenceCaseEventTitle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const provider = Object.entries(PROVIDER_LABELS).find(([key]) =>
    new RegExp(`\\b${key.replaceAll('_', '[ _-]')}\\b`, 'i').test(trimmed),
  );
  if (!provider) return sentenceCase(trimmed);
  return trimmed
    .replace(new RegExp(`\\b${provider[0].replaceAll('_', '[ _-]')}\\b`, 'i'), provider[1])
    .replace(/^./, (character) => character.toUpperCase());
}

// Keep the conversion import in the module's public contract. This small
// wrapper makes the API boundary explicit for form code and focused tests.
export function majorToMinor(value: number, currency: string): number {
  return toMinorUnits(value, currency);
}
