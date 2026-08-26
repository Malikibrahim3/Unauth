import type { SupabaseClient } from '@supabase/supabase-js';

export const CANONICAL_FINANCIAL_DEFINITION_VERSION = 'mr4-financial-v1';

export type CanonicalCurrencyAggregate = {
  currency: string;
  caseCount: number;
  knownStates: string[];
  caseCountsByState: Record<string, number>;
  requestedMinor: number;
  exposedMinor: number;
  approvedMinor: number;
  paidMinor: number;
  estimatedLossMinor: number;
  preventedMinor: number;
  confirmedLossMinor: number;
  recoverableMinor: number;
  recoveredMinor: number;
  writtenOffMinor: number;
  outstandingMinor: number;
  finalNetLossMinor: number;
};

export type CanonicalFinancialAggregate = {
  currencies: CanonicalCurrencyAggregate[];
  from: string | null;
  to: string | null;
  currencyFilter: string | null;
  definitionVersion: typeof CANONICAL_FINANCIAL_DEFINITION_VERSION;
  timeBasis: 'case_submitted_at';
  mixedCurrencyPolicy: 'separated';
  unknownPolicy: 'withheld_not_zero';
  source: 'canonical' | 'unavailable';
  limitation: string | null;
};

function integer(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}
function parseCurrencyRow(value: unknown): CanonicalCurrencyAggregate | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const currency = typeof row.currency === 'string' ? row.currency.toUpperCase() : '';
  if (!/^[A-Z]{3}$/.test(currency)) return null;
  const caseCounts = row.case_counts_by_state && typeof row.case_counts_by_state === 'object'
    ? Object.fromEntries(Object.entries(row.case_counts_by_state as Record<string, unknown>).map(([key, count]) => [key, integer(count)]))
    : {};
  return {
    currency,
    caseCount: integer(row.case_count),
    knownStates: Array.isArray(row.known_states) ? row.known_states.map(String).sort() : [],
    caseCountsByState: caseCounts,
    requestedMinor: integer(row.requested_minor),
    exposedMinor: integer(row.exposed_minor),
    approvedMinor: integer(row.approved_minor),
    paidMinor: integer(row.paid_minor),
    estimatedLossMinor: integer(row.estimated_loss_minor),
    preventedMinor: integer(row.prevented_minor),
    confirmedLossMinor: integer(row.confirmed_loss_minor),
    recoverableMinor: integer(row.recoverable_minor),
    recoveredMinor: integer(row.recovered_minor),
    writtenOffMinor: integer(row.written_off_minor),
    outstandingMinor: integer(row.outstanding_minor),
    finalNetLossMinor: integer(row.final_net_loss_minor),
  };
}

/**
 * One database-owned aggregate supplies Overview, Losses, Recovery,
 * Reconciliation, Reports, and exports. Missing MR4 schema is an unavailable
 * aggregate, never a zero-valued one.
 */
export async function loadCanonicalFinancialAggregate(
  client: SupabaseClient | { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> },
  merchantId: string,
  input: { from?: string | null; to?: string | null; currency?: string | null } = {},
): Promise<CanonicalFinancialAggregate> {
  const rpcClient = client as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  const currency = input.currency && /^[A-Za-z]{3}$/.test(input.currency) ? input.currency.toUpperCase() : null;
  const result = await rpcClient.rpc('financial_aggregate_v1', {
    p_merchant_id: merchantId,
    p_from: input.from ?? null,
    p_to: input.to ?? null,
    p_currency: currency,
  });
  if (result.error || !result.data || typeof result.data !== 'object') {
    return {
      currencies: [],
      from: input.from ?? null,
      to: input.to ?? null,
      currencyFilter: currency,
      definitionVersion: CANONICAL_FINANCIAL_DEFINITION_VERSION,
      timeBasis: 'case_submitted_at',
      mixedCurrencyPolicy: 'separated',
      unknownPolicy: 'withheld_not_zero',
      source: 'unavailable',
      limitation: result.error?.message ?? 'Canonical financial aggregate is unavailable.',
    };
  }
  const payload = result.data as Record<string, unknown>;
  return {
    currencies: (Array.isArray(payload.currencies) ? payload.currencies : [])
      .map(parseCurrencyRow)
      .filter((row): row is CanonicalCurrencyAggregate => row != null),
    from: typeof payload.from === 'string' ? payload.from : input.from ?? null,
    to: typeof payload.to === 'string' ? payload.to : input.to ?? null,
    currencyFilter: typeof payload.currency_filter === 'string' ? payload.currency_filter : currency,
    definitionVersion: CANONICAL_FINANCIAL_DEFINITION_VERSION,
    timeBasis: 'case_submitted_at',
    mixedCurrencyPolicy: 'separated',
    unknownPolicy: 'withheld_not_zero',
    source: 'canonical',
    limitation: null,
  };
}
