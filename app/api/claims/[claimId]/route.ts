import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { getRecoveryCaseForSupportPayoutCase } from '@/lib/recoveries/store';
import { TABLES } from '@/lib/supabase/tables';
import { listCaseClarificationRequests } from '@/lib/payouts/clarifications';
import {
  toSupportPayoutCaseReason,
  toSupportPayoutCaseStatus,
} from '@/lib/payouts/taxonomy';

export const dynamic = 'force-dynamic';

/**
 * GET /api/claims/[claimId]
 *
 * First-class support payout case detail. The route is the canonical entry
 * point for reviewing a single payout case: it loads the case first, then
 * layers order, ticket, evidence, outcome, and recovery context around it.
 *
 * The wire shape is payout-case-first. `claimId` is retained internally for
 * table/column compatibility during the staged rename.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(serviceClient, claimId, ctx.merchantId);
  if (!loaded.claim) {
    const forbidden = loaded.denied === 'forbidden';
    return NextResponse.json(
      { error: forbidden ? 'Forbidden' : 'Support payout case not found' },
      { status: forbidden ? 403 : 404 },
    );
  }

  const caseRow = loaded.claim;

  // Payout/recovery columns live on the same row but are not part of the
  // action-shaped ClaimForAction select, so read them directly.
  const { data: payoutRow } = await serviceClient
    .from(TABLES.MERCHANT_CLAIMS)
    .select(
      'requested_action,refund_amount,replacement_item_value,replacement_shipping_cost,discount_amount,store_credit_amount,estimated_support_cost,total_estimated_loss,loss_attribution,attribution_confidence,recoverability,recovery_owner,recovery_required_evidence,recovery_next_action,recommended_payout_action,recommended_rule_name,recommended_rule_id,payout_decision_state,recovery_state,next_action,next_action_reason',
    )
    .eq('id', claimId)
    .eq('merchant_id', ctx.merchantId)
    .maybeSingle();

  // Order context.
  let order: { id: string; external_id: string | null; order_number: string | null; email: string | null } | null = null;
  if (caseRow.source_order_id) {
    const { data } = await serviceClient
      .from('source_orders')
      .select('id,external_id,order_number,email')
      .eq('merchant_id', ctx.merchantId)
      .eq('id', caseRow.source_order_id)
      .maybeSingle();
    order = data ?? null;
  }

  // Ticket context.
  let ticketRef: string | null = null;
  if (caseRow.source_ticket_id) {
    const { data } = await serviceClient
      .from('source_tickets')
      .select('external_id')
      .eq('merchant_id', ctx.merchantId)
      .eq('id', caseRow.source_ticket_id)
      .maybeSingle();
    ticketRef = data?.external_id ?? null;
  }

  // Recorded agent decision / outcome (claim_outcomes holds one row per case).
  const { data: outcomeRow } = await serviceClient
    .from('claim_outcomes')
    .select('decision,outcome,amount_refunded,amount_recovered,notes,decided_by,decided_at,updated_at')
    .eq('claim_id', claimId)
    .maybeSingle();

  // Evidence currently attached to the case.
  const { data: evidenceRows } = await serviceClient
    .from('claim_evidence')
    .select('id,evidence_type,source,evidence_url,created_at')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: false });

  // Linked recovery case, if one has been explicitly opened.
  const recoveryCase = await getRecoveryCaseForSupportPayoutCase(serviceClient, ctx.merchantId, claimId);
  const clarificationRequests = await listCaseClarificationRequests(serviceClient, ctx.merchantId, claimId);

  // Light customer/identity context. Customers are context, not the workbench.
  let customer: { id: string; display_name: string | null } | null = null;
  if (caseRow.identity_id) {
    const { data } = await serviceClient
      .from('merchant_identity_state')
      .select('display_name')
      .eq('merchant_id', ctx.merchantId)
      .eq('identity_id', caseRow.identity_id)
      .maybeSingle();
    customer = { id: caseRow.identity_id, display_name: data?.display_name ?? null };
  }

  return NextResponse.json({
    support_payout_case: {
      id: caseRow.id,
      status: toSupportPayoutCaseStatus(caseRow.status, !!recoveryCase),
      legacy_status: caseRow.status,
      case_reason: toSupportPayoutCaseReason(caseRow.claim_type, caseRow.reason_normalized),
      legacy_claim_type: caseRow.claim_type ?? null,
      requested_action: payoutRow?.requested_action ?? 'unknown',
      payout_decision_state: payoutRow?.payout_decision_state ?? 'undecided',
      recovery_state: payoutRow?.recovery_state ?? 'no_recovery_needed',
      next_action: payoutRow?.next_action ?? null,
      next_action_reason: payoutRow?.next_action_reason ?? null,
      payout_exposure: {
        amount: caseRow.amount_at_risk ?? null,
        currency: caseRow.currency ?? null,
        refund_amount: payoutRow?.refund_amount ?? null,
        replacement_item_value: payoutRow?.replacement_item_value ?? null,
        replacement_shipping_cost: payoutRow?.replacement_shipping_cost ?? null,
        discount_amount: payoutRow?.discount_amount ?? null,
        store_credit_amount: payoutRow?.store_credit_amount ?? null,
        estimated_support_cost: payoutRow?.estimated_support_cost ?? null,
        total_estimated_loss: payoutRow?.total_estimated_loss ?? null,
      },
      source_ticket_id: caseRow.source_ticket_id ?? null,
      source_order_id: caseRow.source_order_id ?? null,
      submitted_at: caseRow.submitted_at ?? null,
      created_at: caseRow.created_at ?? null,
      updated_at: caseRow.updated_at ?? null,
      first_viewed_at: caseRow.first_viewed_at ?? null,
      assigned_to: caseRow.assigned_to ?? null,
    },
    recommendation: payoutRow?.recommended_payout_action
      ? {
          action: payoutRow.recommended_payout_action,
          rule_name: payoutRow.recommended_rule_name ?? null,
          rule_id: payoutRow.recommended_rule_id ?? null,
        }
      : null,
    evidence: {
      attached: evidenceRows ?? [],
      count: (evidenceRows ?? []).length,
    },
    decision: outcomeRow ?? null,
    recovery_opportunity: {
      loss_attribution: payoutRow?.loss_attribution ?? null,
      attribution_confidence: payoutRow?.attribution_confidence ?? null,
      recoverability: payoutRow?.recoverability ?? null,
      recovery_owner: payoutRow?.recovery_owner ?? null,
      required_evidence: payoutRow?.recovery_required_evidence ?? null,
      next_action: payoutRow?.recovery_next_action ?? null,
    },
    recovery_case: recoveryCase,
    clarification_requests: clarificationRequests,
    order_context: order
      ? {
          source_order_id: order.id,
          external_id: order.external_id,
          order_number: order.order_number,
          email: order.email,
        }
      : null,
    ticket_context: caseRow.source_ticket_id
      ? { source_ticket_id: caseRow.source_ticket_id, external_id: ticketRef }
      : null,
    customer_context: customer,
  });
}
