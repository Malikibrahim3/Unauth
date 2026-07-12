/**
 * Manual support-payout-case creation.
 *
 * A merchant with no connected commerce/helpdesk source can still create and
 * work a complete case. Order-reference resolution is explicit:
 *   - exactly one matching order  -> confirmed link (source_order_id + confirmed relationship);
 *   - multiple matches            -> ambiguous (unanchored; match candidates recorded);
 *   - none                        -> keep manual_reference (no fake order).
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §7.4.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
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

export async function createManualCase(
  client: SupabaseClient,
  merchantId: string,
  rawInput: ManualCaseInput,
): Promise<CreateManualCaseResult> {
  const input = manualCaseSchema.parse(rawInput);

  let resolution: OrderResolution = { status: 'none' };
  if (input.orderReference) {
    resolution = await resolveOrderReference(client, merchantId, input.orderReference);
  }

  const sourceOrderId = resolution.status === 'confirmed' ? resolution.sourceOrderId : null;
  // Unanchored cases must carry a manual reference (relaxed anchor constraint).
  const manualReference = sourceOrderId ? null : (input.orderReference ?? `manual:${input.customerEmail ?? input.customerName ?? 'case'}`);

  const { data: inserted, error } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .insert({
      merchant_id: merchantId,
      case_origin: 'manual',
      manual_reference: manualReference,
      manual_source_url: input.sourceUrl ?? null,
      source_order_id: sourceOrderId,
      claim_type: input.issueType,
      status: 'manual_review',
      detection_method: 'manual',
      detection_detail: input.note ? { note: input.note } : {},
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
  if (error) throw new Error(`manual_case_create_failed: ${error.message}`);
  const caseId = (inserted as { id: string }).id;

  if (resolution.status === 'confirmed') {
    await client.from(TABLES.ENTITY_RELATIONSHIPS).insert({
      merchant_id: merchantId,
      from_entity_type: 'case', from_entity_id: caseId,
      to_entity_type: 'order', to_entity_id: resolution.sourceOrderId,
      relationship_type: 'case_order', match_status: 'confirmed', match_method: 'manual',
    });
    return { caseId, matchStatus: 'confirmed' };
  }

  if (resolution.status === 'ambiguous') {
    await client.from(TABLES.RECORD_MATCH_CANDIDATES).insert(
      resolution.candidateIds.map((orderId) => ({
        merchant_id: merchantId,
        subject_entity_type: 'case', subject_entity_id: caseId,
        candidate_entity_type: 'order', candidate_entity_id: orderId,
        match_method: 'order_number', status: 'open',
      })),
    );
    return { caseId, matchStatus: 'ambiguous', candidateOrderIds: resolution.candidateIds };
  }

  return { caseId, matchStatus: 'unmatched' };
}
