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
    if (firstView) {
      await appendClaimEvent(serviceClient, {
        claim_id: claimId,
        merchant_id: ctx.merchantId,
        shop_domain: claim.shop_domain,
        event_type: 'claim_viewed',
        actor_user_id: user.id,
        metadata: { first_view: true },
      });
    }
    return NextResponse.json({
      claim: {
        id: claimId,
        first_viewed_at: updated.first_viewed_at ?? claim.first_viewed_at ?? null,
        first_viewed_by: updated.first_viewed_by ?? claim.first_viewed_by ?? null,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to mark claim viewed' }, { status: 500 });
  }
}
