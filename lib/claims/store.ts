import { z } from 'zod';

const claimTypeSchema = z.enum(['missing_parcel', 'damaged', 'wrong_item', 'refund_request', 'chargeback', 'return_abuse', 'other']);
const claimStatusSchema = z.enum(['open', 'under_review', 'evidence_requested', 'resolved', 'closed']);
const outcomeDecisionSchema = z.enum(['approved', 'denied', 'escalated', 'partial_refund', 'full_refund', 'chargeback_disputed', 'blacklist', 'no_action']);
const outcomeSchema = z.enum(['loss', 'recovered', 'pending', 'chargeback_won', 'chargeback_lost', 'customer_verified', 'suspected_fraud']);
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

export async function upsertMerchantClaim(supabase: any, input: z.input<typeof createClaimSchema>) {
  const payload = createClaimSchema.parse(input);
  const { data, error } = await supabase
    .from('merchant_claims' as any)
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error(`upsert merchant_claims failed: ${error.message}`);
  return data;
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
