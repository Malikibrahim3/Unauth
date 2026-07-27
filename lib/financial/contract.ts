/**
 * The executable financial contract (RUN-16 and RUN-21).
 *
 * Every consumer — case detail, the loss ledger, Recovery, and Reports — used
 * to describe the same money with its own arithmetic and its own date field.
 * That is how "Recoverable £1,105.41" came to sit beside a confirmed loss of
 * £163.28: two answers to one question, neither wrong on its own terms.
 *
 * This module is the single source. Each metric declares its formula, the
 * lifecycle stages it includes, the date field that scopes it, and the fact
 * that it is expressed in integer minor units of one currency. Queries and UI
 * definitions both read these definitions rather than restating them.
 */

/** The six distinct stages the product must never conflate. */
export const FINANCIAL_STAGES = [
  'requested',
  'exposed',
  'paid',
  'confirmed_loss',
  'recoverable',
  'recovered',
] as const;
export type FinancialStage = (typeof FINANCIAL_STAGES)[number];

/**
 * One case's financial position, in integer minor units of a single currency.
 * A null stage means "not observed", which is not the same as zero.
 */
export type CaseFinancialPosition = {
  supportPayoutCaseId: string;
  currency: string;
  requestedMinor: number | null;
  exposedMinor: number | null;
  paidMinor: number | null;
  estimatedLossMinor: number | null;
  confirmedLossMinor: number | null;
  recoverableMinor: number | null;
  recoveredMinor: number | null;
  writtenOffMinor: number | null;
  /** Stages actually observed for this case; drives inclusion. */
  knownStates: string[];
  /** The date this position is scoped by, per `MetricDefinition.dateField`. */
  occurredAt: string;
};

export type MetricKey =
  | 'requested_value'
  | 'maximum_exposure'
  | 'observed_payout'
  | 'confirmed_loss'
  | 'eligible_recovery'
  | 'recovered_cash'
  | 'written_off';

export type MetricDefinition = {
  key: MetricKey;
  /** Merchant-facing name. */
  label: string;
  /** Human-readable formula, shown in the definitions disclosure. */
  formula: string;
  /** Positions are included only when they have observed one of these stages. */
  includesStages: readonly string[];
  /** The field that decides whether a position falls inside the range. */
  dateField: 'occurredAt';
  /** Reported in the merchant's timezone. */
  timezone: string;
  select: (position: CaseFinancialPosition) => number | null;
};

const DEFINITIONS: Record<MetricKey, MetricDefinition> = {
  requested_value: {
    key: 'requested_value',
    label: 'Requested value',
    formula: 'Sum of what customers asked for, across cases with a recorded request.',
    includesStages: ['requested'],
    dateField: 'occurredAt',
    timezone: 'Europe/London',
    select: (position) => position.requestedMinor,
  },
  maximum_exposure: {
    key: 'maximum_exposure',
    label: 'Maximum exposure',
    formula: 'Sum of the most each open case could cost if every request were met in full.',
    includesStages: ['exposed'],
    dateField: 'occurredAt',
    timezone: 'Europe/London',
    select: (position) => position.exposedMinor,
  },
  observed_payout: {
    key: 'observed_payout',
    label: 'Observed payout',
    formula: 'Sum of payouts a source system confirmed actually happened.',
    includesStages: ['paid'],
    dateField: 'occurredAt',
    timezone: 'Europe/London',
    select: (position) => position.paidMinor,
  },
  confirmed_loss: {
    key: 'confirmed_loss',
    label: 'Confirmed loss',
    formula: 'Sum of losses confirmed by an observed outcome. Estimates are excluded.',
    includesStages: ['confirmed_loss'],
    dateField: 'occurredAt',
    timezone: 'Europe/London',
    select: (position) => position.confirmedLossMinor,
  },
  eligible_recovery: {
    key: 'eligible_recovery',
    label: 'Eligible recovery',
    formula:
      'Sum of confirmed loss that a provider route may still recover. A subset of confirmed loss, never larger.',
    includesStages: ['recoverable'],
    dateField: 'occurredAt',
    timezone: 'Europe/London',
    select: (position) => position.recoverableMinor,
  },
  recovered_cash: {
    key: 'recovered_cash',
    label: 'Recovered cash',
    formula: 'Sum of credits actually received. Approval is not cash.',
    includesStages: ['recovered'],
    dateField: 'occurredAt',
    timezone: 'Europe/London',
    select: (position) => position.recoveredMinor,
  },
  written_off: {
    key: 'written_off',
    label: 'Written off',
    formula: 'Sum of confirmed loss the merchant has decided not to pursue.',
    includesStages: ['written_off'],
    dateField: 'occurredAt',
    timezone: 'Europe/London',
    select: (position) => position.writtenOffMinor,
  },
};

export function metricDefinition(key: MetricKey): MetricDefinition {
  return DEFINITIONS[key];
}

export function allMetricDefinitions(): MetricDefinition[] {
  return Object.values(DEFINITIONS);
}

export type MetricValue = {
  key: MetricKey;
  /** Null means "not observed in this scope", which is not zero. */
  minor: number | null;
  currency: string;
  caseCount: number;
};

export type ReconciliationScope = {
  currency: string;
  from: string;
  to: string;
  timezone?: string;
};

export class FinancialInvariantViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FinancialInvariantViolation';
  }
}

function withinRange(position: CaseFinancialPosition, scope: ReconciliationScope): boolean {
  const at = Date.parse(position.occurredAt);
  return at >= Date.parse(scope.from) && at <= Date.parse(scope.to);
}

/**
 * The single reconciliation entry point. Every consumer that shows one of these
 * numbers computes it here, so the same scope always yields the same value to
 * the penny.
 *
 * Positions in another currency are excluded rather than mixed: a single total
 * spanning two currencies is not a number, it is a mistake.
 */
export function reconcile(
  positions: CaseFinancialPosition[],
  scope: ReconciliationScope,
): Record<MetricKey, MetricValue> {
  const inScope = positions.filter(
    (position) => position.currency === scope.currency && withinRange(position, scope),
  );

  const result = {} as Record<MetricKey, MetricValue>;
  for (const definition of allMetricDefinitions()) {
    const contributing = inScope.filter((position) =>
      definition.includesStages.some((stage) => position.knownStates.includes(stage)),
    );
    const observed = contributing
      .map((position) => definition.select(position))
      .filter((value): value is number => value !== null);

    result[definition.key] = {
      key: definition.key,
      // No contributing position means the metric was not observed in this
      // scope. Reporting zero would assert a fact nobody established.
      minor: observed.length === 0 ? null : observed.reduce((total, value) => total + value, 0),
      currency: scope.currency,
      caseCount: contributing.length,
    };
  }

  assertFinancialInvariants(result);
  return result;
}

/**
 * RUN-21: the invariants that make the numbers mean what they say.
 */
export function assertFinancialInvariants(metrics: Record<MetricKey, MetricValue>): void {
  const eligible = metrics.eligible_recovery.minor;
  const confirmed = metrics.confirmed_loss.minor;
  if (eligible !== null && confirmed !== null && eligible > confirmed) {
    throw new FinancialInvariantViolation(
      `Eligible recovery (${eligible}) exceeds confirmed loss (${confirmed}) for the same scope; eligible recovery is a subset of confirmed loss.`,
    );
  }

  const recovered = metrics.recovered_cash.minor;
  if (recovered !== null && eligible !== null && recovered > eligible) {
    throw new FinancialInvariantViolation(
      `Recovered cash (${recovered}) exceeds eligible recovery (${eligible}); cash cannot exceed what was eligible to pursue.`,
    );
  }

  const paid = metrics.observed_payout.minor;
  const exposure = metrics.maximum_exposure.minor;
  if (paid !== null && exposure !== null && paid > exposure) {
    throw new FinancialInvariantViolation(
      `Observed payout (${paid}) exceeds maximum exposure (${exposure}); a payout cannot exceed the exposure that bounded it.`,
    );
  }

  for (const value of Object.values(metrics)) {
    if (value.minor !== null && !Number.isInteger(value.minor)) {
      throw new FinancialInvariantViolation(
        `${value.key} is ${value.minor}; money is carried in integer minor units.`,
      );
    }
  }
}

/** Maps a `case_financial_summaries` row onto the contract's position shape. */
export function positionFromSummaryRow(row: {
  support_payout_case_id: string;
  currency: string | null;
  requested_minor?: number | string | null;
  exposed_minor?: number | string | null;
  paid_minor?: number | string | null;
  estimated_loss_minor?: number | string | null;
  confirmed_loss_minor?: number | string | null;
  recoverable_minor?: number | string | null;
  recovered_minor?: number | string | null;
  written_off_minor?: number | string | null;
  known_states?: string[] | null;
  updated_at?: string | null;
}): CaseFinancialPosition | null {
  // RUN-09: a position without a currency is not reportable money.
  if (!row.currency) return null;
  const int = (value: number | string | null | undefined): number | null => {
    if (value === null || value === undefined) return null;
    const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : value;
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    supportPayoutCaseId: row.support_payout_case_id,
    currency: row.currency.toUpperCase(),
    requestedMinor: int(row.requested_minor),
    exposedMinor: int(row.exposed_minor),
    paidMinor: int(row.paid_minor),
    estimatedLossMinor: int(row.estimated_loss_minor),
    confirmedLossMinor: int(row.confirmed_loss_minor),
    recoverableMinor: int(row.recoverable_minor),
    recoveredMinor: int(row.recovered_minor),
    writtenOffMinor: int(row.written_off_minor),
    knownStates: row.known_states ?? [],
    occurredAt: row.updated_at ?? new Date(0).toISOString(),
  };
}
