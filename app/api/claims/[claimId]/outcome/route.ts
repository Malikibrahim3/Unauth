import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { createOutcomeSchema, upsertMerchantCaseOutcome } from '@/lib/claims/store';
import { computeFollowedRecommendation } from '@/lib/payouts/recommendation';
import { applyPolicyOverrideAttribution } from '@/lib/payouts/attribution';
import type { AttributionConfidence, LossAttributionLabel, PayoutRecommendation } from '@/lib/payouts/types';
import { TABLES } from '@/lib/supabase/tables';
import { appendClaimEvent } from '@/lib/claims/events';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { claimStatusForOutcome } from '@/lib/claims/statusMachine';
import { resolveHoldTag } from '@/lib/gorgias/applyHoldTag';
import { CaseTransitionRejectedError, CaseVersionConflictError, transitionCase } from '@/lib/cases/transitionCase';

async function latestOutcome(serviceClient: any, claimId: string) {
  const { data } = await serviceClient
    .from('claim_outcomes')
    .select('decision,outcome,updated_at')
    .eq('claim_id', claimId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (denied) return denied;

  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(serviceClient, claimId, ctx.merchantId);
  if (loaded.denied === 'not_found') return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  if (loaded.denied === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const claim = loaded.claim!;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createOutcomeSchema.safeParse({ ...body as object, claim_id: claimId });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid outcome payload' }, { status: 400 });

  const { data: claimRecommendationRow } = await serviceClient
    .from(TABLES.MERCHANT_CLAIMS)
    .select('recommended_payout_action,loss_attribution,attribution_confidence')
    .eq('id', claimId)
    .eq('merchant_id', ctx.merchantId)
    .maybeSingle();

  const recommendedAtDecision =
    (claimRecommendationRow?.recommended_payout_action as PayoutRecommendation | null) ?? null;
  const followedRecommendation = computeFollowedRecommendation({
    recommendedAction: recommendedAtDecision,
    decision: parsed.data.decision,
    outcome: parsed.data.outcome,
  });

  const priorAttributionLabel = (claimRecommendationRow?.loss_attribution as LossAttributionLabel | null) ?? 'unknown';
  const reclassified = applyPolicyOverrideAttribution(
    {
      label: priorAttributionLabel,
      confidence: (claimRecommendationRow?.attribution_confidence as AttributionConfidence | null) ?? 'needs_more_evidence',
      reasons: [],
      networkBenchmark: null,
      isAdvisory: true,
    },
    {
      followedRecommendation,
      recommendedAction: recommendedAtDecision,
      decision: parsed.data.decision,
    },
  );
  if (reclassified.label !== priorAttributionLabel) {
    await serviceClient
      .from(TABLES.MERCHANT_CLAIMS)
      .update({ loss_attribution: reclassified.label, attribution_confidence: reclassified.confidence })
      .eq('id', claimId)
      .eq('merchant_id', ctx.merchantId);
  }

  try {
    const [previous, outcome] = await Promise.all([
      latestOutcome(serviceClient, claimId),
      upsertMerchantCaseOutcome(serviceClient, {
        ...parsed.data,
        actor_user_id: parsed.data.actor_user_id ?? user.id,
        recommended_payout_action: recommendedAtDecision,
        followed_recommendation: followedRecommendation,
      }),
    ]);
    const newStatus = claimStatusForOutcome(parsed.data);
    await transitionCase(serviceClient, {
        merchantId: ctx.merchantId,
        caseId: claimId,
        expectedVersion: claim.state_version ?? 1,
        patch: { status: newStatus, payoutDecisionState: 'decision_recorded' },
        reason: parsed.data.notes ?? null,
        actorUserId: user.id,
        triggeredBy: 'merchant_manual',
        eventType: 'case.decision_recorded',
        eventPayload: {
          action: parsed.data.decision === 'full_refund' || parsed.data.decision === 'partial_refund' || parsed.data.decision === 'approved' ? 'refund' : parsed.data.decision,
          amount_minor: outcome.amount_refunded == null ? null : Math.round(outcome.amount_refunded * 100),
          currency: claim.currency ?? null,
          outcome_id: outcome.id,
        },
        claimEventType: 'outcome_added',
        claimEventDetails: {
          previousDecision: previous?.decision ?? null,
          newDecision: outcome.decision,
          previousOutcome: previous?.outcome ?? null,
          newOutcome: outcome.outcome,
          metadata: {
            outcome_id: outcome.id,
            amount_refunded: outcome.amount_refunded ?? null,
            amount_recovered: outcome.amount_recovered ?? null,
            recommended_payout_action: recommendedAtDecision,
            followed_recommendation: followedRecommendation,
          },
        },
      });
    await appendClaimEvent(serviceClient, {
      claim_id: claimId,
      merchant_id: ctx.merchantId,
      event_type: newStatus === 'escalated' ? 'escalation_added' : 'claim_resolved',
      previous_status: claim.status,
      new_status: newStatus,
      new_decision: outcome.decision,
      new_outcome: outcome.outcome,
      note: parsed.data.notes ?? null,
      actor_user_id: user.id,
      triggered_by: 'merchant_manual',
      metadata: { triggered_by: 'merchant_manual', outcome_id: outcome.id },
    });
    if (claim.source_ticket_id) {
      const { data: ticket } = await serviceClient
        .from('source_tickets')
        .select('provider,external_id')
        .eq('id', claim.source_ticket_id)
        .eq('merchant_id', ctx.merchantId)
        .maybeSingle();
      if (ticket?.provider === 'gorgias') {
        resolveHoldTag({
          client: serviceClient,
          merchantId: ctx.merchantId,
          ticketId: ticket.external_id,
          decision: outcome.decision,
          caseUrl: `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/claims?focus=${encodeURIComponent(claimId)}`,
        }).catch((error) => {
          console.warn('gorgias_hold_tag_resolution_failed', {
            claim_id: claimId,
            message: error instanceof Error ? error.message : String(error),
          });
        });
      }
    }
    return NextResponse.json({ outcome: { id: outcome.id, claim_id: outcome.claim_id, decision: outcome.decision, outcome: outcome.outcome } });
  } catch (err) {
    if (err instanceof CaseTransitionRejectedError || err instanceof CaseVersionConflictError) {
      return NextResponse.json({ error: 'Illegal claim status transition.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to add outcome' }, { status: 500 });
  }
}
