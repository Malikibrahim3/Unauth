/**
 * Canonical financial ledger — append-only entries + per-currency summary.
 *
 * `case_financial_entries` is append-only (a DB trigger blocks UPDATE/DELETE).
 * Corrections are made by appending a reversal entry (`reverses_entry_id` set),
 * never by mutating history. `case_financial_summaries` is a projection.
 *
 * This module owns the pure projection reducer (`projectSummary`) plus a thin
 * persistence helper. The reducer is the single source of truth for how a set
 * of ledger entries collapses into per-currency state totals.
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §4.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { normaliseCurrency } from '@/lib/canonical/money';

export const FINANCIAL_STATES = [
  'requested',
  'exposed',
  'approved',
  'paid',
  'estimated_loss',
  'confirmed_loss',
  'recoverable',
  'recovered',
  'prevented',
  'written_off',
] as const;

export type FinancialState = (typeof FINANCIAL_STATES)[number];

export type FinancialEntry = {
  id?: string;
  state: FinancialState;
  amount_minor: number;
  currency: string;
  /** When set, this entry reverses the referenced entry: it subtracts from the state total. */
  reverses_entry_id?: string | null;
  effective_at?: string | null;
};

export type CurrencyStateTotals = Record<FinancialState, number>;

export type FinancialSummary = {
  currency: string;
  totals: CurrencyStateTotals;
  lastEventId: string | null;
};

function zeroTotals(): CurrencyStateTotals {
  return FINANCIAL_STATES.reduce((acc, state) => {
    acc[state] = 0;
    return acc;
  }, {} as CurrencyStateTotals);
}

/**
 * Collapse append-only entries into per-currency state totals.
 *
 * A reversal entry (one carrying `reverses_entry_id`) subtracts its amount from
 * its state total, so `original(+X)` followed by `reversal(-X)` nets to 0 while
 * both rows remain in history. Currencies are never summed together.
 */
export function projectSummary(entries: FinancialEntry[]): Record<string, FinancialSummary> {
  const byCurrency: Record<string, FinancialSummary> = {};

  for (const entry of entries) {
    const currency = normaliseCurrency(entry.currency);
    if (!byCurrency[currency]) {
      byCurrency[currency] = { currency, totals: zeroTotals(), lastEventId: null };
    }
    const sign = entry.reverses_entry_id ? -1 : 1;
    byCurrency[currency].totals[entry.state] += sign * entry.amount_minor;
    if (entry.id) byCurrency[currency].lastEventId = entry.id;
  }

  return byCurrency;
}

/** Append a single ledger entry. History is never mutated. */
export async function appendFinancialEntry(
  client: SupabaseClient,
  merchantId: string,
  entry: FinancialEntry & { support_payout_case_id?: string | null },
) {
  const { data, error } = await client
    .from(TABLES.CASE_FINANCIAL_ENTRIES)
    .insert({
      merchant_id: merchantId,
      support_payout_case_id: entry.support_payout_case_id ?? null,
      state: entry.state,
      amount_minor: entry.amount_minor,
      currency: normaliseCurrency(entry.currency),
      reverses_entry_id: entry.reverses_entry_id ?? null,
      effective_at: entry.effective_at ?? new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
