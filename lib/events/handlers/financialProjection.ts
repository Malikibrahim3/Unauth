/**
 * Financial projection handler. Reacts to case decision events by appending the
 * append-only financial entries the decision implies, then recomputes the
 * `case_financial_summaries` projection for the affected case/currency.
 *
 * Idempotent: entries carry their originating `domain_event_id`, so a replayed
 * delivery detects the existing entry and applies nothing. The summary is a
 * pure re-projection from the full entry set, so recompute is always safe.
 *
 * Mixed currencies are never summed together — the summary is keyed by currency.
 *
 * See ARCHITECTURE.md §6 and §4 (ledger rules).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { projectSummary, type FinancialEntry } from '@/lib/finance/financialLedger';
import type { DomainEventHandler } from '@/lib/events/handlers/types';

/** Decision payloads that produce financial entries and the states they emit. */
type PlannedEntry = { state: string; direction: 'debit' | 'credit' | 'memo' };

function plannedEntriesForEvent(eventType: string, payload: Record<string, unknown>): PlannedEntry[] {
  if (eventType === 'recovery.completed') return [{ state: 'recovered', direction: 'credit' }];
  if (eventType !== 'case.decision_recorded') return [];
  const action = typeof payload.action === 'string' ? payload.action : null;
  switch (action) {
    case 'refund':
    case 'reship':
    case 'replacement':
      // Value approved and paid out.
      return [
        { state: 'approved', direction: 'debit' },
        { state: 'paid', direction: 'debit' },
        { state: 'confirmed_loss', direction: 'debit' },
      ];
    case 'denied':
    case 'deny':
    case 'reject':
      // Prevented leakage — no payout.
      return [{ state: 'prevented', direction: 'memo' }];
    default:
      return [];
  }
}

async function existingEntryStates(
  client: SupabaseClient,
  merchantId: string,
  domainEventId: string,
): Promise<Set<string>> {
  const { data, error } = await client
    .from(TABLES.CASE_FINANCIAL_ENTRIES)
    .select('state')
    .eq('merchant_id', merchantId)
    .eq('domain_event_id', domainEventId);
  if (error) throw new Error(`financial_entry_lookup_failed: ${error.message}`);
  return new Set(((data as Array<{ state: string }> | null) ?? []).map((r) => r.state));
}

export async function recomputeFinancialSummary(
  client: SupabaseClient,
  merchantId: string,
  caseId: string,
): Promise<void> {
  const { data, error } = await client
    .from(TABLES.CASE_FINANCIAL_ENTRIES)
    .select('id, state, amount_minor, currency')
    .eq('merchant_id', merchantId)
    .eq('support_payout_case_id', caseId);
  if (error) throw new Error(`financial_entries_read_failed: ${error.message}`);

  const entries = ((data as Array<{ id: string; state: string; amount_minor: number; currency: string }> | null) ?? []).map(
    (r) => ({ id: r.id, state: r.state, amount_minor: r.amount_minor, currency: r.currency }) as FinancialEntry,
  );
  const summaries = projectSummary(entries);

  for (const [currency, summary] of Object.entries(summaries)) {
    const t = summary.totals;
    await client
      .from(TABLES.CASE_FINANCIAL_SUMMARIES)
      .upsert(
        {
          merchant_id: merchantId,
          support_payout_case_id: caseId,
          currency,
          requested_minor: t.requested,
          exposed_minor: t.exposed,
          approved_minor: t.approved,
          paid_minor: t.paid,
          estimated_loss_minor: t.estimated_loss,
          confirmed_loss_minor: t.confirmed_loss,
          recoverable_minor: t.recoverable,
          recovered_minor: t.recovered,
          prevented_minor: t.prevented,
          written_off_minor: t.written_off,
          // This foreign key targets the ledger entry, not the domain event.
          last_event_id: summary.lastEventId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'merchant_id,support_payout_case_id,currency' },
      );
  }
}

export const financialProjection: DomainEventHandler = async (client, event) => {
  const payload = event.payload ?? {};
  const planned = plannedEntriesForEvent(event.event_type, payload);
  if (planned.length === 0) return { applied: false, detail: 'no_financial_effect' };

  const caseId = event.aggregate_id;
  if (!caseId) return { applied: false, detail: 'no_case' };

  const amountMinor = typeof payload.amount_minor === 'number' ? payload.amount_minor : null;
  const currency = typeof payload.currency === 'string' ? payload.currency : null;
  if (amountMinor == null || !currency) return { applied: false, detail: 'no_amount' };

  const already = await existingEntryStates(client, event.merchant_id, event.id);
  const toInsert = planned.filter((p) => !already.has(p.state));
  if (toInsert.length === 0) return { applied: false, detail: 'already_applied' };

  const effectiveAt = event.occurred_at ?? new Date().toISOString();
  const { error } = await client.from(TABLES.CASE_FINANCIAL_ENTRIES).insert(
    toInsert.map((p) => ({
      merchant_id: event.merchant_id,
      support_payout_case_id: caseId,
      state: p.state,
      amount_minor: amountMinor,
      currency: currency.toUpperCase(),
      direction: p.direction,
      domain_event_id: event.id,
      effective_at: effectiveAt,
    })),
  );
  if (error) throw new Error(`financial_entry_insert_failed: ${error.message}`);

  await recomputeFinancialSummary(client, event.merchant_id, caseId);
  return { applied: true, detail: `appended:${toInsert.map((p) => p.state).join(',')}` };
};
