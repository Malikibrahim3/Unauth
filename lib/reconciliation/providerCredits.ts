import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

type UntypedClient = { from: (table: string) => any };

function db(client: SupabaseClient): UntypedClient {
  return client as unknown as UntypedClient;
}

export type ProviderCreditMatchStatus = 'unmatched' | 'candidate' | 'matched' | 'rejected';

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
  evidenceItemId?: string | null;
  sourceRecordId?: string | null;
  matchStatus?: ProviderCreditMatchStatus;
  recoveryCaseId?: string | null;
  supportPayoutCaseId?: string | null;
  matchMethod?: string | null;
  matchConfidence?: number | null;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export async function recordProviderCredit(
  client: SupabaseClient,
  merchantId: string,
  input: ProviderCreditInput,
) {
  const query = db(client);
  const existing = await query
    .from(TABLES.PROVIDER_CREDIT_RECORDS)
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle();
  if (existing.error) throw new Error(`provider_credit_lookup_failed: ${existing.error.message}`);
  if (existing.data) return { credit: existing.data, replayed: true };

  const result = await query
    .from(TABLES.PROVIDER_CREDIT_RECORDS)
    .insert({
      merchant_id: merchantId,
      provider: input.provider,
      external_credit_id: input.externalCreditId,
      external_claim_id: input.externalClaimId ?? null,
      external_order_ref: input.externalOrderRef ?? null,
      external_shipment_ref: input.externalShipmentRef ?? null,
      credit_type: input.creditType ?? 'credit',
      amount_minor: input.amountMinor,
      currency: input.currency.toUpperCase(),
      occurred_at: input.occurredAt ?? null,
      evidence_item_id: input.evidenceItemId ?? null,
      source_record_id: input.sourceRecordId ?? null,
      match_status: input.matchStatus ?? 'unmatched',
      recovery_case_id: input.recoveryCaseId ?? null,
      support_payout_case_id: input.supportPayoutCaseId ?? null,
      match_method: input.matchMethod ?? null,
      match_confidence: input.matchConfidence ?? null,
      idempotency_key: input.idempotencyKey,
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single();
  if (result.error) throw new Error(`provider_credit_insert_failed: ${result.error.message}`);
  return { credit: result.data, replayed: false };
}

export async function matchProviderCredit(
  client: SupabaseClient,
  merchantId: string,
  creditId: string,
  input: {
    matchStatus: ProviderCreditMatchStatus;
    supportPayoutCaseId?: string | null;
    matchMethod?: string | null;
    matchConfidence?: number | null;
    matchedBy?: string | null;
  },
) {
  const query = db(client);
  const existing = await query
    .from(TABLES.PROVIDER_CREDIT_RECORDS)
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('id', creditId)
    .maybeSingle();
  if (existing.error) throw new Error(`provider_credit_read_failed: ${existing.error.message}`);
  if (!existing.data) return null;
  if (existing.data.match_status === 'matched' && input.matchStatus !== 'matched') {
    throw new Error('provider_credit_match_cannot_be_retracted_without_an_adjustment');
  }

  const now = new Date().toISOString();
  const updated = await query
    .from(TABLES.PROVIDER_CREDIT_RECORDS)
    .update({
      match_status: input.matchStatus,
      support_payout_case_id: input.supportPayoutCaseId ?? existing.data.support_payout_case_id ?? null,
      match_method: input.matchMethod ?? existing.data.match_method ?? null,
      match_confidence: input.matchConfidence ?? existing.data.match_confidence ?? null,
      matched_by: input.matchedBy ?? null,
      matched_at: input.matchStatus === 'matched' ? now : null,
      updated_at: now,
    })
    .eq('merchant_id', merchantId)
    .eq('id', creditId)
    .select('*')
    .single();
  if (updated.error) throw new Error(`provider_credit_match_failed: ${updated.error.message}`);

  let financialEntry = null;
  if (input.matchStatus === 'matched' && Number(updated.data.amount_minor) >= 0 && updated.data.support_payout_case_id) {
    const prior = await query
      .from(TABLES.CASE_FINANCIAL_ENTRIES)
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('provider_credit_record_id', creditId)
      .maybeSingle();
    if (prior.error) throw new Error(`provider_credit_entry_lookup_failed: ${prior.error.message}`);
    if (!prior.data) {
      const entry = await query
        .from(TABLES.CASE_FINANCIAL_ENTRIES)
        .insert({
          merchant_id: merchantId,
          support_payout_case_id: updated.data.support_payout_case_id,
          state: 'recovered',
          amount_minor: Number(updated.data.amount_minor),
          currency: String(updated.data.currency).toUpperCase(),
          direction: 'credit',
          effective_at: updated.data.occurred_at ?? now,
          ledger_kind: 'provider_recovery',
          component_type: updated.data.credit_type,
          valuation_basis: 'provider_credit',
          quantity: 1,
          provider_credit_record_id: creditId,
          metadata: { provider_credit_id: creditId },
        })
        .select('*')
        .single();
      if (entry.error) throw new Error(`provider_credit_entry_insert_failed: ${entry.error.message}`);
      financialEntry = entry.data;
    } else {
      financialEntry = prior.data;
    }
  }

  return { credit: updated.data, financialEntry };
}
