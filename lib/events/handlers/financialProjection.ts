/**
 * Append-only financial projection.
 *
 * Merchant decisions and observed source outcomes are deliberately separate:
 * authorization can create only `approved`; `paid`/`confirmed_loss` require a
 * source-outcome event; `prevented` requires the matured observation-window
 * event; and recovery approval never creates `recovered` cash.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { projectSummary, type FinancialEntry, type FinancialState } from '@/lib/finance/financialLedger';
import type { DomainEventHandler, DomainEventRecord } from '@/lib/events/handlers/types';

type Direction = 'debit' | 'credit' | 'memo';
type PlannedEntry = {
  state: FinancialState;
  amountMinor: number;
  direction: Direction;
  suffix: string;
};

const APPROVAL_ACTIONS = new Set(['approved', 'partial_refund', 'full_refund', 'refund', 'reship', 'replacement']);
const PAYOUT_ACTIONS = new Set(['refund', 'partial_refund', 'full_refund', 'reship', 'replacement', 'store_credit', 'discount']);
const RECOVERY_ACTIONS = new Set(['recovery', 'recovered', 'credit_received', 'chargeback_won']);

function finiteMinor(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function plannedEntriesForEvent(event: DomainEventRecord): PlannedEntry[] {
  const payload = event.payload ?? {};
  const action = typeof payload.action === 'string' ? payload.action : '';
  const amountMinor = finiteMinor(payload.amount_minor);

  if (event.event_type === 'case.decision_recorded') {
    if (!APPROVAL_ACTIONS.has(action) || amountMinor == null || amountMinor === 0) return [];
    return [{ state: 'approved', amountMinor, direction: 'memo', suffix: 'approved' }];
  }
  if (event.event_type === 'case.outcome_reconciled') {
    if (amountMinor == null || amountMinor === 0) return [];
    if (RECOVERY_ACTIONS.has(action)) {
      return [{ state: 'recovered', amountMinor, direction: 'credit', suffix: 'source-recovered' }];
    }
    if (!PAYOUT_ACTIONS.has(action)) return [];
    const planned: PlannedEntry[] = [
      { state: 'paid', amountMinor, direction: 'debit', suffix: 'paid' },
    ];
    const confirmedLossMinor = finiteMinor(payload.confirmed_loss_minor);
    if (confirmedLossMinor != null && confirmedLossMinor > 0) {
      planned.push({
        state: 'confirmed_loss',
        amountMinor: confirmedLossMinor,
        direction: 'debit',
        suffix: 'confirmed-loss',
      });
    }
    return planned;
  }
  if (event.event_type === 'recovery.completed' && amountMinor != null && amountMinor > 0) {
    return [{ state: 'recovered', amountMinor, direction: 'credit', suffix: 'recovered' }];
  }
  if (event.event_type === 'loss.written_off' && amountMinor != null && amountMinor > 0) {
    return [{ state: 'written_off', amountMinor, direction: 'memo', suffix: 'written-off' }];
  }
  if (event.event_type === 'case.prevention_confirmed' && amountMinor != null && amountMinor > 0) {
    return [{ state: 'prevented', amountMinor, direction: 'memo', suffix: 'prevented' }];
  }
  return [];
}

type PersistedEntry = {
  id: string;
  state: FinancialState;
  amount_minor: number;
  currency: string;
  reverses_entry_id: string | null;
  effective_at: string;
};

async function appendEntry(
  client: SupabaseClient,
  event: DomainEventRecord,
  caseId: string,
  currency: string,
  plan: PlannedEntry,
  options: { reversesEntryId?: string | null; idempotencySuffix?: string; metadata?: Record<string, unknown> } = {},
): Promise<boolean> {
  const idempotencyKey = `${event.id}:${options.idempotencySuffix ?? plan.suffix}`;
  const { data: existing, error: lookupError } = await client
    .from(TABLES.CASE_FINANCIAL_ENTRIES)
    .select('id')
    .eq('merchant_id', event.merchant_id)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (lookupError) throw new Error(`financial_entry_lookup_failed: ${lookupError.message}`);
  if (existing) return false;

  const payload = event.payload ?? {};
  const { error } = await client.from(TABLES.CASE_FINANCIAL_ENTRIES).insert({
    merchant_id: event.merchant_id,
    support_payout_case_id: caseId,
    loss_case_id: typeof payload.loss_case_id === 'string' ? payload.loss_case_id : null,
    recovery_case_id: typeof payload.recovery_case_id === 'string' ? payload.recovery_case_id : null,
    state: plan.state,
    amount_minor: plan.amountMinor,
    currency,
    direction: plan.direction,
    domain_event_id: event.id,
    effective_at: event.occurred_at ?? new Date().toISOString(),
    reverses_entry_id: options.reversesEntryId ?? null,
    idempotency_key: idempotencyKey,
    metadata: {
      event_type: event.event_type,
      decision_id: typeof payload.decision_id === 'string' ? payload.decision_id : null,
      outcome_id: typeof payload.outcome_id === 'string' ? payload.outcome_id : null,
      observation_id: typeof payload.observation_id === 'string' ? payload.observation_id : null,
      source_metadata: payload.source_metadata ?? null,
      ...options.metadata,
    },
  });
  if (error) {
    // A racing retry may win the unique idempotency key after our lookup. Treat
    // that exact conflict as a converged replay; all other failures stay retryable.
    if (error.code === '23505') return false;
    throw new Error(`financial_entry_insert_failed: ${error.message}`);
  }
  return true;
}

async function reverseEntriesForDecision(
  client: SupabaseClient,
  event: DomainEventRecord,
  caseId: string,
): Promise<number> {
  const priorDecisionId = typeof event.payload?.reverses_decision_id === 'string'
    ? event.payload.reverses_decision_id
    : null;
  if (!priorDecisionId) return 0;

  const { data: priorEvents, error: priorEventError } = await client
    .from(TABLES.DOMAIN_EVENTS)
    .select('id,payload')
    .eq('merchant_id', event.merchant_id)
    .eq('event_type', 'case.decision_recorded')
    .contains('payload', { decision_id: priorDecisionId });
  if (priorEventError) throw new Error(`decision_event_lookup_failed: ${priorEventError.message}`);
  const priorEventRows = (priorEvents ?? []) as Array<{ id: string; payload?: Record<string, unknown> }>;
  const priorEventIds = priorEventRows.map((row) => row.id);
  if (priorEventIds.length === 0) throw new Error('decision_reversal_missing_prior_event');

  const { data: originals, error } = await client
    .from(TABLES.CASE_FINANCIAL_ENTRIES)
    .select('id,state,amount_minor,currency,reverses_entry_id,effective_at')
    .eq('merchant_id', event.merchant_id)
    .eq('support_payout_case_id', caseId)
    .eq('state', 'approved')
    .is('reverses_entry_id', null)
    .in('domain_event_id', priorEventIds);
  if (error) throw new Error(`decision_financial_lookup_failed: ${error.message}`);

  if ((originals ?? []).length === 0) {
    const expectedPriorEntry = priorEventRows.some((row) => {
      const action = typeof row.payload?.action === 'string' ? row.payload.action : '';
      const amount = finiteMinor(row.payload?.amount_minor);
      return APPROVAL_ACTIONS.has(action) && amount != null && amount > 0;
    });
    if (expectedPriorEntry) throw new Error('decision_reversal_waiting_for_prior_projection');
    return 0;
  }

  let applied = 0;
  for (const original of (originals ?? []) as PersistedEntry[]) {
    const inserted = await appendEntry(
      client,
      event,
      caseId,
      original.currency,
      { state: original.state, amountMinor: original.amount_minor, direction: 'memo', suffix: 'unused' },
      {
        reversesEntryId: original.id,
        idempotencySuffix: `decision-reversal:${original.id}`,
        metadata: { reverses_decision_id: priorDecisionId },
      },
    );
    if (inserted) applied += 1;
  }
  return applied;
}

async function reverseEntriesForOutcome(
  client: SupabaseClient,
  event: DomainEventRecord,
  caseId: string,
): Promise<number> {
  const priorOutcomeId = typeof event.payload?.reverses_outcome_id === 'string'
    ? event.payload.reverses_outcome_id
    : null;
  if (!priorOutcomeId) throw new Error('outcome_reversal_missing_prior_outcome');

  const { data: priorEvents, error: priorEventError } = await client
    .from(TABLES.DOMAIN_EVENTS)
    .select('id,payload')
    .eq('merchant_id', event.merchant_id)
    .eq('event_type', 'case.outcome_reconciled')
    .contains('payload', { outcome_id: priorOutcomeId });
  if (priorEventError) throw new Error(`outcome_event_lookup_failed: ${priorEventError.message}`);
  const priorEventRows = (priorEvents ?? []) as Array<{ id: string; payload?: Record<string, unknown> }>;
  if (priorEventRows.length === 0) throw new Error('outcome_reversal_missing_prior_event');

  const { data: originals, error } = await client
    .from(TABLES.CASE_FINANCIAL_ENTRIES)
    .select('id,state,amount_minor,currency,reverses_entry_id,effective_at')
    .eq('merchant_id', event.merchant_id)
    .eq('support_payout_case_id', caseId)
    .is('reverses_entry_id', null)
    .in('domain_event_id', priorEventRows.map((row) => row.id))
    .in('state', ['paid', 'confirmed_loss', 'recoverable', 'recovered']);
  if (error) throw new Error(`outcome_financial_lookup_failed: ${error.message}`);

  const originalRows = (originals ?? []) as PersistedEntry[];
  if (originalRows.length === 0) {
    const expectedPriorEntry = priorEventRows.some((row) => {
      const amount = finiteMinor(row.payload?.amount_minor);
      const loss = finiteMinor(row.payload?.confirmed_loss_minor);
      return (amount != null && amount > 0) || (loss != null && loss > 0);
    });
    if (expectedPriorEntry) throw new Error('outcome_reversal_waiting_for_prior_projection');
    return 0;
  }

  const { data: priorReversals, error: reversalError } = await client
    .from(TABLES.CASE_FINANCIAL_ENTRIES)
    .select('reverses_entry_id')
    .eq('merchant_id', event.merchant_id)
    .in('reverses_entry_id', originalRows.map((row) => row.id));
  if (reversalError) throw new Error(`outcome_reversal_lookup_failed: ${reversalError.message}`);
  const reversed = new Set(
    ((priorReversals ?? []) as Array<{ reverses_entry_id: string | null }>)
      .map((row) => row.reverses_entry_id)
      .filter((value): value is string => Boolean(value)),
  );

  let applied = 0;
  for (const original of originalRows) {
    if (reversed.has(original.id)) continue;
    const inserted = await appendEntry(
      client,
      event,
      caseId,
      original.currency,
      { state: original.state, amountMinor: original.amount_minor, direction: original.state === 'recovered' ? 'credit' : original.state === 'recoverable' ? 'memo' : 'debit', suffix: 'unused' },
      {
        reversesEntryId: original.id,
        idempotencySuffix: `outcome-reversal:${original.id}`,
        metadata: { reverses_outcome_id: priorOutcomeId },
      },
    );
    if (inserted) applied += 1;
  }
  return applied;
}

async function reversePreventedEntriesAfterPayout(
  client: SupabaseClient,
  event: DomainEventRecord,
  caseId: string,
  currency: string,
): Promise<number> {
  if (event.event_type !== 'case.outcome_reconciled') return 0;
  if (event.payload?.reversal === true) return 0;
  const action = typeof event.payload?.action === 'string' ? event.payload.action : '';
  if (!PAYOUT_ACTIONS.has(action)) return 0;

  const { data: originals, error } = await client
    .from(TABLES.CASE_FINANCIAL_ENTRIES)
    .select('id,state,amount_minor,currency,reverses_entry_id,effective_at')
    .eq('merchant_id', event.merchant_id)
    .eq('support_payout_case_id', caseId)
    .eq('currency', currency)
    .eq('state', 'prevented')
    .is('reverses_entry_id', null);
  if (error) throw new Error(`prevented_entry_lookup_failed: ${error.message}`);

  const originalRows = (originals ?? []) as PersistedEntry[];
  if (originalRows.length === 0) return 0;
  const { data: priorReversals, error: reversalError } = await client
    .from(TABLES.CASE_FINANCIAL_ENTRIES)
    .select('reverses_entry_id')
    .eq('merchant_id', event.merchant_id)
    .in('reverses_entry_id', originalRows.map((row) => row.id));
  if (reversalError) throw new Error(`prevented_reversal_lookup_failed: ${reversalError.message}`);
  const reversed = new Set(
    ((priorReversals ?? []) as Array<{ reverses_entry_id: string | null }>)
      .map((row) => row.reverses_entry_id)
      .filter((value): value is string => Boolean(value)),
  );

  let applied = 0;
  for (const original of originalRows) {
    if (reversed.has(original.id)) continue;
    const inserted = await appendEntry(
      client,
      event,
      caseId,
      currency,
      { state: 'prevented', amountMinor: original.amount_minor, direction: 'memo', suffix: 'unused' },
      {
        reversesEntryId: original.id,
        idempotencySuffix: `late-payout-prevention-reversal:${original.id}`,
        metadata: { reason: 'later_source_payout_observed' },
      },
    );
    if (inserted) applied += 1;
  }
  return applied;
}

export async function recomputeFinancialSummary(
  client: SupabaseClient,
  merchantId: string,
  caseId: string,
): Promise<void> {
  const { data, error } = await client
    .from(TABLES.CASE_FINANCIAL_ENTRIES)
    .select('id,state,amount_minor,currency,reverses_entry_id,effective_at')
    .eq('merchant_id', merchantId)
    .eq('support_payout_case_id', caseId)
    .order('effective_at', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw new Error(`financial_entries_read_failed: ${error.message}`);

  const entries = ((data as PersistedEntry[] | null) ?? []).map((row) => ({
    id: row.id,
    state: row.state,
    amount_minor: row.amount_minor,
    currency: row.currency,
    reverses_entry_id: row.reverses_entry_id,
    effective_at: row.effective_at,
  })) satisfies FinancialEntry[];
  const summaries = projectSummary(entries);
  const knownStatesByCurrency = new Map<string, Set<string>>();
  for (const entry of entries) {
    const currency = entry.currency.toUpperCase();
    const known = knownStatesByCurrency.get(currency) ?? new Set<string>();
    known.add(entry.state);
    knownStatesByCurrency.set(currency, known);
  }

  for (const [currency, summary] of Object.entries(summaries)) {
    const totals = summary.totals;
    const { error: upsertError } = await client
      .from(TABLES.CASE_FINANCIAL_SUMMARIES)
      .upsert(
        {
          merchant_id: merchantId,
          support_payout_case_id: caseId,
          currency,
          requested_minor: totals.requested,
          exposed_minor: totals.exposed,
          approved_minor: totals.approved,
          paid_minor: totals.paid,
          estimated_loss_minor: totals.estimated_loss,
          confirmed_loss_minor: totals.confirmed_loss,
          recoverable_minor: totals.recoverable,
          recovered_minor: totals.recovered,
          prevented_minor: totals.prevented,
          written_off_minor: totals.written_off,
          known_states: [...(knownStatesByCurrency.get(currency) ?? new Set<string>())].sort(),
          last_event_id: summary.lastEventId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'merchant_id,support_payout_case_id,currency' },
      );
    if (upsertError) throw new Error(`financial_summary_upsert_failed: ${upsertError.message}`);
  }
}

export const financialProjection: DomainEventHandler = async (client, event) => {
  const caseId = event.aggregate_id;
  if (!caseId) return { applied: false, detail: 'no_case' };
  const currency = typeof event.payload?.currency === 'string'
    ? event.payload.currency.toUpperCase()
    : null;
  const planned = plannedEntriesForEvent(event);
  const isDecisionReversal = event.event_type === 'case.decision_recorded' && event.payload?.reversal === true;
  const isOutcomeReversal = event.event_type === 'case.outcome_reconciled' && event.payload?.reversal === true;
  if (planned.length === 0 && !isDecisionReversal && !isOutcomeReversal) return { applied: false, detail: 'no_financial_effect' };
  if (!currency || !/^[A-Z]{3}$/.test(currency)) return { applied: false, detail: 'no_currency' };

  let applied = 0;
  if (isDecisionReversal) {
    applied += await reverseEntriesForDecision(client, event, caseId);
  }
  if (isOutcomeReversal) {
    applied += await reverseEntriesForOutcome(client, event, caseId);
  }
  applied += await reversePreventedEntriesAfterPayout(client, event, caseId, currency);
  if (!isOutcomeReversal) {
    for (const plan of planned) {
      if (await appendEntry(client, event, caseId, currency, plan)) applied += 1;
    }
  }
  if (applied === 0) return { applied: false, detail: 'already_applied' };

  await recomputeFinancialSummary(client, event.merchant_id, caseId);
  return { applied: true, detail: `appended:${applied}` };
};
