/**
 * RUN-16 and RUN-21 — one reconciliation source, executable metric contracts.
 *
 * Golden ledger fixtures reconcile to the penny across every consumer scope,
 * unavailable stays distinct from zero, currencies never mix, and the
 * invariants that make the numbers meaningful are enforced rather than assumed.
 */
import {
  FinancialInvariantViolation,
  allMetricDefinitions,
  assertFinancialInvariants,
  metricDefinition,
  positionFromSummaryRow,
  reconcile,
  type CaseFinancialPosition,
  type MetricKey,
  type MetricValue,
} from '@/lib/financial/contract';

const SCOPE = { currency: 'GBP', from: '2026-07-01T00:00:00.000Z', to: '2026-07-31T23:59:59.999Z' };

function position(overrides: Partial<CaseFinancialPosition>): CaseFinancialPosition {
  return {
    supportPayoutCaseId: 'case-1',
    currency: 'GBP',
    requestedMinor: null,
    exposedMinor: null,
    paidMinor: null,
    estimatedLossMinor: null,
    confirmedLossMinor: null,
    recoverableMinor: null,
    recoveredMinor: null,
    writtenOffMinor: null,
    knownStates: [],
    occurredAt: '2026-07-15T12:00:00.000Z',
    ...overrides,
  };
}

/** A golden ledger: three cases at different lifecycle stages. */
const GOLDEN: CaseFinancialPosition[] = [
  position({
    supportPayoutCaseId: 'case-recovered',
    requestedMinor: 5500,
    exposedMinor: 5500,
    paidMinor: 5500,
    confirmedLossMinor: 5500,
    recoverableMinor: 5500,
    recoveredMinor: 4000,
    knownStates: ['requested', 'exposed', 'paid', 'confirmed_loss', 'recoverable', 'recovered'],
  }),
  position({
    supportPayoutCaseId: 'case-open',
    requestedMinor: 10000,
    exposedMinor: 10000,
    knownStates: ['requested', 'exposed'],
  }),
  position({
    supportPayoutCaseId: 'case-written-off',
    requestedMinor: 2500,
    exposedMinor: 2500,
    paidMinor: 2500,
    confirmedLossMinor: 2500,
    writtenOffMinor: 2500,
    knownStates: ['requested', 'exposed', 'paid', 'confirmed_loss', 'written_off'],
  }),
];

describe('RUN-21 metric definitions', () => {
  it('declares a formula, inclusion, date field and timezone for every metric', () => {
    for (const definition of allMetricDefinitions()) {
      expect(definition.formula.length).toBeGreaterThan(20);
      expect(definition.includesStages.length).toBeGreaterThan(0);
      expect(definition.dateField).toBe('occurredAt');
      expect(definition.timezone).toBe('Europe/London');
    }
  });

  it('keeps the six lifecycle stages distinct', () => {
    const keys = allMetricDefinitions().map((definition) => definition.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(metricDefinition('eligible_recovery').formula).toMatch(/subset of confirmed loss/i);
    expect(metricDefinition('recovered_cash').formula).toMatch(/Approval is not cash/i);
  });
});

describe('RUN-16 reconciliation', () => {
  const metrics = reconcile(GOLDEN, SCOPE);

  it('reconciles the golden ledger to the penny', () => {
    expect(metrics.requested_value.minor).toBe(18000);
    expect(metrics.maximum_exposure.minor).toBe(18000);
    expect(metrics.observed_payout.minor).toBe(8000);
    expect(metrics.confirmed_loss.minor).toBe(8000);
    expect(metrics.eligible_recovery.minor).toBe(5500);
    expect(metrics.recovered_cash.minor).toBe(4000);
    expect(metrics.written_off.minor).toBe(2500);
  });

  it('produces the identical result for every consumer of the same scope', () => {
    // Case detail, the ledger, Recovery and Reports all call this one function;
    // the property under test is that repetition cannot drift.
    const again = reconcile([...GOLDEN].reverse(), SCOPE);
    for (const key of Object.keys(metrics) as MetricKey[]) {
      expect(again[key].minor).toBe(metrics[key].minor);
      expect(again[key].caseCount).toBe(metrics[key].caseCount);
    }
  });

  it('reports an unobserved stage as unavailable rather than zero', () => {
    const openOnly = reconcile([GOLDEN[1]], SCOPE);
    expect(openOnly.requested_value.minor).toBe(10000);
    expect(openOnly.confirmed_loss.minor).toBeNull();
    expect(openOnly.recovered_cash.minor).toBeNull();
  });

  it('reports an observed zero as zero', () => {
    const knownZero = reconcile(
      [position({ confirmedLossMinor: 0, knownStates: ['confirmed_loss'] })],
      SCOPE,
    );
    expect(knownZero.confirmed_loss.minor).toBe(0);
  });

  it('excludes another currency rather than mixing it into the total', () => {
    const mixed = reconcile(
      [
        position({ requestedMinor: 1000, knownStates: ['requested'] }),
        position({ supportPayoutCaseId: 'eur', currency: 'EUR', requestedMinor: 9999, knownStates: ['requested'] }),
      ],
      SCOPE,
    );
    expect(mixed.requested_value.minor).toBe(1000);
    expect(mixed.requested_value.caseCount).toBe(1);
  });

  it('excludes positions outside the scoped range', () => {
    const outside = reconcile(
      [position({ requestedMinor: 4242, knownStates: ['requested'], occurredAt: '2026-06-15T12:00:00.000Z' })],
      SCOPE,
    );
    expect(outside.requested_value.minor).toBeNull();
  });

  it('maps a financial summary row onto a position', () => {
    const mapped = positionFromSummaryRow({
      support_payout_case_id: 'case-1',
      currency: 'gbp',
      requested_minor: '5500',
      known_states: ['requested'],
      updated_at: '2026-07-15T12:00:00.000Z',
    });
    expect(mapped?.currency).toBe('GBP');
    expect(mapped?.requestedMinor).toBe(5500);
  });

  it('refuses to treat a row without a currency as reportable money', () => {
    expect(positionFromSummaryRow({ support_payout_case_id: 'case-1', currency: null })).toBeNull();
  });
});

describe('RUN-21 financial invariants', () => {
  function metrics(overrides: Partial<Record<MetricKey, number | null>>): Record<MetricKey, MetricValue> {
    const base = {} as Record<MetricKey, MetricValue>;
    for (const definition of allMetricDefinitions()) {
      base[definition.key] = {
        key: definition.key,
        minor: overrides[definition.key] ?? null,
        currency: 'GBP',
        caseCount: 1,
      };
    }
    return base;
  }

  it('rejects eligible recovery above confirmed loss', () => {
    // The audited contradiction: "Recoverable £1,105.41" beside a confirmed
    // loss of £163.28.
    expect(() => assertFinancialInvariants(metrics({ eligible_recovery: 110541, confirmed_loss: 16328 }))).toThrow(
      FinancialInvariantViolation,
    );
  });

  it('accepts eligible recovery equal to confirmed loss', () => {
    expect(() => assertFinancialInvariants(metrics({ eligible_recovery: 5000, confirmed_loss: 5000 }))).not.toThrow();
  });

  it('rejects recovered cash above eligible recovery', () => {
    expect(() =>
      assertFinancialInvariants(metrics({ recovered_cash: 6000, eligible_recovery: 5000, confirmed_loss: 5000 })),
    ).toThrow(FinancialInvariantViolation);
  });

  it('rejects an observed payout above maximum exposure', () => {
    expect(() => assertFinancialInvariants(metrics({ observed_payout: 9000, maximum_exposure: 5000 }))).toThrow(
      FinancialInvariantViolation,
    );
  });

  it('rejects fractional minor units', () => {
    expect(() => assertFinancialInvariants(metrics({ confirmed_loss: 1234.5 }))).toThrow(
      /integer minor units/,
    );
  });

  it('does not fire when a metric is unavailable', () => {
    expect(() => assertFinancialInvariants(metrics({ confirmed_loss: null, eligible_recovery: 5000 }))).not.toThrow();
  });
});
