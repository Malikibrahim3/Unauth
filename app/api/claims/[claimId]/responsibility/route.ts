import { NextResponse } from 'next/server';
import { loadClaimForMerchant } from '@/lib/claims/access';
import {
  authorizeInvestigationRequest,
  investigationErrorResponse,
} from '@/lib/investigations/routeAuth';
import {
  idempotencyKeyFrom,
  recordCaseResponsibilitySchema,
} from '@/lib/investigations/validation';
import { PERMISSIONS } from '@/lib/permissions';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const auth = await authorizeInvestigationRequest(
    request,
    PERMISSIONS.SUBMIT_PAYOUT_DECISIONS,
  );
  if (auth.response) return auth.response;
  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(
    auth.service,
    claimId,
    auth.ctx.merchantId,
  );
  if (!loaded.claim) {
    return NextResponse.json(
      { error: 'Support payout case not found' },
      { status: 404 },
    );
  }
  const idempotencyKey = idempotencyKeyFrom(request);
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'A valid Idempotency-Key header is required.' },
      { status: 400 },
    );
  }
  const parsed = recordCaseResponsibilitySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid responsibility confirmation.',
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }
  const input = parsed.data;
  try {
    const { data, error } = await auth.mutationClient.rpc(
      'record_case_responsibility',
      {
        p_merchant_id: auth.ctx.merchantId,
        p_case_id: claimId,
        p_expected_version: input.expected_version,
        p_loss_attribution: input.loss_attribution,
        p_attribution_confidence: input.attribution_confidence,
        p_recovery_owner: input.recovery_owner,
        p_recoverability: input.recoverability,
        p_supporting_evidence_ids: input.supporting_evidence_ids,
        p_conflicting_evidence_ids: input.conflicting_evidence_ids,
        p_rationale: input.rationale ?? null,
        p_actor_user_id: auth.user.id,
        p_idempotency_key: idempotencyKey,
      },
    );
    if (error) {
      const message = error.message ?? '';
      if (error.code === '40001' || /conflict|protected/.test(message)) {
        return NextResponse.json(
          {
            error: 'The case changed while responsibility was being confirmed.',
            code: message,
          },
          { status: 409 },
        );
      }
      if (error.code === 'P0002' || message.includes('not_found')) {
        return NextResponse.json(
          { error: 'Case evidence not found.' },
          { status: 404 },
        );
      }
      if (/rationale|required|invalid|cannot_support/.test(message)) {
        return NextResponse.json(
          { error: 'Responsibility confirmation does not satisfy the case rules.', code: message },
          { status: 422 },
        );
      }
      throw new Error(message);
    }
    return NextResponse.json({ responsibility: data });
  } catch (error) {
    return investigationErrorResponse(error);
  }
}
