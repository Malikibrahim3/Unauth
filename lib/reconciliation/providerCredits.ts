import type { SupabaseClient } from '@supabase/supabase-js';

export type ProviderCreditMatchStatus = 'unmatched' | 'candidate' | 'matched' | 'rejected';
export type ProviderCreditReconciliationStatus =
  | 'unmatched'
  | 'candidate'
  | 'received_unreconciled'
  | 'reconciled'
  | 'dismissed'
  | 'reversed';
export type ProviderCreditTransition = 'candidate' | 'matched' | 'dismissed' | 'reconciled';

export type ProviderCreditInput = {
  provider: string;
  externalCreditId: string;
  externalClaimId?: string | null;
  externalOrderRef?: string | null;
  externalShipmentRef?: string | null;
  creditType?: 'credit' | 'refund' | 'settlement' | 'adjustment' | 'reversal';
  amountMinor: number;
  currency: string;
  occurredAt?: string | null;
  observedAt?: string | null;
  observationAuthority: 'source_observed' | 'receipt_backed_manual';
  evidenceItemId?: string | null;
  sourceRecordId?: string | null;
  recoveryCaseId?: string | null;
  supportPayoutCaseId?: string | null;
  reversesCreditId?: string | null;
  actorUserId?: string | null;
  reason: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

type RpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string; code?: string } | null;
  }>;
};

function rpc(client: SupabaseClient): RpcClient {
  return client as unknown as RpcClient;
}

/** Appends an observed provider credit fact. It has no financial effect until
 * a permitted operator confirms the match in a later transition. */
export async function recordProviderCredit(
  client: SupabaseClient,
  merchantId: string,
  input: ProviderCreditInput,
): Promise<{ credit: Record<string, unknown>; event: Record<string, unknown>; replayed: boolean }> {
  const { data, error } = await rpc(client).rpc('record_provider_credit_v1', {
    p_merchant_id: merchantId,
    p_provider: input.provider,
    p_external_credit_id: input.externalCreditId,
    p_external_claim_id: input.externalClaimId ?? null,
    p_external_order_ref: input.externalOrderRef ?? null,
    p_external_shipment_ref: input.externalShipmentRef ?? null,
    p_credit_type: input.creditType ?? 'credit',
    p_amount_minor: input.amountMinor,
    p_currency: input.currency.toUpperCase(),
    p_occurred_at: input.occurredAt ?? null,
    p_observed_at: input.observedAt ?? new Date().toISOString(),
    p_observation_authority: input.observationAuthority,
    p_evidence_item_id: input.evidenceItemId ?? null,
    p_source_record_id: input.sourceRecordId ?? null,
    p_recovery_case_id: input.recoveryCaseId ?? null,
    p_support_payout_case_id: input.supportPayoutCaseId ?? null,
    p_reverses_credit_id: input.reversesCreditId ?? null,
    p_actor_user_id: input.actorUserId ?? null,
    p_reason: input.reason,
    p_metadata: input.metadata ?? {},
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw new Error(`provider_credit_record_failed: ${error.message}`);
  if (!data || typeof data !== 'object') throw new Error('provider_credit_record_failed: empty response');
  const payload = data as Record<string, unknown>;
  return {
    credit: payload.credit as Record<string, unknown>,
    event: payload.event as Record<string, unknown>,
    replayed: payload.replayed === true,
  };
}

/** Candidate, match, dismiss, and reconcile are distinct append-only events.
 * Matching creates received value; reconciliation is a later transition. */
export async function transitionProviderCredit(
  client: SupabaseClient,
  merchantId: string,
  recoveryCaseId: string,
  creditId: string,
  input: {
    action: ProviderCreditTransition;
    expectedVersion: number;
    matchMethod?: string | null;
    matchConfidence?: number | null;
    actorUserId: string;
    reason: string;
    idempotencyKey: string;
  },
): Promise<{
  credit: Record<string, unknown>;
  recoveryCase: Record<string, unknown>;
  event: Record<string, unknown>;
  replayed: boolean;
}> {
  const { data, error } = await rpc(client).rpc('transition_provider_credit_v1', {
    p_merchant_id: merchantId,
    p_recovery_case_id: recoveryCaseId,
    p_provider_credit_record_id: creditId,
    p_action: input.action,
    p_expected_version: input.expectedVersion,
    p_match_method: input.matchMethod ?? null,
    p_match_confidence: input.matchConfidence ?? null,
    p_actor_user_id: input.actorUserId,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw new Error(`provider_credit_transition_failed: ${error.message}`);
  if (!data || typeof data !== 'object') throw new Error('provider_credit_transition_failed: empty response');
  const payload = data as Record<string, unknown>;
  return {
    credit: payload.credit as Record<string, unknown>,
    recoveryCase: payload.recovery_case as Record<string, unknown>,
    event: payload.event as Record<string, unknown>,
    replayed: payload.replayed === true,
  };
}
