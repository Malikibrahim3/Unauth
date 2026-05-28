import ClaimReviewPanel from '@/components/claims/ClaimReviewPanel';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { loadClaimForMerchant, markClaimViewed } from '@/lib/claims/access';
import { appendClaimEvent } from '@/lib/claims/events';

interface Props {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ claimId?: string }>;
}

async function markClaimViewedOnOpen(claimId: string) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return;

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_FRAUD_FEEDBACK);
  if (denied || !ctx) return;

  const loaded = await loadClaimForMerchant(serviceClient, claimId, ctx.merchantId);
  if (!loaded.claim || loaded.denied) return;
  if (loaded.claim.first_viewed_at) return;

  try {
    const updated = await markClaimViewed(serviceClient, loaded.claim, ctx.merchantId, user.id);
    if (updated._viewRecorded) {
      await appendClaimEvent(serviceClient, {
        claim_id: claimId,
        merchant_id: ctx.merchantId,
        shop_domain: loaded.claim.shop_domain,
        event_type: 'claim_viewed',
        actor_user_id: user.id,
        metadata: { first_view: true },
      });
    }
  } catch {
    // Client panel retries via /api/claims/:id/view
  }
}

export default async function CustomerClaimReviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const claimId = sp.claimId ?? null;

  if (claimId) {
    await markClaimViewedOnOpen(claimId);
  }

  return <ClaimReviewPanel profileId={id} initialClaimId={claimId} />;
}
