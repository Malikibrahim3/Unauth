import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { deleteCaseComment, editCaseComment, editCommentSchema } from '@/lib/collaboration/comments';
import { loadClaimForMerchant } from '@/lib/claims/access';

export const dynamic = 'force-dynamic';

async function context(claimId: string) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const serviceClient = createServiceClient();
  const auth = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (auth.denied || !auth.ctx) return { response: auth.denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  const loaded = await loadClaimForMerchant(serviceClient, claimId, auth.ctx.merchantId);
  if (!loaded.claim) return { response: NextResponse.json({ error: 'Case not found' }, { status: loaded.denied === 'forbidden' ? 403 : 404 }) };
  return { user, serviceClient, ctx: auth.ctx };
}

function statusForReason(reason?: string): number {
  if (reason === 'not_found') return 404;
  if (reason === 'forbidden') return 403;
  if (reason === 'deleted') return 409;
  return 422;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ claimId: string; commentId: string }> }) {
  const { claimId, commentId } = await params;
  const auth = await context(claimId);
  if ('response' in auth) return auth.response;
  const parsed = editCommentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid comment body' }, { status: 400 });

  const result = await editCaseComment(auth.serviceClient, {
    merchantId: auth.ctx.merchantId, caseId: claimId, commentId, actorUserId: auth.user.id, body: parsed.data.body,
  });
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: statusForReason(result.reason) });
  return NextResponse.json({ comment: result.comment });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ claimId: string; commentId: string }> }) {
  const { claimId, commentId } = await params;
  const auth = await context(claimId);
  if ('response' in auth) return auth.response;

  const result = await deleteCaseComment(auth.serviceClient, {
    merchantId: auth.ctx.merchantId, caseId: claimId, commentId, actorUserId: auth.user.id,
  });
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: statusForReason(result.reason) });
  return NextResponse.json({ ok: true });
}
