import { redirect } from 'next/navigation';
import ClaimReviewPanel from '@/components/claims/ClaimReviewPanel';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, hasPermission, requirePermission } from '@/lib/permissions';
import { loadClaimForMerchant } from '@/lib/claims/access';

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

  // Managing a case (record decision/outcome, evidence, transitions, assignment)
  // requires the payout-decision permission; viewers get a read-only workbench.
  const canManage = await hasPermission(serviceClient, ctx, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);

  // The customer/identity is secondary context for the workbench. Identity-less
  // cases still render; the panel degrades gracefully when there is no profile.
  return <ClaimReviewPanel profileId={loaded.claim.identity_id ?? ''} initialClaimId={claimId} canManage={canManage} />;
}
