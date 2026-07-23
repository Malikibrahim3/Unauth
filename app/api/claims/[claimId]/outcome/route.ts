import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { recordCaseDecisionSchema, recordMerchantCaseDecision } from '@/lib/claims/store';
import { computeFollowedRecommendation } from '@/lib/payouts/recommendation';
import { applyPolicyOverrideAttribution } from '@/lib/payouts/attribution';
import type { AttributionConfidence, LossAttributionLabel, PayoutRecommendation } from '@/lib/payouts/types';
import { TABLES } from '@/lib/supabase/tables';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { resolveHoldTag } from '@/lib/gorgias/applyHoldTag';
import { getAppUrl } from '@/lib/utils/appUrl';
import { normalizeApiIdempotencyKey } from '@/lib/api/v1/ingest/requestIdempotency';

const MONETARY_DECISIONS = new Set([
  'approved',
  'partial_refund',
  'full_refund',
  'denied',
  'no_action',
]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (denied) return denied;

  const idempotencyKey = normalizeApiIdempotencyKey(request.headers.get('idempotency-key'));
  if (!idempotencyKey || idempotencyKey.length < 8) {
    return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  }

  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(serviceClient, claimId, ctx.merchantId);
  if (loaded.denied === 'not_found') return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  if (loaded.denied === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const claim = loaded.claim!;

  const body = await request.json().catch(() => null);
  const parsed = recordCaseDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid decision payload', issues: parsed.error.flatten() }, { status: 400 });
  }
  if (MONETARY_DECISIONS.has(parsed.data.decision) && (
    parsed.data.amount_minor == null || parsed.data.currency == null
  )) {
    return NextResponse.json({ error: 'This decision requires an explicit amount and ISO currency.' }, { status: 400 });
  }

  const { data: claimRecommendationRow, error: recommendationError } = await serviceClient
    .from(TABLES.MERCHANT_CLAIMS)
    .select('recommended_payout_action,loss_attribution,attribution_confidence')
    .eq('id', claimId)
    .eq('merchant_id', ctx.merchantId)
    .maybeSingle();
  if (recommendationError) {
    return NextResponse.json({ error: 'Could not load the recommendation snapshot.' }, { status: 500 });
  }

  const recommendedAtDecision =
    (claimRecommendationRow?.recommended_payout_action as PayoutRecommendation | null) ?? null;
  const followedRecommendation = computeFollowedRecommendation({
    recommendedAction: recommendedAtDecision,
    decision: parsed.data.decision,
    outcome: 'pending',
  });
  if (followedRecommendation === false && !parsed.data.notes?.trim()) {
    return NextResponse.json({ error: 'Explain why this decision overrides the recorded recommendation.' }, { status: 400 });
  }

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

  try {
    const outcome = await recordMerchantCaseDecision(serviceClient, {
      ...parsed.data,
      merchantId: ctx.merchantId,
      caseId: claimId,
      expectedVersion: claim.state_version ?? 1,
      actorUserId: user.id,
      idempotencyKey,
      recommended_payout_action: recommendedAtDecision,
      followed_recommendation: followedRecommendation,
      relatedSourceObject: {
        source_order_id: claim.source_order_id ?? null,
        source_ticket_id: claim.source_ticket_id ?? null,
        attribution_snapshot: {
          before: priorAttributionLabel,
          after: reclassified.label,
          confidence: reclassified.confidence,
        },
      },
    });

    let connectorFollowUp: { attempted: boolean; ok: boolean; error?: string } = {
      attempted: false,
      ok: false,
      error: 'not_applicable',
    };
    if (claim.source_ticket_id) {
      const { data: ticket } = await serviceClient
        .from('source_tickets')
        .select('provider,external_id')
        .eq('id', claim.source_ticket_id)
        .eq('merchant_id', ctx.merchantId)
        .maybeSingle();
      if (ticket?.provider === 'gorgias') {
        connectorFollowUp = await resolveHoldTag({
          client: serviceClient,
          merchantId: ctx.merchantId,
          ticketId: ticket.external_id,
          decision: outcome.decision,
          caseUrl: `${getAppUrl()}/claims?focus=${encodeURIComponent(claimId)}`,
        });
      }
    }

    return NextResponse.json({
      outcome: {
        id: outcome.id,
        decision_id: outcome.decision_id,
        claim_id: outcome.claim_id,
        decision: outcome.decision,
        outcome: outcome.outcome,
        amount_minor: outcome.amount_minor,
        currency: outcome.currency,
      },
      projection: {
        domain_event_id: outcome.domain_event_id,
        state: 'queued',
        note: 'Authorization is recorded. No refund, replacement, credit, or recovery is treated as paid until a source outcome is reconciled.',
      },
      connector_follow_up: connectorFollowUp,
      replayed: outcome.replayed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('case_version_conflict') || message.includes('idempotency_conflict')) {
      return NextResponse.json({ error: 'The claim changed or this idempotency key was reused with different details.' }, { status: 409 });
    }
    if (message.includes('required') || message.includes('invalid') || message.includes('rejected')) {
      return NextResponse.json({ error: 'The decision does not satisfy the case transition contract.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to record decision' }, { status: 500 });
  }
}
