import { z } from 'zod';
import { CANONICAL_CLAIM_STATUSES, normalizeLegacyClaimStatus } from '@/lib/claims/statusMachine';
import { TABLES } from '@/lib/supabase/tables';
import {
  ATTRIBUTION_CONFIDENCES,
  LIKELY_OWNERS,
  LOSS_ATTRIBUTION_LABELS,
  PAYOUT_RECOMMENDATION_VALUES,
  RECOVERABILITIES,
  REQUESTED_ACTIONS,
} from '@/lib/payouts/types';
import {
  SUPPORT_PAYOUT_CASE_REASONS,
  SUPPORT_PAYOUT_CASE_STATUSES,
  toStoredClaimStatus,
  toStoredClaimType,
} from '@/lib/payouts/taxonomy';
import { transitionCase } from '@/lib/cases/transitionCase';
import { upsertClaimEvidence } from '@/lib/integrations/canonicalEvidence';
import { merchantDecisionSchema } from '@/lib/claims/decision/merchantDecision';

const claimTypeSchema = z.enum(['missing_parcel', 'item_not_received', 'damaged', 'wrong_item', 'not_as_described', 'refund_request', 'chargeback', 'return_abuse', 'other']);
const claimStatusSchema = z.enum(CANONICAL_CLAIM_STATUSES);
const supportPayoutCaseStatusSchema = z.enum(SUPPORT_PAYOUT_CASE_STATUSES);
const supportPayoutCaseReasonSchema = z.enum(SUPPORT_PAYOUT_CASE_REASONS);
const requestedActionSchema = z.enum(REQUESTED_ACTIONS);
const lossAttributionSchema = z.enum(LOSS_ATTRIBUTION_LABELS);
const attributionConfidenceSchema = z.enum(ATTRIBUTION_CONFIDENCES);
const recoverabilitySchema = z.enum(RECOVERABILITIES);
const recoveryOwnerSchema = z.enum(LIKELY_OWNERS);
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
// Prohibited accusation vocabulary ('blacklist' decision, 'suspected_fraud'
// outcome) is intentionally NOT accepted on write. Historical rows are read-
// compatible via toV2Decision() and the neutral display labels in events.ts.
const outcomeDecisionSchema = z.enum(['approved', 'denied', 'escalated', 'partial_refund', 'full_refund', 'chargeback_disputed', 'internal_watch', 'no_action']);
const outcomeSchema = z.enum(['loss', 'recovered', 'pending', 'chargeback_won', 'chargeback_lost', 'customer_verified', 'legitimate']);
const evidenceTypeSchema = z.enum([
  'tracking',
  'proof_of_delivery',
  'customer_message',
  'support_ticket',
  'return_label',
  'warehouse_scan',
  'payment_dispute',
  'note',
  'other',
  'damage_photo',
  'packaging_photo',
  'label_photo',
  'wrong_item_photo',
  'proof_of_value',
  'proof_of_dispatch',
  'delivery_photo',
  'customer_non_receipt_statement',
  'carrier_investigation',
  'warehouse_pick_pack_record',
  'packing_slip',
  'weight_scan',
  'refund_proof',
  'reship_proof',
  'supplier_batch_lot',
  'purchase_order',
  'return_inspection',
  'chargeback_notice',
  'carrier_claim_correspondence',
  'three_pl_dispute_correspondence',
  'supplier_credit_note',
]);
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
  claim_type: claimTypeSchema.optional(),
  case_reason: supportPayoutCaseReasonSchema.nullable().optional(),
  customer_claim_reason: z.string().nullable().optional(),
  normalized_reason: z.string().nullable().optional(),
  case_status: supportPayoutCaseStatusSchema.nullable().optional(),
  status: z.preprocess(
    (value) => (typeof value === 'string' ? normalizeLegacyClaimStatus(value) ?? value : value),
    claimStatusSchema,
  ).default('open'),
  amount_at_risk: z.number().finite().nullable().optional(),
  currency: z.string().nullable().optional(),
  refund_amount: z.number().finite().nullable().optional(),
  replacement_item_value: z.number().finite().nullable().optional(),
  replacement_shipping_cost: z.number().finite().nullable().optional(),
  discount_amount: z.number().finite().nullable().optional(),
  store_credit_amount: z.number().finite().nullable().optional(),
  estimated_support_cost: z.number().finite().nullable().optional(),
  total_estimated_loss: z.number().finite().nullable().optional(),
  requested_action: requestedActionSchema.default('unknown'),
  loss_attribution: lossAttributionSchema.nullable().optional(),
  attribution_confidence: attributionConfidenceSchema.nullable().optional(),
  recoverability: recoverabilitySchema.nullable().optional(),
  recovery_owner: recoveryOwnerSchema.nullable().optional(),
  recovery_required_evidence: z.array(z.string()).default([]),
  recovery_next_action: z.string().nullable().optional(),
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
  actor_user_id: z.string().uuid().optional(),
  recommended_payout_action: z.enum(PAYOUT_RECOMMENDATION_VALUES).nullable().optional(),
  followed_recommendation: z.boolean().nullable().optional(),
}).and(merchantDecisionSchema);

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
  claimType: string | null,
  sourceTicketId: string | null,
) {
  let query = supabase
    .from(TABLES.MERCHANT_CLAIMS)
    .select()
    .eq('merchant_id', merchantId)
    .limit(1);
  if (claimId) query = query.eq('id', claimId);
  else if (sourceTicketId) query = query.eq('source_ticket_id', sourceTicketId);
  else if (sourceOrderId && claimType) {
    query = query.eq('source_order_id', sourceOrderId).eq('claim_type', claimType);
  } else if (sourceOrderId) {
    query = query.eq('source_order_id', sourceOrderId).eq('claim_type', 'other');
  }
  else return null;

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`select claims failed: ${error.message}`);
  return data ?? null;
}

export async function upsertMerchantClaim(
  supabase: any,
  input: z.input<typeof createClaimSchema>,
  options: { ignoreDuplicates?: boolean; transitionExisting?: boolean; transitionSource?: string } = {}
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
  const storedClaimType =
    (payload.case_reason ? toStoredClaimType(payload.case_reason) : null) ??
    toV2ClaimType(payload.claim_type ?? 'other');
  const storedStatus =
    payload.case_status ? normalizeLegacyClaimStatus(toStoredClaimStatus(payload.case_status)) ?? payload.status : payload.status;

  const row = {
    merchant_id: payload.merchant_id,
    source_order_id: sourceOrderId,
    source_ticket_id: payload.source_ticket_id ?? null,
    identity_id: payload.identity_id ?? payload.customer_id ?? null,
    claim_type: storedClaimType,
    status: storedStatus,
    detection_method: toV2DetectionMethod(payload.detection_method),
    detection_detail: {
      ...(payload.trigger_tag ? { trigger_tag: payload.trigger_tag } : {}),
      ...(payload.trigger_tags.length > 0 ? { trigger_tags: payload.trigger_tags } : {}),
      ...(payload.refund_type ? { refund_type: payload.refund_type } : {}),
      ...(payload.case_reason ? { case_reason: payload.case_reason } : {}),
    },
    reason_raw: payload.customer_claim_reason ?? null,
    reason_normalized: payload.case_reason ?? payload.normalized_reason ?? null,
    amount_at_risk: payload.amount_at_risk ?? null,
    currency: payload.currency ?? null,
    refund_amount: payload.refund_amount ?? null,
    replacement_item_value: payload.replacement_item_value ?? null,
    replacement_shipping_cost: payload.replacement_shipping_cost ?? null,
    discount_amount: payload.discount_amount ?? null,
    store_credit_amount: payload.store_credit_amount ?? null,
    estimated_support_cost: payload.estimated_support_cost ?? null,
    total_estimated_loss: payload.total_estimated_loss ?? payload.amount_at_risk ?? null,
    requested_action: payload.requested_action,
    loss_attribution: payload.loss_attribution ?? null,
    attribution_confidence: payload.attribution_confidence ?? null,
    recoverability: payload.recoverability ?? null,
    recovery_owner: payload.recovery_owner ?? null,
    recovery_required_evidence: payload.recovery_required_evidence,
    recovery_next_action: payload.recovery_next_action ?? null,
    requires_review: payload.requires_merchant_review,
    ...(payload.submitted_at ? { submitted_at: payload.submitted_at } : {}),
  };

  // claims has no order-level unique constraint in v2 (one order may accrue
  // multiple claims over time), so claim-per-order dedupe happens here.
  const existing = await fetchExistingClaim(
    supabase,
    payload.merchant_id,
    payload.id,
    sourceOrderId,
    storedClaimType,
    payload.source_ticket_id ?? null,
  );
  if (existing && options.ignoreDuplicates === true) return existing;

  if (existing) {
    const updateRow = options.transitionExisting ? { ...row, status: existing.status } : row;
    const { data, error } = await supabase
      .from(TABLES.MERCHANT_CLAIMS)
      .update(updateRow)
      .eq('id', existing.id)
      .eq('merchant_id', payload.merchant_id)
      .select()
      .single();
    if (error) throw new Error(`update claims failed: ${error.message}`);
    if (options.transitionExisting && existing.status !== storedStatus) {
      const transitioned = await transitionCase(supabase, {
        merchantId: payload.merchant_id,
        caseId: existing.id,
        expectedVersion: existing.state_version ?? 1,
        patch: { status: storedStatus },
        triggeredBy: options.transitionSource ?? 'claim_upsert',
        eventType: 'case.updated',
      });
      return { ...data, status: transitioned.status, state_version: transitioned.newVersion };
    }
    return data;
  }

  const { data, error } = await supabase
    .from(TABLES.MERCHANT_CLAIMS)
    .insert(payload.id ? { id: payload.id, ...row } : row)
    .select()
    .single();
  if (error) throw new Error(`insert claims failed: ${error.message}`);
  return data;
}

/**
 * Append an immutable decision + outcome pair to the Phase 7 append-only history.
 * Each call supersedes the previous decision (never mutating it); reversals also
 * set `reverses_decision_id`. The legacy single-row `claim_outcomes` projection is
 * still maintained by the caller as the current-state compatibility view.
 */
async function appendCaseDecisionHistory(supabase: any, args: {
  claimId: string;
  decidedAt: string;
  decision: string;
  outcome: string;
  amountRefunded: number | null;
  amountRecovered: number | null;
  notes: string | null;
  actorUserId: string | null;
  recommendedPayoutAction: string | null;
  followedRecommendation: boolean | null;
  reversal: boolean;
}) {
  const { data: caseRow } = await supabase
    .from(TABLES.MERCHANT_CLAIMS)
    .select('merchant_id,currency,primary_currency')
    .eq('id', args.claimId)
    .maybeSingle();
  if (!caseRow?.merchant_id) return; // case-less test fixtures: nothing to attribute history to
  const merchantId = caseRow.merchant_id as string;
  const currency = (caseRow.primary_currency ?? caseRow.currency ?? null) as string | null;
  const amount = args.amountRecovered ?? args.amountRefunded;
  const amountMinor = amount == null ? null : Math.round(amount * 100);

  const { data: prior } = await supabase
    .from(TABLES.CASE_DECISIONS)
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('support_payout_case_id', args.claimId)
    .order('effective_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const priorId = (prior?.id as string | undefined) ?? null;
  const base = `${args.claimId}:${args.decidedAt}:${crypto.randomUUID()}`;
  const actorType = args.actorUserId ? 'user' : 'system';

  const { error: decisionError } = await supabase.from(TABLES.CASE_DECISIONS).insert({
    merchant_id: merchantId,
    support_payout_case_id: args.claimId,
    decision: args.decision,
    action: args.outcome,
    amount_minor: amountMinor,
    currency,
    recommendation_snapshot: { recommended_payout_action: args.recommendedPayoutAction },
    followed_recommendation: args.followedRecommendation,
    reason: args.notes,
    actor_type: actorType,
    actor_user_id: args.actorUserId,
    effective_at: args.decidedAt,
    supersedes_decision_id: priorId,
    reverses_decision_id: args.reversal ? priorId : null,
    idempotency_key: `decision:${base}`,
  });
  if (decisionError) throw new Error(`append case_decisions failed: ${decisionError.message}`);

  const { error: outcomeError } = await supabase.from(TABLES.CASE_OUTCOMES).insert({
    merchant_id: merchantId,
    support_payout_case_id: args.claimId,
    outcome_type: args.outcome,
    amount_minor: amountMinor,
    currency,
    reason: args.notes,
    actor_type: actorType,
    actor_user_id: args.actorUserId,
    effective_at: args.decidedAt,
    idempotency_key: `outcome:${base}`,
  });
  if (outcomeError) throw new Error(`append case_outcomes failed: ${outcomeError.message}`);
}

export async function upsertMerchantCaseOutcome(
  supabase: any,
  input: z.input<typeof createOutcomeSchema>,
  options: { reversal?: boolean } = {},
) {
  const payload = createOutcomeSchema.parse(input);
  const decidedAt = payload.decided_at ?? new Date().toISOString();
  const row = {
    ...(payload.id ? { id: payload.id } : {}),
    claim_id: payload.claim_id,
    decision: toV2Decision(payload.decision),
    outcome: payload.outcome,
    amount_refunded: payload.amount_refunded ?? null,
    amount_recovered: payload.amount_recovered ?? null,
    notes: payload.notes ?? null,
    decided_by: payload.actor_user_id ?? null,
    decided_at: decidedAt,
    recommended_payout_action: payload.recommended_payout_action ?? null,
    followed_recommendation: payload.followed_recommendation ?? null,
  };
  const { data, error } = await supabase
    .from('claim_outcomes')
    .upsert(row, { onConflict: 'claim_id' })
    .select()
    .single();
  if (error) throw new Error(`upsert claim_outcomes failed: ${error.message}`);

  await appendCaseDecisionHistory(supabase, {
    claimId: payload.claim_id,
    decidedAt,
    decision: toV2Decision(payload.decision),
    outcome: payload.outcome,
    amountRefunded: payload.amount_refunded ?? null,
    amountRecovered: payload.amount_recovered ?? null,
    notes: payload.notes ?? null,
    actorUserId: payload.actor_user_id ?? null,
    recommendedPayoutAction: payload.recommended_payout_action ?? null,
    followedRecommendation: payload.followed_recommendation ?? null,
    reversal: options.reversal === true,
  });
  return data;
}

export async function upsertClaimEvidenceItem(supabase: any, input: z.input<typeof createEvidenceItemSchema>) {
  const payload = createEvidenceItemSchema.parse(input);
  if (!payload.merchant_id) {
    throw new Error('merchant_id is required to attach claim evidence');
  }
  // Phase 7.1: claim evidence is persisted to the canonical evidence_items store
  // (+ evidence_links) with an origin marker; the legacy claim_evidence table is
  // no longer written at runtime.
  return upsertClaimEvidence(supabase, {
    id: payload.id,
    merchantId: payload.merchant_id,
    claimId: payload.claim_id,
    evidenceType: payload.evidence_type,
    storagePath: payload.evidence_url ?? null,
    contentHash: payload.evidence_hash ?? null,
    sourceMetadata: { ...payload.metadata, source: payload.source },
    createdBy: payload.actor_user_id ?? null,
  });
}
