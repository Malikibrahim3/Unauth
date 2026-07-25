import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { evaluateClaimDecision } from '@/lib/claims/decision/evaluate';
import { formatClaimDecisionRecommendation } from '@/lib/claims/decision/format';
import { getRecoveryCaseForSupportPayoutCase } from '@/lib/recoveries/store';
import { assembleEvidencePack } from '@/lib/payouts/assembleEvidencePack';
import { listCaseClarificationRequests } from '@/lib/payouts/clarifications';
import { refreshCaseReconciliation } from '@/lib/reconciliation/caseStore';

export const dynamic = 'force-dynamic';

/**
 * POST /api/claims/[claimId]/decision
 *
 * Assembles claim decision context, evaluates merchant rules, persists audit,
 * and returns the recommendation with traceability.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  // Persists an evaluation audit and assembles an evidence pack — a write/compute
  // action, so it requires the payout-decision permission (analyst+), not the
  // read-only VIEW_INBOX that every sibling claim-mutation route rejected.
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (denied) return denied;

  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(serviceClient, claimId, ctx.merchantId);
  if (loaded.denied === 'not_found') return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  if (loaded.denied === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const result = await evaluateClaimDecision({
      client: serviceClient,
      merchantId: ctx.merchantId,
      claimId,
      actorId: user.id,
      source: 'claim_review',
    });
    if (!result) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const formatted = formatClaimDecisionRecommendation(result.evaluation, result.ruleCount, result.payoutCase);

    const recoveryCase = await getRecoveryCaseForSupportPayoutCase(serviceClient, ctx.merchantId, claimId);
    const recovery = result.payoutCase?.recovery;
    const recoverable =
      recovery?.recoverability === 'recoverable' || recovery?.recoverability === 'possibly_recoverable';
    const recovery_opportunity = {
      available: !recoveryCase && !!recoverable,
      already_open: !!recoveryCase,
      reason:
        recovery?.suggestedNextAction ??
        (recoverable ? 'A recovery route may be available.' : 'No external recovery route identified.'),
      recoverable_amount: result.payoutCase?.exposure?.total?.amount ?? null,
    };
    const claim = loaded.claim!;
    const evidencePack = await assembleEvidencePack({
      client: serviceClient,
      merchantId: ctx.merchantId,
      supportPayoutCaseId: claimId,
      orderId: claim.source_order_id ?? null,
      customerId: claim.identity_id ?? null,
      ticketId: claim.source_ticket_id ?? null,
    });
    const clarificationRequests = await listCaseClarificationRequests(
      serviceClient,
      ctx.merchantId,
      claimId,
    );
    const payoutCase = {
      ...result.payoutCase,
      clarificationRequests,
    };
    let reconciliation = null;
    try {
      reconciliation = await refreshCaseReconciliation(serviceClient, ctx.merchantId, claimId);
    } catch (reconciliationError) {
      console.error('[claims.decision] reconciliation refresh failed', {
        claimId,
        message: reconciliationError instanceof Error ? reconciliationError.message : String(reconciliationError),
      });
    }

    return NextResponse.json({
      evaluation: result.evaluation,
      ruleCount: result.ruleCount,
      evaluatedAt: result.evaluatedAt,
      formatted,
      payoutCase,
      evidencePack,
      recoveryCase,
      recovery_opportunity,
      reconciliation,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[claims.decision] failed', { claimId, merchantId: ctx.merchantId, message });
    return NextResponse.json({ error: 'Failed to evaluate claim decision', message }, { status: 500 });
  }
}
