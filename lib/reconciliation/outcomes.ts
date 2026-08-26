import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

type UntypedClient = { from: (table: string) => any };

function db(client: SupabaseClient): UntypedClient {
  return client as unknown as UntypedClient;
}

export const CASE_OUTCOME_TYPES = [
  'cash_refund',
  'replacement',
  'store_credit',
  'goodwill_discount',
  'no_payout',
  'other_manual_concession',
] as const;
export type CaseOutcomeType = (typeof CASE_OUTCOME_TYPES)[number];

export const CASE_OUTCOME_STATES = [
  'reported',
  'observed_pending',
  'observed_success',
  'observed_failed',
  'reversed',
  'merchant_confirmed',
] as const;
export type CaseOutcomeState = (typeof CASE_OUTCOME_STATES)[number];

export type RecordCaseOutcomeInput = {
  caseClaimedItemId?: string | null;
  outcomeType: CaseOutcomeType;
  state: CaseOutcomeState;
  sourceSystem: string;
  sourceRecordId?: string | null;
  sourceExternalId?: string | null;
  correlationMethod?: string | null;
  matchStatus?: 'unmatched' | 'candidate' | 'matched' | 'rejected';
  amountMinor?: number | null;
  retailValueMinor?: number | null;
  currency?: string | null;
  occurredAt?: string | null;
  recommendedSnapshotId?: string | null;
  followedRecommendation?: boolean | null;
  overrideReason?: string | null;
  actorUserId?: string | null;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export type MerchantRecordedOutcomeEvidence = Pick<
  RecordCaseOutcomeInput,
  'state' | 'sourceSystem' | 'sourceRecordId' | 'sourceExternalId' | 'correlationMethod' | 'overrideReason'
>;

/**
 * The authenticated merchant route may record an unverified report or a
 * receipt-backed completion. Provider-observed states are reserved for source
 * ingestion so a browser request cannot manufacture a provider result.
 */
export function validateMerchantRecordedOutcomeEvidence(
  input: MerchantRecordedOutcomeEvidence,
): string | null {
  if (input.state !== 'reported' && input.state !== 'merchant_confirmed') {
    return 'Source-observed, failed, reversed, and pending states must come from the canonical source-ingestion lifecycle.';
  }
  if (!input.overrideReason?.trim()) {
    return 'An evidence note is required for a merchant-recorded external outcome.';
  }
  if (input.state === 'merchant_confirmed') {
    if (!input.sourceRecordId?.trim() && !input.sourceExternalId?.trim()) {
      return 'A receipt or provider reference is required before recording a completed external outcome.';
    }
    if (input.correlationMethod !== 'receipt_backed_manual_record') {
      return 'Receipt-backed completion must use the receipt_backed_manual_record correlation method.';
    }
  }
  return null;
}

function outcomeIsRealised(input: RecordCaseOutcomeInput): boolean {
  return input.state === 'observed_success' || input.state === 'merchant_confirmed';
}

/**
 * Records an observed/merchant-confirmed customer outcome and, only when the
 * outcome is realised, a separate customer-concession ledger entry. The
 * function never creates a merchant-economic-loss entry: that requires a
 * cost basis and a separate responsibility assessment.
 */
export async function recordCaseOutcome(
  client: SupabaseClient,
  merchantId: string,
  caseId: string,
  input: RecordCaseOutcomeInput,
) {
  const query = db(client);
  const existing = await query
    .from(TABLES.CASE_OUTCOME_EVENTS)
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle();
  if (existing.error) throw new Error(`case_outcome_lookup_failed: ${existing.error.message}`);
  if (existing.data) return { outcome: existing.data, financialEntry: null, replayed: true };

  const outcomeResult = await query
    .from(TABLES.CASE_OUTCOME_EVENTS)
    .insert({
      merchant_id: merchantId,
      support_payout_case_id: caseId,
      case_claimed_item_id: input.caseClaimedItemId ?? null,
      outcome_type: input.outcomeType,
      state: input.state,
      source_system: input.sourceSystem,
      source_record_id: input.sourceRecordId ?? null,
      source_external_id: input.sourceExternalId ?? null,
      correlation_method: input.correlationMethod ?? null,
      match_status: input.matchStatus ?? 'matched',
      amount_minor: input.amountMinor ?? null,
      retail_value_minor: input.retailValueMinor ?? null,
      currency: input.currency?.toUpperCase() ?? null,
      occurred_at: input.occurredAt ?? null,
      recommended_snapshot_id: input.recommendedSnapshotId ?? null,
      followed_recommendation: input.followedRecommendation ?? null,
      override_reason: input.overrideReason ?? null,
      actor_user_id: input.actorUserId ?? null,
      idempotency_key: input.idempotencyKey,
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single();
  if (outcomeResult.error) throw new Error(`case_outcome_insert_failed: ${outcomeResult.error.message}`);

  let financialEntry: Record<string, unknown> | null = null;
  const amountMinor = input.amountMinor ?? input.retailValueMinor ?? null;
  if (outcomeIsRealised(input) && amountMinor != null && amountMinor >= 0 && input.currency) {
    const entryResult = await query
      .from(TABLES.CASE_FINANCIAL_ENTRIES)
      .insert({
        merchant_id: merchantId,
        support_payout_case_id: caseId,
        state: input.outcomeType === 'no_payout' ? 'prevented' : 'paid',
        amount_minor: amountMinor,
        currency: input.currency.toUpperCase(),
        direction: input.outcomeType === 'no_payout' ? 'memo' : 'debit',
        effective_at: input.occurredAt ?? new Date().toISOString(),
        ledger_kind: 'customer_concession',
        component_type: input.outcomeType,
        valuation_basis: input.amountMinor != null ? 'payout_value' : 'retail_value',
        quantity: 1,
        case_outcome_event_id: outcomeResult.data.id,
        metadata: {
          reconciliation_outcome_id: outcomeResult.data.id,
          idempotency_key: `${input.idempotencyKey}:customer-concession`,
        },
      })
      .select('*')
      .single();
    if (entryResult.error) throw new Error(`case_outcome_financial_entry_failed: ${entryResult.error.message}`);
    financialEntry = entryResult.data;
  }

  return { outcome: outcomeResult.data, financialEntry, replayed: false };
}
