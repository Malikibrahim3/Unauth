import { z } from 'zod';
import { CANONICAL_CLAIM_STATUSES, normalizeLegacyClaimStatus } from '@/lib/claims/statusMachine';

const claimTypeSchema = z.enum(['missing_parcel', 'item_not_received', 'damaged', 'wrong_item', 'not_as_described', 'refund_request', 'chargeback', 'return_abuse', 'other']);
const claimStatusSchema = z.enum(CANONICAL_CLAIM_STATUSES);
const detectionMethodSchema = z.enum([
  'tag',
  'keyword',
  'keyword_fallback',
  'manual',
  'platform_dispute',
  'platform_refund',
  'model',
  'shopify_dispute',
  'woocommerce_refund',
  'bigcommerce_refund',
]);
const refundTypeSchema = z.enum(['full', 'partial', 'unknown']);
const outcomeDecisionSchema = z.enum(['approved', 'denied', 'escalated', 'partial_refund', 'full_refund', 'chargeback_disputed', 'blacklist', 'internal_watch', 'no_action']);
const outcomeSchema = z.enum(['loss', 'recovered', 'pending', 'chargeback_won', 'chargeback_lost', 'customer_verified', 'suspected_fraud', 'legitimate']);
const evidenceTypeSchema = z.enum(['tracking', 'proof_of_delivery', 'customer_message', 'support_ticket', 'return_label', 'warehouse_scan', 'payment_dispute', 'note', 'other']);
const evidenceSourceSchema = z.enum(['manual', 'csv_import', 'zendesk', 'gorgias', 'shopify', 'stripe', 'paypal', 'carrier']);

/** Legacy claim_type aliases mapped onto the v2 claim_type enum. */
const CLAIM_TYPE_TO_V2: Record<string, string> = {
  missing_parcel: 'item_not_received',
};

/** Legacy detection_method aliases mapped onto the v2 claim_detection_method enum. */
const DETECTION_METHOD_TO_V2: Record<string, string> = {
  keyword_fallback: 'keyword',
  shopify_dispute: 'platform_dispute',
  woocommerce_refund: 'platform_refund',
  bigcommerce_refund: 'platform_refund',
};

/** Legacy decision values that are not part of the v2 claim_decision enum. */
const DECISION_TO_V2: Record<string, string> = {
  blacklist: 'denied',
  internal_watch: 'no_action',
};

export function toV2ClaimType(claimType: string): string {
  return CLAIM_TYPE_TO_V2[claimType] ?? claimType;
}

export function toV2DetectionMethod(detectionMethod: string): string {
  return DETECTION_METHOD_TO_V2[detectionMethod] ?? detectionMethod;
}

export function toV2Decision(decision: string): string {
  return DECISION_TO_V2[decision] ?? decision;
}

export const createClaimSchema = z.object({
  id: z.string().uuid().optional(),
  merchant_id: z.string().uuid().nullable().optional(),
  // Legacy callers pass a platform order id; resolved to source_orders below.
  shopify_order_id: z.string().nullable().optional(),
  source_order_id: z.string().uuid().nullable().optional(),
  source_ticket_id: z.string().uuid().nullable().optional(),
  identity_id: z.string().uuid().nullable().optional(),
  // Legacy alias for identity_id (customer profile ids became identity ids in v2).
  customer_id: z.string().uuid().nullable().optional(),
  order_ref: z.string().nullable().optional(),
  claim_type: claimTypeSchema,
  customer_claim_reason: z.string().nullable().optional(),
  normalized_reason: z.string().nullable().optional(),
  status: z.preprocess(
    (value) => (typeof value === 'string' ? normalizeLegacyClaimStatus(value) ?? value : value),
    claimStatusSchema,
  ).default('open'),
  amount_at_risk: z.number().finite().nullable().optional(),
  currency: z.string().nullable().optional(),
  submitted_at: z.string().datetime().optional(),
  actor_user_id: z.string().uuid().nullable().optional(),
  detection_method: detectionMethodSchema.default('manual'),
  trigger_tag: z.string().nullable().optional(),
  trigger_tags: z.array(z.string()).default([]),
  requires_merchant_review: z.boolean().default(false),
  refund_type: refundTypeSchema.nullable().optional(),
}).refine(
  (d) => !!(d.shopify_order_id || d.order_ref || d.source_order_id || d.source_ticket_id),
  { message: 'Select an order before saving the claim.' },
);

export const createOutcomeSchema = z.object({
  id: z.string().uuid().optional(),
  claim_id: z.string().uuid(),
  decision: outcomeDecisionSchema,
  outcome: outcomeSchema,
  amount_refunded: z.number().finite().nullable().optional(),
  amount_recovered: z.number().finite().nullable().optional(),
  notes: z.string().nullable().optional(),
  decided_at: z.string().datetime().optional(),
  actor_user_id: z.string().uuid().nullable().optional(),
});

export const createEvidenceItemSchema = z.object({
  id: z.string().uuid().optional(),
  claim_id: z.string().uuid(),
  merchant_id: z.string().uuid().nullable().optional(),
  evidence_type: evidenceTypeSchema,
  evidence_url: z.string().url().nullable().optional(),
  evidence_hash: z.string().nullable().optional(),
  source: evidenceSourceSchema,
  metadata: z.record(z.unknown()).default({}),
  actor_user_id: z.string().uuid().nullable().optional(),
});

/**
 * Resolves a legacy platform order reference (Shopify order id or order
 * number) to a v2 source_orders row id for this merchant.
 */
export async function resolveSourceOrderId(
  supabase: any,
  merchantId: string,
  orderRef: string | null | undefined,
): Promise<string | null> {
  if (!orderRef) return null;
  const { data: byExternal, error: externalError } = await supabase
    .from('source_orders')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('external_id', orderRef)
    .limit(1)
    .maybeSingle();
  if (externalError) throw new Error(`select source_orders failed: ${externalError.message}`);
  if (byExternal) return byExternal.id;

  const { data: byNumber, error: numberError } = await supabase
    .from('source_orders')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('order_number', orderRef)
    .limit(1)
    .maybeSingle();
  if (numberError) throw new Error(`select source_orders failed: ${numberError.message}`);
  return byNumber?.id ?? null;
}

async function fetchExistingClaim(
  supabase: any,
  merchantId: string,
  claimId: string | undefined,
  sourceOrderId: string | null,
) {
  let query = supabase
    .from('claims')
    .select()
    .eq('merchant_id', merchantId)
    .limit(1);
  if (claimId) query = query.eq('id', claimId);
  else if (sourceOrderId) query = query.eq('source_order_id', sourceOrderId);
  else return null;

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`select claims failed: ${error.message}`);
  return data ?? null;
}

export async function upsertMerchantClaim(
  supabase: any,
  input: z.input<typeof createClaimSchema>,
  options: { ignoreDuplicates?: boolean } = {}
) {
  const payload = createClaimSchema.parse(input);
  if (!payload.merchant_id) {
    throw new Error('merchant_id is required to create or update a claim');
  }

  const sourceOrderId =
    payload.source_order_id ??
    await resolveSourceOrderId(supabase, payload.merchant_id, payload.shopify_order_id ?? payload.order_ref);
  if (!sourceOrderId && !payload.source_ticket_id) {
    throw new Error('upsert claims failed: order not found for this merchant');
  }

  const row = {
    merchant_id: payload.merchant_id,
    source_order_id: sourceOrderId,
    source_ticket_id: payload.source_ticket_id ?? null,
    identity_id: payload.identity_id ?? payload.customer_id ?? null,
    claim_type: toV2ClaimType(payload.claim_type),
    status: payload.status,
    detection_method: toV2DetectionMethod(payload.detection_method),
    detection_detail: {
      ...(payload.trigger_tag ? { trigger_tag: payload.trigger_tag } : {}),
      ...(payload.trigger_tags.length > 0 ? { trigger_tags: payload.trigger_tags } : {}),
      ...(payload.refund_type ? { refund_type: payload.refund_type } : {}),
    },
    reason_raw: payload.customer_claim_reason ?? null,
    reason_normalized: payload.normalized_reason ?? null,
    amount_at_risk: payload.amount_at_risk ?? null,
    currency: payload.currency ?? null,
    requires_review: payload.requires_merchant_review,
    ...(payload.submitted_at ? { submitted_at: payload.submitted_at } : {}),
  };

  // claims has no order-level unique constraint in v2 (one order may accrue
  // multiple claims over time), so claim-per-order dedupe happens here.
  const existing = await fetchExistingClaim(supabase, payload.merchant_id, payload.id, sourceOrderId);
  if (existing && options.ignoreDuplicates === true) return existing;

  if (existing) {
    const { data, error } = await supabase
      .from('claims')
      .update(row)
      .eq('id', existing.id)
      .eq('merchant_id', payload.merchant_id)
      .select()
      .single();
    if (error) throw new Error(`update claims failed: ${error.message}`);
    return data;
  }

  const { data, error } = await supabase
    .from('claims')
    .insert(payload.id ? { id: payload.id, ...row } : row)
    .select()
    .single();
  if (error) throw new Error(`insert claims failed: ${error.message}`);
  return data;
}

export async function upsertMerchantCaseOutcome(supabase: any, input: z.input<typeof createOutcomeSchema>) {
  const payload = createOutcomeSchema.parse(input);
  const row = {
    ...(payload.id ? { id: payload.id } : {}),
    claim_id: payload.claim_id,
    decision: toV2Decision(payload.decision),
    outcome: payload.outcome,
    amount_refunded: payload.amount_refunded ?? null,
    amount_recovered: payload.amount_recovered ?? null,
    notes: payload.notes ?? null,
    decided_by: payload.actor_user_id ?? null,
    decided_at: payload.decided_at ?? new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('claim_outcomes')
    .upsert(row, { onConflict: 'claim_id' })
    .select()
    .single();
  if (error) throw new Error(`upsert claim_outcomes failed: ${error.message}`);
  return data;
}

export async function upsertClaimEvidenceItem(supabase: any, input: z.input<typeof createEvidenceItemSchema>) {
  const payload = createEvidenceItemSchema.parse(input);
  if (!payload.merchant_id) {
    throw new Error('merchant_id is required to attach claim evidence');
  }
  const row = {
    ...(payload.id ? { id: payload.id } : {}),
    claim_id: payload.claim_id,
    merchant_id: payload.merchant_id,
    evidence_type: payload.evidence_type,
    storage_path: payload.evidence_url ?? null,
    evidence_hash: payload.evidence_hash ?? null,
    metadata: { ...payload.metadata, source: payload.source },
    added_by: payload.actor_user_id ?? null,
  };
  const { data, error } = await supabase
    .from('claim_evidence')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error(`upsert claim_evidence failed: ${error.message}`);
  return data;
}
