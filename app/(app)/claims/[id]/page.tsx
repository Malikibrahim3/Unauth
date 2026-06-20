import { redirect } from 'next/navigation';
import ClaimReviewPanel from '@/components/claims/ClaimReviewPanel';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { loadClaimForMerchant, markClaimViewed } from '@/lib/claims/access';
import { appendClaimEvent } from '@/lib/claims/events';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * First-class Support Payout Case review route.
 *
 * This is the canonical workbench entry point: the payout case is loaded
 * first, and the customer/order are layered in as secondary context. The
 * customer-scoped `/customers/[id]/claims` route now redirects here.
 */
export default async function SupportPayoutCasePage({ params }: Props) {
  const { id: claimId } = await params;

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied || !ctx) redirect('/dashboard');

  // Case-first load: resolve the payout case before any customer context.
  const loaded = await loadClaimForMerchant(serviceClient, claimId, ctx.merchantId);
  if (!loaded.claim) redirect('/claims');

  const payoutCase = loaded.claim;

  // Record first view (best-effort; the client panel retries via the view API).
  if (!payoutCase.first_viewed_at) {
    try {
      const updated = await markClaimViewed(serviceClient, payoutCase, ctx.merchantId, user.id);
      if (updated._viewRecorded) {
        await appendClaimEvent(serviceClient, {
          claim_id: claimId,
          merchant_id: ctx.merchantId,
          event_type: 'claim_viewed',
          actor_user_id: user.id,
          metadata: { first_view: true },
        });
      }
    } catch {
      // Non-fatal — client panel retries via /api/claims/:id/view.
    }
  }

  // The customer/identity is secondary context for the workbench. Identity-less
  // cases still render; the panel degrades gracefully when there is no profile.
  return <ClaimReviewPanel profileId={payoutCase.identity_id ?? ''} initialClaimId={claimId} />;
}
