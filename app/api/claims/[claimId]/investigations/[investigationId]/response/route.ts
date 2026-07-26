import { NextResponse } from 'next/server';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { evaluateClaimDecision } from '@/lib/claims/decision/evaluate';
import { PERMISSIONS } from '@/lib/permissions';
import {
  authorizeInvestigationRequest,
  investigationErrorResponse,
} from '@/lib/investigations/routeAuth';
import { projectInvestigationResponseEvidence } from '@/lib/investigations/response';
import { transitionInvestigation } from '@/lib/investigations/store';
import {
  idempotencyKeyFrom,
  recordInvestigationResponseSchema,
} from '@/lib/investigations/validation';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ claimId: string; investigationId: string }> },
) {
  const auth = await authorizeInvestigationRequest(
    request,
    PERMISSIONS.SUBMIT_PAYOUT_DECISIONS,
    { requireWriteFeature: true },
  );
  if (auth.response) return auth.response;
  const { claimId, investigationId } = await params;
  const loaded = await loadClaimForMerchant(auth.service, claimId, auth.ctx.merchantId);
  if (!loaded.claim) return NextResponse.json({ error: 'Support payout case not found' }, { status: 404 });
  const idempotencyKey = idempotencyKeyFrom(request);
  if (!idempotencyKey) return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  const parsed = recordInvestigationResponseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid structured response.', issues: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const { expected_version, case_version, ...patch } = parsed.data;
    const investigation = await transitionInvestigation(auth.mutationClient, {
      merchantId: auth.ctx.merchantId,
      caseId: claimId,
      investigationId,
      expectedVersion: expected_version,
      action: 'response',
      patch: {
        ...patch,
        case_version: case_version ?? loaded.claim.state_version ?? 1,
      },
      actorUserId: auth.user.id,
      idempotencyKey,
    });

    let evidenceStatus: 'written' | 'pending_retry' = 'written';
    let reevaluationStatus: 'completed' | 'pending_retry' = 'completed';
    let evidence: Record<string, unknown> | null = null;
    let recommendation = null;
    try {
      evidence = await projectInvestigationResponseEvidence(
        auth.mutationClient,
        investigation,
        auth.user.id,
      );
    } catch {
      evidenceStatus = 'pending_retry';
    }
    try {
      const reevaluated = await evaluateClaimDecision({
        client: auth.mutationClient,
        merchantId: auth.ctx.merchantId,
        claimId,
        actorId: auth.user.id,
        source: 'claim_review',
        attachDeliveryEvidence: false,
      });
      recommendation = reevaluated?.payoutCase.recommendation ?? null;
    } catch {
      reevaluationStatus = 'pending_retry';
    }

    return NextResponse.json(
      {
        investigation,
        evidence,
        evidence_status: evidenceStatus,
        reevaluation_status: reevaluationStatus,
        recommendation,
      },
      { status: evidenceStatus === 'written' && reevaluationStatus === 'completed' ? 200 : 202 },
    );
  } catch (error) {
    return investigationErrorResponse(error);
  }
}
