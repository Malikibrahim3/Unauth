import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { createCaseComment, createCommentSchema, listCaseComments } from '@/lib/collaboration/comments';
import { loadClaimForMerchant } from '@/lib/claims/access';

export const dynamic = 'force-dynamic';

async function context(claimId: string, permission: typeof PERMISSIONS[keyof typeof PERMISSIONS]) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const serviceClient = createServiceClient();
  const auth = await requirePermission(serviceClient, user.id, permission);
  if (auth.denied || !auth.ctx) return { response: auth.denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  const loaded = await loadClaimForMerchant(serviceClient, claimId, auth.ctx.merchantId);
  if (!loaded.claim) return { response: NextResponse.json({ error: 'Case not found' }, { status: loaded.denied === 'forbidden' ? 403 : 404 }) };
  return { user, serviceClient, ctx: auth.ctx };
}

export async function GET(_request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = await params;
  const auth = await context(claimId, PERMISSIONS.VIEW_INBOX);
  if ('response' in auth) return auth.response;
  return NextResponse.json({ comments: await listCaseComments(auth.serviceClient, auth.ctx.merchantId, claimId) });
}

export async function POST(request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = await params;
  const auth = await context(claimId, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if ('response' in auth) return auth.response;
  const parsed = createCommentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid comment', details: parsed.error.flatten() }, { status: 400 });
  try {
    const comment = await createCaseComment(auth.serviceClient, {
      merchantId: auth.ctx.merchantId,
      caseId: claimId,
      authorUserId: auth.user.id,
      ...parsed.data,
    });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'comment_mentions_non_member') {
      return NextResponse.json({ error: 'Mentioned users must be active members' }, { status: 400 });
    }
    throw error;
  }
}
