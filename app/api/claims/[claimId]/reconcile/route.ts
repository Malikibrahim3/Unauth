import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { refreshCaseReconciliation } from '@/lib/reconciliation/caseStore';

export const dynamic = 'force-dynamic';

/**
 * POST /api/claims/[claimId]/reconcile
 *
 * Explicitly refreshes the item/parcel evidence graph and appends changed
 * customer-action, responsibility, and recovery recommendation snapshots.
 * Loading a case or the Gorgias widget never performs this write.
 */
export async function POST(request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(
    serviceClient,
    user.id,
    PERMISSIONS.SUBMIT_PAYOUT_DECISIONS,
  );
  if (denied) return denied;

  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(serviceClient, claimId, ctx.merchantId);
  if (loaded.denied === 'not_found') return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  if (loaded.denied === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim();
  if (!idempotencyKey) {
    return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  }

  let body: { now?: string; expected_version?: number } = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === 'object') {
      body = {
        now: typeof parsed.now === 'string' ? parsed.now : undefined,
        expected_version: Number.isInteger(parsed.expected_version) ? parsed.expected_version : undefined,
      };
    }
  } catch {
    // A malformed or empty body still fails below because expected_version is required.
  }
  if (body.expected_version == null) {
    return NextResponse.json({ error: 'expected_version is required.' }, { status: 400 });
  }
  if (Number(loaded.claim?.state_version ?? 1) !== body.expected_version) {
    return NextResponse.json(
      { error: 'The case changed before reconciliation. Refresh and try again.', code: 'case_version_conflict' },
      { status: 409 },
    );
  }

  try {
    const reconciliation = await refreshCaseReconciliation(
      serviceClient,
      ctx.merchantId,
      claimId,
      { now: body.now },
    );
    if (!reconciliation) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    return NextResponse.json({ reconciliation });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[claims.reconcile] failed', { claimId, merchantId: ctx.merchantId, message });
    return NextResponse.json({ error: 'Failed to reconcile case', message }, { status: 500 });
  }
}
