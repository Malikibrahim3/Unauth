import { redirect } from 'next/navigation';
import ClaimReviewPanel from '@/components/claims/ClaimReviewPanel';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import { getRequestServiceClient, getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { authorizeClaimForMerchant, fetchClaimById } from '@/lib/claims/access';
import { TABLES } from '@/lib/supabase/tables';
import type { CaseFinancialSummary } from '@/components/claims/payout/CaseFinancialHistoryCard';
import type { ClaimRecord } from '@/components/claims/claimReviewTypes';

export async function CaseDetailRoute({
  claimId,
  caseBasePath = '/cases',
}: {
  claimId: string;
  caseBasePath?: '/cases';
}) {
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const serviceClient = getRequestServiceClient();
  const [ctx, claimRow] = await Promise.all([
    requirePagePermission(PERMISSIONS.VIEW_INBOX),
    fetchClaimById(serviceClient, claimId),
  ]);
  if (!ctx) redirect('/overview');

  const loaded = authorizeClaimForMerchant(claimRow, ctx.merchantId);
  if (!loaded.claim) redirect(caseBasePath);

  const [canManage, sourceOrderResult, identityStateResult, financialResult] = await Promise.all([
    hasPermission(serviceClient, ctx, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS),
    loaded.claim.source_order_id
      ? serviceClient
        .from(TABLES.SOURCE_ORDERS)
        .select('external_id,order_number,source_customer_id,source_customer:source_customers(first_name,last_name)')
        .eq('merchant_id', ctx.merchantId)
        .eq('id', loaded.claim.source_order_id)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    loaded.claim.identity_id
      ? serviceClient
        .from(TABLES.MERCHANT_IDENTITY_STATE)
        .select('display_name')
        .eq('merchant_id', ctx.merchantId)
        .eq('identity_id', loaded.claim.identity_id)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    serviceClient
      .from(TABLES.CASE_FINANCIAL_SUMMARIES)
      .select('support_payout_case_id,currency,requested_minor,exposed_minor,approved_minor,paid_minor,estimated_loss_minor,confirmed_loss_minor,recoverable_minor,recovered_minor,prevented_minor,written_off_minor,known_states,updated_at')
      .eq('merchant_id', ctx.merchantId)
      .eq('support_payout_case_id', claimId)
      .order('currency', { ascending: true }),
  ]);

  const sourceCustomerId = sourceOrderResult.data?.source_customer_id ?? null;
  const sourceCustomer = sourceOrderResult.data?.source_customer as
    | { first_name: string | null; last_name: string | null }
    | { first_name: string | null; last_name: string | null }[]
    | null
    | undefined;
  const sourceCustomerRow = Array.isArray(sourceCustomer) ? sourceCustomer[0] : sourceCustomer;
  const sourceCustomerName = [sourceCustomerRow?.first_name, sourceCustomerRow?.last_name]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ');

  const initialClaim: ClaimRecord = {
    id: loaded.claim.id,
    status: loaded.claim.status,
    claim_type: loaded.claim.claim_type ?? undefined,
    customer_name: sourceCustomerName || identityStateResult.data?.display_name || null,
    shopify_order_id: sourceOrderResult.data?.external_id ?? null,
    order_ref: sourceOrderResult.data?.order_number ?? null,
    requested_action: loaded.claim.requested_action ?? 'unknown',
    amount_at_risk: loaded.claim.amount_at_risk ?? null,
    currency: loaded.claim.currency ?? null,
    submitted_at: loaded.claim.submitted_at ?? null,
    created_at: loaded.claim.created_at ?? null,
    updated_at: loaded.claim.updated_at ?? null,
    assigned_to: loaded.claim.assigned_to ?? null,
  };

  return (
    <ClaimReviewPanel
      profileId={loaded.claim.identity_id ?? ''}
      sourceCustomerId={sourceCustomerId}
      initialClaimId={claimId}
      initialClaim={initialClaim}
      canManage={canManage}
      financialSummaries={(financialResult.data ?? []) as CaseFinancialSummary[]}
      caseBasePath={caseBasePath}
    />
  );
}
