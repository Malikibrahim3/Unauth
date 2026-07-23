/**
 * Manual support-payout-case creation.
 *
 * A merchant with no connected commerce/helpdesk source can still create and
 * work a complete case. Order-reference resolution is explicit:
 *   - exactly one matching order  -> confirmed link (source_order_id + confirmed relationship);
 *   - multiple matches            -> ambiguous (unanchored; match candidates recorded);
 *   - none                        -> keep manual_reference (no fake order).
 *
 * See ARCHITECTURE.md §7.4.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { TABLES } from '@/lib/supabase/tables';

export const CLAIM_TYPES = ['item_not_received', 'damaged', 'wrong_item', 'not_as_described', 'refund_request', 'chargeback', 'return_abuse', 'other'] as const;
export const REQUESTED_ACTIONS = ['refund', 'reship', 'replacement', 'discount', 'store_credit', 'return_label', 'investigation', 'escalation', 'unknown'] as const;
export const RECOVERABILITY = ['recoverable', 'possibly_recoverable', 'not_recoverable', 'needs_more_evidence', 'unknown'] as const;

export const manualCaseSchema = z.object({
  orderReference: z.string().trim().min(1).optional(),
  customerEmail: z.string().trim().email().optional(),
  customerName: z.string().trim().min(1).optional(),
  issueType: z.enum(CLAIM_TYPES).default('other'),
  requestedAction: z.enum(REQUESTED_ACTIONS).default('unknown'),
  amountMinor: z.number().int().nonnegative().optional(),
  currency: z.string().trim().length(3).optional(),
  sourceUrl: z.string().url().optional(),
  recoverability: z.enum(RECOVERABILITY).default('unknown'),
  ownerUserId: z.string().uuid().optional(),
  note: z.string().trim().optional(),
});
export type ManualCaseInput = z.input<typeof manualCaseSchema>;

export type OrderResolution =
  | { status: 'confirmed'; sourceOrderId: string }
  | { status: 'ambiguous'; candidateIds: string[] }
  | { status: 'none' };

export async function resolveOrderReference(
  client: SupabaseClient,
  merchantId: string,
  ref: string,
): Promise<OrderResolution> {
  const ids = new Set<string>();
  for (const column of ['external_id', 'order_number']) {
    const { data, error } = await client
      .from(TABLES.SOURCE_ORDERS)
      .select('id')
      .eq('merchant_id', merchantId)
      .eq(column, ref)
      .limit(5);
    if (error) throw new Error(`order_lookup_failed: ${error.message}`);
    for (const row of (data as Array<{ id: string }> | null) ?? []) ids.add(row.id);
  }
  const list = [...ids];
  if (list.length === 1) return { status: 'confirmed', sourceOrderId: list[0] };
  if (list.length > 1) return { status: 'ambiguous', candidateIds: list };
  return { status: 'none' };
}

export type CreateManualCaseResult = {
  caseId: string;
  matchStatus: 'confirmed' | 'ambiguous' | 'unmatched';
  candidateOrderIds?: string[];
};

type ApiCaseOptions = {
  apiIdempotencyKey: string;
  rawBody: string;
};

type StoredApiCase = {
  id: string;
  source_order_id: string | null;
  detection_detail: Record<string, unknown> | null;
  api_payload_hash: string | null;
};

function apiCaseResult(row: StoredApiCase): CreateManualCaseResult {
  const metadata = row.detection_detail?._api_ingest;
  if (metadata && typeof metadata === 'object') {
    const record = metadata as Record<string, unknown>;
    if (record.match_status === 'confirmed') {
      return { caseId: row.id, matchStatus: 'confirmed' };
    }
    if (record.match_status === 'ambiguous') {
      const candidateOrderIds = Array.isArray(record.candidate_order_ids)
        ? record.candidate_order_ids.filter((id): id is string => typeof id === 'string')
        : [];
      return { caseId: row.id, matchStatus: 'ambiguous', candidateOrderIds };
    }
  }
  return { caseId: row.id, matchStatus: row.source_order_id ? 'confirmed' : 'unmatched' };
}

async function readApiCase(
  client: SupabaseClient,
  merchantId: string,
  idempotencyKey: string,
): Promise<StoredApiCase | null> {
  const { data, error } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id, source_order_id, detection_detail, api_payload_hash')
    .eq('merchant_id', merchantId)
    .eq('api_idempotency_key', idempotencyKey)
    .maybeSingle();
  if (error) throw new Error(`manual_case_idempotency_read_failed: ${error.message}`);
  return (data as StoredApiCase | null) ?? null;
}

async function ensureApiCaseAssociations(
  client: SupabaseClient,
  merchantId: string,
  result: CreateManualCaseResult,
  sourceOrderId: string | null,
): Promise<void> {
  if (result.matchStatus === 'confirmed' && sourceOrderId) {
    const { error } = await client.from(TABLES.ENTITY_RELATIONSHIPS).upsert({
      merchant_id: merchantId,
      from_entity_type: 'case', from_entity_id: result.caseId,
      to_entity_type: 'order', to_entity_id: sourceOrderId,
      relationship_type: 'case_order', match_status: 'confirmed', match_method: 'manual',
    }, {
      onConflict: 'merchant_id,from_entity_type,from_entity_id,to_entity_type,to_entity_id,relationship_type',
    });
    if (error) throw new Error(`manual_case_relationship_failed: ${error.message}`);
    return;
  }

  if (result.matchStatus !== 'ambiguous' || !result.candidateOrderIds?.length) return;

  const { data: existing, error: readError } = await client
    .from(TABLES.RECORD_MATCH_CANDIDATES)
    .select('candidate_entity_id')
    .eq('merchant_id', merchantId)
    .eq('subject_entity_type', 'case')
    .eq('subject_entity_id', result.caseId)
    .eq('candidate_entity_type', 'order')
    .eq('match_method', 'order_number');
  if (readError) throw new Error(`manual_case_candidates_read_failed: ${readError.message}`);

  const existingIds = new Set(
    ((existing as Array<{ candidate_entity_id: string }> | null) ?? []).map((row) => row.candidate_entity_id),
  );
  const missing = result.candidateOrderIds.filter((id) => !existingIds.has(id));
  if (!missing.length) return;

  const { error: insertError } = await client.from(TABLES.RECORD_MATCH_CANDIDATES).insert(
    missing.map((orderId) => ({
      merchant_id: merchantId,
      subject_entity_type: 'case', subject_entity_id: result.caseId,
      candidate_entity_type: 'order', candidate_entity_id: orderId,
      match_method: 'order_number', status: 'open',
    })),
  );
  if (insertError) throw new Error(`manual_case_candidates_failed: ${insertError.message}`);
}

export async function createManualCase(
  client: SupabaseClient,
  merchantId: string,
  rawInput: ManualCaseInput,
  apiOptions?: ApiCaseOptions,
): Promise<CreateManualCaseResult> {
  const input = manualCaseSchema.parse(rawInput);
  const apiPayloadHash = apiOptions
    ? createHash('sha256').update(apiOptions.rawBody).digest('hex')
    : null;

  if (apiOptions) {
    const existing = await readApiCase(client, merchantId, apiOptions.apiIdempotencyKey);
    if (existing) {
      if (existing.api_payload_hash && existing.api_payload_hash !== apiPayloadHash) {
        throw new Error('api_idempotency_payload_conflict');
      }
      const result = apiCaseResult(existing);
      await ensureApiCaseAssociations(client, merchantId, result, existing.source_order_id);
      return result;
    }
  }

  let resolution: OrderResolution = { status: 'none' };
  if (input.orderReference) {
    resolution = await resolveOrderReference(client, merchantId, input.orderReference);
  }

  const sourceOrderId = resolution.status === 'confirmed' ? resolution.sourceOrderId : null;
  const matchStatus = resolution.status === 'none' ? 'unmatched' : resolution.status;
  const candidateOrderIds = resolution.status === 'ambiguous' ? resolution.candidateIds : undefined;
  // Unanchored cases must carry a manual reference (relaxed anchor constraint).
  const manualReference = sourceOrderId ? null : (input.orderReference ?? `manual:${input.customerEmail ?? input.customerName ?? 'case'}`);

  const { data: inserted, error } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .insert({
      merchant_id: merchantId,
      case_origin: apiOptions ? 'api' : 'manual',
      manual_reference: manualReference,
      manual_source_url: input.sourceUrl ?? null,
      api_idempotency_key: apiOptions?.apiIdempotencyKey ?? null,
      api_payload_hash: apiPayloadHash,
      source_order_id: sourceOrderId,
      claim_type: input.issueType,
      status: 'manual_review',
      detection_method: 'manual',
      detection_detail: {
        ...(input.note ? { note: input.note } : {}),
        ...(apiOptions ? {
          _api_ingest: {
            match_status: matchStatus,
            candidate_order_ids: candidateOrderIds ?? [],
          },
        } : {}),
      },
      requested_action: input.requestedAction,
      amount_at_risk: input.amountMinor != null && input.currency ? input.amountMinor / 100 : null,
      currency: input.currency ?? null,
      primary_currency: input.currency ?? null,
      loss_attribution: 'unknown',
      recoverability: input.recoverability,
      requires_review: true,
      assigned_to: input.ownerUserId ?? null,
      assigned_at: input.ownerUserId ? new Date().toISOString() : null,
      reason_raw: input.note ?? null,
    })
    .select('id')
    .single();
  if (error) {
    if (apiOptions && (error as { code?: string }).code === '23505') {
      const existing = await readApiCase(client, merchantId, apiOptions.apiIdempotencyKey);
      if (existing) {
        if (existing.api_payload_hash && existing.api_payload_hash !== apiPayloadHash) {
          throw new Error('api_idempotency_payload_conflict');
        }
        const result = apiCaseResult(existing);
        await ensureApiCaseAssociations(client, merchantId, result, existing.source_order_id);
        return result;
      }
    }
    throw new Error(`manual_case_create_failed: ${error.message}`);
  }
  const caseId = (inserted as { id: string }).id;
  const result: CreateManualCaseResult = {
    caseId,
    matchStatus,
    ...(candidateOrderIds ? { candidateOrderIds } : {}),
  };
  await ensureApiCaseAssociations(client, merchantId, result, sourceOrderId);
  return result;
}
