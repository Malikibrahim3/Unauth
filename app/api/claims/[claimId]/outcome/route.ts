import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import {
  recordCaseDecisionSchema,
  recordMerchantCaseDecision,
  resolveCaseDecisionExpectedVersion,
} from '@/lib/claims/store';
import { computeFollowedRecommendation } from '@/lib/payouts/recommendation';
import { applyPolicyOverrideAttribution } from '@/lib/payouts/attribution';
import type { AttributionConfidence, LossAttributionLabel, PayoutRecommendation } from '@/lib/payouts/types';
import { TABLES } from '@/lib/supabase/tables';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { resolveHoldTag } from '@/lib/gorgias/applyHoldTag';
import { getAppUrl } from '@/lib/utils/appUrl';
import { normalizeApiIdempotencyKey } from '@/lib/api/v1/ingest/requestIdempotency';
import { prepareDecisionHandoff } from '@/lib/claims/externalAction';
import { recordDomainEvent } from '@/lib/events/domainEventStore';
import { computeClaimDecision } from '@/lib/claims/decision/evaluate';
import { buildResolutionComparison } from '@/lib/claims/decision/resolutionComparison';
import { loadReplacementReadModel, recordSameItemReplacement } from '@/lib/claims/replacement';

const MONETARY_DECISIONS = new Set([
  'approved',
  'partial_refund',
  'full_refund',
  'denied',
  'no_action',
]);

const LEGACY_DECISION_FOR_RESOLUTION = {
  full_refund: 'full_refund',
  partial_refund: 'partial_refund',
  same_item_replacement: 'approved',
  request_evidence: 'escalated',
  escalate: 'escalated',
  no_additional_payout: 'no_action',
} as const;

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
  let replayRecommendation: Record<string, unknown> | null = null;
  let replaySourceObject: Record<string, unknown> | null = null;
  let replayFollowed: boolean | null = null;
  if (parsed.data.resolution) {
    const { data: existingDecision, error: replayError } = await serviceClient
      .from('case_decisions')
      .select('support_payout_case_id,action,recommendation_snapshot,followed_recommendation')
      .eq('merchant_id', ctx.merchantId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (replayError) return NextResponse.json({ error: 'Could not verify decision retry safety.' }, { status: 503 });
    if (existingDecision) {
      if (existingDecision.support_payout_case_id !== claimId || existingDecision.action !== parsed.data.resolution) {
        return NextResponse.json({ error: 'This idempotency key was already used for another decision.' }, { status: 409 });
      }
      const stored = existingDecision.recommendation_snapshot && typeof existingDecision.recommendation_snapshot === 'object'
        ? existingDecision.recommendation_snapshot as Record<string, unknown>
        : {};
      const storedComparison = stored.comparison && typeof stored.comparison === 'object'
        ? stored.comparison as Record<string, unknown>
        : null;
      if (
        !storedComparison
        || parsed.data.comparison_version !== stored.comparison_version
        || parsed.data.comparison_token !== stored.comparison_token
      ) {
        return NextResponse.json({ error: 'This retry does not match the original decision comparison.' }, { status: 409 });
      }
      parsed.data.comparison_snapshot = storedComparison;
      replaySourceObject = stored.related_source_object && typeof stored.related_source_object === 'object'
        ? stored.related_source_object as Record<string, unknown> : null;
      replayFollowed = existingDecision.followed_recommendation ?? null;
      replayRecommendation = {
        recommended_payout_action: stored.recommended_payout_action ?? null,
        comparison_version: stored.comparison_version,
        comparison_token: stored.comparison_token,
        comparison: storedComparison,
      };
    }
  }
  if (!parsed.data.resolution && (
    parsed.data.comparison_token
    || parsed.data.comparison_version
    || parsed.data.comparison_snapshot
  )) {
    return NextResponse.json({ error: 'Resolution comparison fields require an exact P04 resolution.' }, { status: 400 });
  }
  if (parsed.data.resolution && (
    !parsed.data.comparison_token
    || !parsed.data.comparison_version
  )) {
    return NextResponse.json({ error: 'Refresh and review the current resolution comparison before confirming.' }, { status: 409 });
  }
  if (parsed.data.resolution && !replayRecommendation) {
    const expectedDecision = LEGACY_DECISION_FOR_RESOLUTION[parsed.data.resolution];
    if (parsed.data.decision !== expectedDecision) {
      return NextResponse.json({ error: 'The exact resolution does not match its legacy decision meaning.' }, { status: 400 });
    }
    const computed = await computeClaimDecision({ client: serviceClient, merchantId: ctx.merchantId, claimId });
    if (!computed) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    const replacement = await loadReplacementReadModel(serviceClient, ctx.merchantId, claimId);
    const currentComparison = buildResolutionComparison({ ...computed, replacement });
    if (
      parsed.data.comparison_version !== currentComparison.version
      || parsed.data.comparison_token !== currentComparison.token
    ) {
      return NextResponse.json({
        error: 'The case, evidence, policy, or cost facts changed. Refresh and review the comparison again.',
        code: 'stale_resolution_comparison',
        current_comparison: currentComparison,
      }, { status: 409 });
    }
    parsed.data.comparison_snapshot = currentComparison;
  }
  const monetaryDecision = parsed.data.resolution
    ? ['full_refund', 'partial_refund', 'same_item_replacement'].includes(parsed.data.resolution)
    : MONETARY_DECISIONS.has(parsed.data.decision);
  if (monetaryDecision && (
    parsed.data.amount_minor == null || parsed.data.currency == null
  )) {
    return NextResponse.json({ error: 'This decision requires an explicit amount and ISO currency.' }, { status: 400 });
  }
  if (parsed.data.resolution && !monetaryDecision && (
    parsed.data.amount_minor != null || parsed.data.currency != null
  )) {
    return NextResponse.json({ error: 'This non-financial resolution must not carry a payout amount.' }, { status: 400 });
  }
  if (parsed.data.resolution === 'same_item_replacement') {
    if (!parsed.data.notes?.trim() || parsed.data.notes.trim().length < 3) {
      return NextResponse.json({ error: 'Add the replacement rationale before authorising it.' }, { status: 400 });
    }
    const replacement = parsed.data.comparison_snapshot?.replacement as
      | { ready?: boolean; items?: Array<{ claimedItemId?: string; availableQuantity?: number }> }
      | null
      | undefined;
    const selected = parsed.data.replacement_items ?? [];
    const uniqueIds = new Set(selected.map((item) => item.claimed_item_id));
    if (!replacement?.ready || selected.length === 0 || uniqueIds.size !== selected.length) {
      return NextResponse.json({ error: 'Choose unique eligible original items for this replacement.' }, { status: 400 });
    }
    const availableById = new Map((replacement.items ?? []).map((item) => [
      item.claimedItemId,
      Number(item.availableQuantity ?? 0),
    ]));
    if (selected.some((item) => item.quantity > (availableById.get(item.claimed_item_id) ?? 0))) {
      return NextResponse.json({ error: 'A replacement quantity exceeds the current eligible quantity.' }, { status: 409 });
    }
    const priorRefundCount = Number((parsed.data.comparison_snapshot?.priorConcession as { count?: number } | undefined)?.count ?? 0);
    if (priorRefundCount > 0 && !parsed.data.duplicate_concession_justification?.trim()) {
      return NextResponse.json({ error: 'Explain why a replacement is appropriate after the prior refund.' }, { status: 400 });
    }
  } else if (parsed.data.replacement_items || parsed.data.duplicate_concession_justification) {
    return NextResponse.json({ error: 'Replacement item fields require the same-item replacement resolution.' }, { status: 400 });
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

  const recommendedAtDecision = replayRecommendation
    ? replayRecommendation.recommended_payout_action as PayoutRecommendation | null
    : (claimRecommendationRow?.recommended_payout_action as PayoutRecommendation | null) ?? null;
  const followedRecommendation = replayRecommendation ? replayFollowed : computeFollowedRecommendation({
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
    const expectedVersion = await resolveCaseDecisionExpectedVersion(serviceClient, {
      merchantId: ctx.merchantId,
      caseId: claimId,
      idempotencyKey,
      currentVersion: claim.state_version ?? 1,
    });
    const relatedSourceObject = replaySourceObject ?? {
        source_order_id: claim.source_order_id ?? null,
        source_ticket_id: claim.source_ticket_id ?? null,
        authorization_snapshot: {
          permission: PERMISSIONS.SUBMIT_PAYOUT_DECISIONS,
          actor_user_id: user.id,
          assigned_to: claim.assigned_to ?? null,
          case_version: parsed.data.comparison_snapshot?.caseVersion ?? claim.state_version ?? 1,
          evidence_version: parsed.data.comparison_snapshot?.evidenceVersion ?? null,
          policy_version: parsed.data.comparison_snapshot?.policyVersion ?? null,
          exact_resolution: parsed.data.resolution ?? parsed.data.decision,
        },
        attribution_snapshot: {
          before: priorAttributionLabel,
          after: reclassified.label,
          confidence: reclassified.confidence,
        },
      };
    const isReplacement = parsed.data.resolution === 'same_item_replacement';
    const outcome = isReplacement
      ? await recordSameItemReplacement(serviceClient, {
          merchantId: ctx.merchantId,
          caseId: claimId,
          expectedVersion,
          actorUserId: user.id,
          idempotencyKey,
          budgetMinor: parsed.data.amount_minor!,
          currency: parsed.data.currency!,
          reason: parsed.data.notes!,
          duplicateConcessionJustification: parsed.data.duplicate_concession_justification,
          items: parsed.data.replacement_items!,
          recommendationSnapshot: replayRecommendation ?? {
              recommended_payout_action: recommendedAtDecision,
              comparison_version: parsed.data.comparison_version,
              comparison_token: parsed.data.comparison_token,
              comparison: parsed.data.comparison_snapshot,
            },
          followedRecommendation,
          relatedSourceObject,
        })
      : await recordMerchantCaseDecision(serviceClient, {
          ...parsed.data,
          merchantId: ctx.merchantId,
          caseId: claimId,
          expectedVersion,
          actorUserId: user.id,
          idempotencyKey,
          recommended_payout_action: recommendedAtDecision,
          followed_recommendation: followedRecommendation,
          relatedSourceObject,
        });

    if (outcome.replayed) {
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
          state: 'unchanged',
          note: 'The original idempotent authorization was returned without repeating provider or projection side effects.',
        },
        connector_follow_up: { attempted: false, ok: false, error: 'idempotent_replay' },
        external_handoff: isReplacement && 'action' in outcome && outcome.action
          ? { status: 'handoff_ready', reason: null, action: outcome.action }
          : { status: 'unchanged', reason: 'idempotent_replay' },
        replayed: true,
      });
    }

    const externalHandoff = isReplacement && 'action' in outcome && outcome.action
      ? { status: 'handoff_ready' as const, reason: null, action: outcome.action }
      : await prepareDecisionHandoff(serviceClient, {
          merchantId: ctx.merchantId,
          actorUserId: user.id,
          caseId: claimId,
          sourceOrderId: claim.source_order_id,
          requestedAction: claim.requested_action,
          issueReason: claim.reason_raw ?? claim.reason_normalized,
          decision: {
            id: outcome.decision_id,
            decision: outcome.decision,
            amountMinor: outcome.amount_minor,
            currency: outcome.currency,
          },
        });
    const handoffAction = externalHandoff.action as Record<string, unknown> | null;
    if (!isReplacement && externalHandoff.status === 'handoff_ready' && typeof handoffAction?.id === 'string') {
      await recordDomainEvent(serviceClient, {
        merchantId: ctx.merchantId,
        eventType: 'external_action.handoff_ready',
        aggregateType: 'external_action',
        aggregateId: handoffAction.id,
        idempotencyKey: `external-action:${handoffAction.id}:handoff-ready`,
        payload: {
          action_id: handoffAction.id,
          case_id: claimId,
          capability_id: handoffAction.capability_id,
          state_version: Number(handoffAction.state_version ?? 1),
        },
        actorType: 'user',
        actorId: user.id,
        handlers: ['auditTimelineProjection'],
      });
    }

    let connectorFollowUp: { attempted: boolean; ok: boolean; error?: string } = {
      attempted: false,
      ok: false,
      error: 'not_applicable',
    };
    if (!isReplacement && claim.source_ticket_id) {
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
          caseUrl: `${getAppUrl()}/cases?selected=${encodeURIComponent(claimId)}`,
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
      external_handoff: externalHandoff,
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
