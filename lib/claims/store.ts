import { z } from 'zod';
import { CANONICAL_CLAIM_STATUSES } from '@/lib/claims/statusMachine';

const claimTypeSchema = z.enum(['missing_parcel', 'damaged', 'wrong_item', 'refund_request', 'chargeback', 'return_abuse', 'other']);
const claimStatusSchema = z.enum(CANONICAL_CLAIM_STATUSES);
const detectionMethodSchema = z.enum([
  'tag',
  'keyword_fallback',
  'manual',
  'shopify_dispute',
  'woocommerce_refund',
  'bigcommerce_refund',
]);
const refundTypeSchema = z.enum(['full', 'partial', 'unknown']);
const outcomeDecisionSchema = z.enum(['approved', 'denied', 'escalated', 'partial_refund', 'full_refund', 'chargeback_disputed', 'blacklist', 'no_action']);
const outcomeSchema = z.enum(['loss', 'recovered', 'pending', 'chargeback_won', 'chargeback_lost', 'customer_verified', 'suspected_fraud', 'legitimate']);
const evidenceTypeSchema = z.enum(['tracking', 'proof_of_delivery', 'customer_message', 'support_ticket', 'return_label', 'warehouse_scan', 'payment_dispute', 'note', 'other']);
const evidenceSourceSchema = z.enum(['manual', 'csv_import', 'zendesk', 'gorgias', 'shopify', 'stripe', 'paypal', 'carrier']);

export const createClaimSchema = z.object({
  id: z.string().uuid().optional(),
  merchant_id: z.string().uuid().nullable().optional(),
  shop_domain: z.string().min(1).nullable().optional(),
  shopify_order_id: z.string().nullable().optional(),
  order_source: z.enum(['shopify', 'csv', 'audit', 'manual']).nullable().optional(),
  order_ref: z.string().nullable().optional(),
  audit_transaction_id: z.string().uuid().nullable().optional(),
  customer_id: z.string().nullable().optional(),
  claim_type: claimTypeSchema,
  customer_claim_reason: z.string().nullable().optional(),
  normalized_reason: z.string().nullable().optional(),
  status: claimStatusSchema.default('open'),
  amount_at_risk: z.number().finite().nullable().optional(),
  currency: z.string().nullable().optional(),
  submitted_at: z.string().datetime().optional(),
  actor_user_id: z.string().uuid().nullable().optional(),
  detection_method: detectionMethodSchema.default('manual'),
  trigger_tag: z.string().nullable().optional(),
  trigger_tags: z.array(z.string()).default([]),
  requires_merchant_review: z.boolean().default(false),
  merchant_confirmed_at: z.string().datetime().nullable().optional(),
  refund_type: refundTypeSchema.nullable().optional(),
}).refine(
  (d) => !!(d.shopify_order_id || d.order_ref || d.audit_transaction_id),
  { message: 'Select an order before saving the claim.' },
);

export const createOutcomeSchema = z.object({
  id: z.string().uuid().optional(),
  claim_id: z.string().uuid(),
  shop_domain: z.string().min(1).nullable().optional(),
  shopify_order_id: z.string().nullable().optional(),
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
  evidence_type: evidenceTypeSchema,
  evidence_url: z.string().url().nullable().optional(),
  evidence_hash: z.string().nullable().optional(),
  source: evidenceSourceSchema,
  metadata: z.record(z.unknown()).default({}),
  actor_user_id: z.string().uuid().nullable().optional(),
});

type MerchantClaimConflictTarget = 'id' | 'merchant_id,shopify_order_id' | 'merchant_id,order_ref' | 'merchant_id,audit_transaction_id';

function merchantClaimConflictTarget(payload: z.output<typeof createClaimSchema>): MerchantClaimConflictTarget {
  if (payload.id) return 'id';
  if (payload.shopify_order_id) return 'merchant_id,shopify_order_id';
  if (payload.order_ref) return 'merchant_id,order_ref';
  return 'merchant_id,audit_transaction_id';
}

async function fetchExistingMerchantClaim(
  supabase: any,
  payload: z.output<typeof createClaimSchema>,
  conflictTarget: MerchantClaimConflictTarget
) {
  if (conflictTarget === 'id') {
    const { data, error } = await supabase
      .from('merchant_claims' as any)
      .select()
      .eq('id', payload.id)
      .maybeSingle();
    if (error) throw new Error(`select merchant_claims failed: ${error.message}`);
    return data;
  }

  const [merchantColumn, orderColumn] = conflictTarget.split(',');
  const { data, error } = await supabase
    .from('merchant_claims' as any)
    .select()
    .eq(merchantColumn, payload.merchant_id)
    .eq(orderColumn, payload[orderColumn as keyof typeof payload])
    .maybeSingle();
  if (error) throw new Error(`select merchant_claims failed: ${error.message}`);
  return data;
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

  const onConflict = merchantClaimConflictTarget(payload);
  const { data, error } = await supabase
    .from('merchant_claims' as any)
    .upsert(payload, { onConflict, ignoreDuplicates: options.ignoreDuplicates === true })
    .select()
    .maybeSingle();
  if (error) throw new Error(`upsert merchant_claims failed: ${error.message}`);
  if (data) return data;

  const existing = await fetchExistingMerchantClaim(supabase, payload, onConflict);
  if (!existing) throw new Error('upsert merchant_claims failed: no row returned');
  return existing;
}

export async function upsertMerchantCaseOutcome(supabase: any, input: z.input<typeof createOutcomeSchema>) {
  const payload = createOutcomeSchema.parse(input);
  const { data, error } = await supabase
    .from('merchant_case_outcomes' as any)
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error(`upsert merchant_case_outcomes failed: ${error.message}`);
  return data;
}

export async function upsertClaimEvidenceItem(supabase: any, input: z.input<typeof createEvidenceItemSchema>) {
  const payload = createEvidenceItemSchema.parse(input);
  const { data, error } = await supabase
    .from('claim_evidence_items' as any)
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error(`upsert claim_evidence_items failed: ${error.message}`);
  return data;
}
