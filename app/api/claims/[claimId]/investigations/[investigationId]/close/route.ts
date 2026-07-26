import { NextResponse } from 'next/server';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { PERMISSIONS } from '@/lib/permissions';
import {
  authorizeInvestigationRequest,
  investigationErrorResponse,
} from '@/lib/investigations/routeAuth';
import { transitionInvestigation } from '@/lib/investigations/store';
import {
  closeInvestigationSchema,
  idempotencyKeyFrom,
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
  const parsed = closeInvestigationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid investigation closure.' }, { status: 400 });
  try {
    const { expected_version, case_version, no_response, ...patch } = parsed.data;
    const investigation = await transitionInvestigation(auth.mutationClient, {
      merchantId: auth.ctx.merchantId,
      caseId: claimId,
      investigationId,
      expectedVersion: expected_version,
      action: 'close',
      patch: {
        ...patch,
        ...(no_response ? { response_outcome: 'no_response' } : {}),
        case_version: case_version ?? loaded.claim.state_version ?? 1,
      },
      actorUserId: auth.user.id,
      idempotencyKey,
    });
    return NextResponse.json({ investigation });
  } catch (error) {
    return investigationErrorResponse(error);
  }
}
