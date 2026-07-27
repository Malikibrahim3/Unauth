import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { computeClaimDecision, evaluateClaimDecision } from '@/lib/claims/decision/evaluate';
import { formatClaimDecisionRecommendation } from '@/lib/claims/decision/format';
import { getRecoveryCaseForSupportPayoutCase } from '@/lib/recoveries/store';
import { assembleEvidencePack } from '@/lib/payouts/assembleEvidencePack';
import { listCaseClarificationRequests } from '@/lib/payouts/clarifications';
import { getReconciliationReadModel, refreshCaseReconciliation } from '@/lib/reconciliation/caseStore';

export const dynamic = 'force-dynamic';


/**
 * GET /api/claims/[claimId]/decision
 *
 * RUN-04: the read-only counterpart to the POST below. Opening a case must not
 * mutate it, so this handler runs the same pure computation the POST does but
 * skips every write the POST performs — evidence backfill, carrier sync,
 * payout-case persistence, rule-evaluation audit, and reconciliation refresh.
 * The rendered result is identical; only the side effects are gone.
 *
 * The POST remains the explicit "Refresh recommendation" command.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  // A read needs read permission only; the write-scoped payout-decision
  // permission stays on the POST.
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(serviceClient, claimId, ctx.merchantId);
  if (loaded.denied === 'not_found') return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  if (loaded.denied === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    /*
     * RUN-13: none of these five reads depends on another. Running the decision
     * computation first and the rest afterwards made this endpoint the slowest
     * request on case detail; the cost is now the slowest single read rather
     * than their sum.
     */
    const claim = loaded.claim!;
    const [computed, recoveryCase, evidencePack, clarificationRequests, reconciliation] = await Promise.all([
      computeClaimDecision({ client: serviceClient, merchantId: ctx.merchantId, claimId }),
      getRecoveryCaseForSupportPayoutCase(serviceClient, ctx.merchantId, claimId),
      assembleEvidencePack({
        client: serviceClient,
        merchantId: ctx.merchantId,
        supportPayoutCaseId: claimId,
        orderId: claim.source_order_id ?? null,
        customerId: claim.identity_id ?? null,
        ticketId: claim.source_ticket_id ?? null,
      }),
      listCaseClarificationRequests(serviceClient, ctx.merchantId, claimId),
      getReconciliationReadModel(serviceClient, ctx.merchantId, claimId),
    ]);
    if (!computed) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });

    const formatted = formatClaimDecisionRecommendation(computed.evaluation, computed.ruleCount, computed.payoutCase);
    const recovery = computed.payoutCase?.recovery;
    const recoverable =
      recovery?.recoverability === 'recoverable' || recovery?.recoverability === 'possibly_recoverable';

    return NextResponse.json({
      evaluation: computed.evaluation,
      ruleCount: computed.ruleCount,
      evaluatedAt: computed.evaluatedAt,
      formatted,
      payoutCase: { ...computed.payoutCase, clarificationRequests },
      evidencePack,
      recoveryCase,
      recovery_opportunity: {
        available: !recoveryCase && !!recoverable,
        already_open: !!recoveryCase,
        reason:
          recovery?.suggestedNextAction ??
          (recoverable ? 'A recovery route may be available.' : 'No external recovery route identified.'),
        recoverable_amount: computed.payoutCase?.exposure?.total?.amount ?? null,
      },
      reconciliation,
      readOnly: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[claims.decision.read] failed', { claimId, merchantId: ctx.merchantId, message });
    return NextResponse.json({ error: 'Failed to load the recommendation', message }, { status: 500 });
  }
}

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
