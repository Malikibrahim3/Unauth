import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { loadClaimForMerchant, markClaimViewed } from '@/lib/claims/access';
import { appendClaimEvent } from '@/lib/claims/events';

export async function POST(_request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_FRAUD_FEEDBACK);
  if (denied) return denied;

  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(serviceClient, claimId, ctx.merchantId);
  if (loaded.denied === 'not_found') return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  if (loaded.denied === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const claim = loaded.claim!;
  try {
    const firstView = !claim.first_viewed_at;
    const updated = firstView ? await markClaimViewed(serviceClient, claim, ctx.merchantId, user.id) : claim;
    if (firstView && updated._viewRecorded) {
      // The view has already been persisted at this point. Treat the timeline
      // event append as best-effort so an event-log failure cannot turn a
      // successful view-record into a user-facing 500.
      try {
        await appendClaimEvent(serviceClient, {
          claim_id: claimId,
          merchant_id: ctx.merchantId,
          event_type: 'claim_viewed',
          actor_user_id: user.id,
          metadata: { first_view: true },
        });
      } catch (eventError) {
        console.error('[claims.view] claim_viewed event append failed (non-fatal)', {
          claimId,
          merchantId: ctx.merchantId,
          message: eventError instanceof Error ? eventError.message : String(eventError),
        });
      }
    }
    return NextResponse.json({
      claim: {
        id: claimId,
        // v2 claims tracks first_viewed_at only; there is no first_viewed_by column.
        first_viewed_at: updated.first_viewed_at ?? claim.first_viewed_at ?? null,
      },
    });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const details = error?.details ?? null;
    const hint = error?.hint ?? null;
    const code = error?.code ?? null;
    console.error('[claims.view] failed', {
      claimId,
      merchantId: ctx.merchantId,
      userId: user.id,
      message,
      details,
      hint,
      code,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to mark claim viewed',
        message,
        details,
        hint,
        code,
      },
      { status: 500 },
    );
  }
}
