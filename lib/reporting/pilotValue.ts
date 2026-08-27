export type PilotValueTermKey =
  | 'prevented'
  | 'received_recovery'
  | 'attributable_time_saved'
  | 'customer_friction_cost'
  | 'implementation_operating_cost';

export type PilotValueTerm = {
  key: PilotValueTermKey;
  label: string;
  amountMinor: number | null;
  currency: string;
  evidence: string | null;
  known: boolean;
};

export type PilotValueReport = {
  currency: string;
  formula: 'prevented + received recovery + attributable time saved - customer friction cost - implementation and operating cost';
  terms: PilotValueTerm[];
  netValueMinor: number | null;
  complete: boolean;
  limitation: string | null;
};

/** Evidence-backed pilot value only. Missing commercial/cost terms make the
 * net unavailable rather than silently treating them as zero. */
export function buildPilotValueReport(input: {
  currency: string;
  preventedMinor: number | null;
  receivedRecoveryMinor: number | null;
  attributableTimeSavedMinor?: number | null;
  customerFrictionCostMinor?: number | null;
  implementationOperatingCostMinor?: number | null;
  evidence?: Partial<Record<PilotValueTermKey, string | null>>;
}): PilotValueReport {
  const currency = input.currency.toUpperCase();
  const term = (key: PilotValueTermKey, label: string, amountMinor: number | null | undefined): PilotValueTerm => ({
    key,
    label,
    amountMinor: Number.isSafeInteger(amountMinor) && (amountMinor ?? -1) >= 0 ? amountMinor! : null,
    currency,
    evidence: input.evidence?.[key] ?? null,
    known: Number.isSafeInteger(amountMinor) && (amountMinor ?? -1) >= 0 && Boolean(input.evidence?.[key]),
  });
  const terms = [
    term('prevented', 'Prevented value', input.preventedMinor),
    term('received_recovery', 'Received recovery', input.receivedRecoveryMinor),
    term('attributable_time_saved', 'Attributable time saved', input.attributableTimeSavedMinor),
    term('customer_friction_cost', 'Customer-friction cost', input.customerFrictionCostMinor),
    term('implementation_operating_cost', 'Implementation and operating cost', input.implementationOperatingCostMinor),
  ];
  const complete = terms.every((item) => item.known);
  const values = Object.fromEntries(terms.map((item) => [item.key, item.amountMinor ?? 0])) as Record<PilotValueTermKey, number>;
  return {
    currency,
    formula: 'prevented + received recovery + attributable time saved - customer friction cost - implementation and operating cost',
    terms,
    netValueMinor: complete
      ? values.prevented + values.received_recovery + values.attributable_time_saved - values.customer_friction_cost - values.implementation_operating_cost
      : null,
    complete,
    limitation: complete ? null : 'Net pilot value is withheld until every positive and negative term has a cited evidence source.',
  };
}
