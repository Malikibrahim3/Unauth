import { redirect } from 'next/navigation';
import ClaimReviewPanel from '@/components/claims/ClaimReviewPanel';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { resolveClaimSourceCustomerId } from '@/lib/claims/customerContext';
import { TABLES } from '@/lib/supabase/tables';
import type { CaseFinancialSummary } from '@/components/claims/payout/CaseFinancialHistoryCard';

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

  const user = await getRequestUser();
  if (!user) redirect('/login');

  const serviceClient = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) redirect('/dashboard');

  // Case-first load: resolve the payout case before any customer context.
  const loaded = await loadClaimForMerchant(serviceClient, claimId, ctx.merchantId);
  if (!loaded.claim) redirect('/claims');

  // Managing a case (record decision/outcome, evidence, transitions, assignment)
  // requires the payout-decision permission; viewers get a read-only workbench.
  const [canManage, sourceCustomerId, financialResult] = await Promise.all([
    hasPermission(serviceClient, ctx, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS),
    resolveClaimSourceCustomerId(
      serviceClient as never,
      ctx.merchantId,
      loaded.claim.source_order_id ?? null,
    ),
    serviceClient
      .from(TABLES.CASE_FINANCIAL_SUMMARIES)
      .select('support_payout_case_id,currency,requested_minor,exposed_minor,approved_minor,paid_minor,estimated_loss_minor,confirmed_loss_minor,recoverable_minor,recovered_minor,prevented_minor,written_off_minor,known_states,updated_at')
      .eq('merchant_id', ctx.merchantId)
      .eq('support_payout_case_id', claimId)
      .order('currency', { ascending: true }),
  ]);

  // The customer/identity is secondary context for the workbench. Identity-less
  // cases still render; the panel degrades gracefully when there is no profile.
  return (
    <ClaimReviewPanel
      profileId={loaded.claim.identity_id ?? ''}
      sourceCustomerId={sourceCustomerId}
      initialClaimId={claimId}
      canManage={canManage}
      financialSummaries={(financialResult.data ?? []) as CaseFinancialSummary[]}
    />
  );
}
