type FinancialEntryEvidence = {
  amount_minor?: unknown;
  case_outcome_event_id?: unknown;
  currency?: unknown;
  provider_credit_record_id?: unknown;
  source_record_id?: unknown;
  state?: unknown;
};

type FinancialAuthorityContext = {
  merchantDecisionRecorded?: boolean;
};

function present(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function positiveAmount(value: unknown): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

/**
 * A financial entry can prove that an internal stage exists without proving a
 * provider-side money movement. Paid and recovered stages therefore need an
 * explicit source/outcome link and a positive value before the UI may call
 * them known.
 */
export function financialEntryStateIsKnown(
  entry: FinancialEntryEvidence,
  context: FinancialAuthorityContext = {},
): boolean {
  const state = String(entry.state ?? '').trim();
  if (!state) return false;

  if (state === 'approved' && context.merchantDecisionRecorded === false) {
    return false;
  }

  if (state === 'paid') {
    return positiveAmount(entry.amount_minor)
      && (present(entry.case_outcome_event_id) || present(entry.source_record_id));
  }

  if (state === 'recovered') {
    return positiveAmount(entry.amount_minor)
      && (present(entry.provider_credit_record_id) || present(entry.source_record_id));
  }

  return true;
}

export function trustedFinancialStatesByCurrency(
  entries: FinancialEntryEvidence[],
  context: FinancialAuthorityContext = {},
): Record<string, string[]> {
  const statesByCurrency = new Map<string, Set<string>>();

  for (const entry of entries) {
    if (!financialEntryStateIsKnown(entry, context)) continue;
    const currency = String(entry.currency ?? '').trim().toUpperCase();
    const state = String(entry.state ?? '').trim();
    if (!currency || !state) continue;
    const states = statesByCurrency.get(currency) ?? new Set<string>();
    states.add(state);
    statesByCurrency.set(currency, states);
  }

  return Object.fromEntries(
    [...statesByCurrency.entries()].map(([currency, states]) => [
      currency,
      [...states].sort(),
    ]),
  );
}
