import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CASE_ISSUES } from '@/lib/claims/caseIssue';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { evaluateClaimDecision } from '@/lib/claims/decision/evaluate';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { getClientIp } from '@/lib/ratelimit';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const issueBodySchema = z.object({
  issue: z.enum(CASE_ISSUES),
  rationale: z.string().trim().min(5).max(2000),
  expected_version: z.number().int().min(1),
  idempotency_key: z.string().trim().min(8).max(200).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(
    service,
    user.id,
    PERMISSIONS.SUBMIT_PAYOUT_DECISIONS,
  );
  if (denied) return denied;

  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(service, claimId, ctx.merchantId);
  if (loaded.denied === 'not_found') {
    return NextResponse.json({ error: 'Support payout case not found' }, { status: 404 });
  }
  if (loaded.denied === 'forbidden') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = issueBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Issue, rationale, and expected case version are required.' },
      { status: 400 },
    );
  }

  const headerKey = request.headers.get('idempotency-key')?.trim();
  const idempotencyKey = parsed.data.idempotency_key ?? headerKey;
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    return NextResponse.json({ error: 'A valid idempotency key is required.' }, { status: 400 });
  }

  const mutationClient = createServiceClient({
    audit: {
      actorId: user.id,
      actorRole: ctx.role,
      requestIp: getClientIp(request.headers),
    },
  });

  const { data, error } = await mutationClient.rpc('correct_case_issue', {
    p_merchant_id: ctx.merchantId,
    p_case_id: claimId,
    p_expected_version: parsed.data.expected_version,
    p_issue: parsed.data.issue,
    p_rationale: parsed.data.rationale,
    p_actor_user_id: user.id,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    if (error.code === '40001' || error.message?.includes('case_version_conflict')) {
      return NextResponse.json(
        { error: 'Case was updated by another user. Refresh and try again.' },
        { status: 409 },
      );
    }
    if (error.code === '23505' || error.message?.includes('idempotency_conflict')) {
      return NextResponse.json(
        { error: 'Idempotency key was already used for a different correction.' },
        { status: 409 },
      );
    }
    if (error.message?.includes('case_issue_unchanged')) {
      return NextResponse.json({ error: 'The case already has this issue.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to correct case issue.' }, { status: 500 });
  }

  const refreshed = await evaluateClaimDecision({
    client: mutationClient,
    merchantId: ctx.merchantId,
    claimId,
    actorId: user.id,
    source: 'claim_review',
    attachDeliveryEvidence: false,
  });

  return NextResponse.json({
    correction: data,
    recommendation: refreshed?.payoutCase.recommendation ?? null,
    payout_case: refreshed?.payoutCase ?? null,
  });
}

