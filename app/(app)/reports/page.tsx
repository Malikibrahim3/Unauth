import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { getMerchantDataPresence } from '@/lib/supabase/getMerchantDataPresence';
import { resolveMerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import { buildClaimOpsMetrics } from '@/lib/claims/reporting';
import { listPartnerRecoveryRules, listPartners } from '@/lib/partners/store';
import { listRecoveryCases } from '@/lib/recoveries/store';
import { ReportsPageView } from '@/app/(app)/reports/ReportsPageView';
import type { ClaimRow, OutcomeRow, ReportsTab, SourcesCoverage } from '@/app/(app)/reports/reportsPageTypes';
import {
  buildClaimTypeBreakdown,
  buildOutcomeBreakdown,
  buildPartnerPerformance,
  buildRecoveryMetrics,
  buildRecoveryStatusBreakdown,
  buildRequestedActionBreakdown,
  liveSetupCta,
} from '@/app/(app)/reports/reportsPageUtils';

function mapOutcomeRow(row: {
  claim_id: string;
  decision: string | null;
  outcome: string | null;
  amount_refunded: number | null;
  amount_recovered: number | null;
  recommended_payout_action: string | null;
  followed_recommendation: boolean | null;
  decided_at: string | null;
  updated_at: string | null;
}): OutcomeRow {
  return {
    claim_id: row.claim_id,
    decision: row.decision,
    outcome: row.outcome,
    amount_refunded: row.amount_refunded,
    amount_recovered: row.amount_recovered,
    recommended_payout_action: row.recommended_payout_action,
    followed_recommendation: row.followed_recommendation,
    decided_at: row.decided_at,
    updated_at: row.updated_at,
    created_at: null,
  };
}

export default async function ReportsPage({ searchParams }: { searchParams?: Promise<{ range?: string; tab?: string }> }) {
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_DASHBOARD);
  if (denied) redirect(await resolveDefaultAppPath(serviceClient, user.id));

  const [connectionState, dataPresence] = await Promise.all([
    getConnectionState(serviceClient, ctx.merchantId),
    getMerchantDataPresence(serviceClient, ctx.merchantId, user.id),
  ]);
  const setupState = resolveMerchantSetupState(connectionState, dataPresence);

  const resolvedSearchParams = (await searchParams) ?? {};
  const range = resolvedSearchParams.range === '7d' || resolvedSearchParams.range === '90d' || resolvedSearchParams.range === 'all'
    ? resolvedSearchParams.range
    : '30d';
  const rawTab = resolvedSearchParams.tab;
  const activeTab: ReportsTab = rawTab === 'recovery' || rawTab === 'integration' ? 'recovery' : 'overview';

  const cutoff = range === 'all'
    ? null
    : new Date(Date.now() - (range === '7d' ? 7 : range === '90d' ? 90 : 30) * 86400000).toISOString();
  const rangeMs = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const priorCutoff = range === 'all'
    ? null
    : new Date(Date.now() - rangeMs * 2 * 86400000).toISOString();
  const priorEnd = range === 'all'
    ? null
    : new Date(Date.now() - rangeMs * 86400000).toISOString();

  let claimsQuery = serviceClient
    .from(TABLES.MERCHANT_CLAIMS)
    .select([
      'id',
      'status',
      'claim_type',
      'amount_at_risk',
      'total_estimated_loss',
      'refund_amount',
      'replacement_item_value',
      'replacement_shipping_cost',
      'discount_amount',
      'store_credit_amount',
      'requested_action',
      'recoverability',
      'recovery_owner',
      'recommended_payout_action',
      'submitted_at',
      'created_at',
      'updated_at',
    ].join(','))
    .eq('merchant_id', ctx.merchantId);
  if (cutoff) claimsQuery = claimsQuery.gte('submitted_at', cutoff);

  let priorClaimsQuery = serviceClient
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id,status,claim_type,amount_at_risk,total_estimated_loss,requested_action,submitted_at,created_at,updated_at')
    .eq('merchant_id', ctx.merchantId);
  if (priorCutoff) priorClaimsQuery = priorClaimsQuery.gte('submitted_at', priorCutoff);
  if (priorEnd) priorClaimsQuery = priorClaimsQuery.lte('submitted_at', priorEnd);

  const [claimsResult, priorClaimResult, allRecoveryCases, partners, partnerRules] = await Promise.all([
    claimsQuery.then((r: { error: unknown; data: ClaimRow[] | null }) => ({ data: r.error ? [] as ClaimRow[] : ((r.data ?? []) as ClaimRow[]) })),
    range === 'all' ? Promise.resolve({ data: [] as ClaimRow[] }) : priorClaimsQuery.then((r: { error: unknown; data: ClaimRow[] | null }) => ({ data: r.error ? [] as ClaimRow[] : ((r.data ?? []) as ClaimRow[]) })),
    listRecoveryCases(serviceClient, ctx.merchantId).catch(() => []),
    listPartners(serviceClient, ctx.merchantId).catch(() => []),
    listPartnerRecoveryRules(serviceClient, ctx.merchantId).catch(() => []),
  ]);
  const claims = claimsResult.data;
  const priorClaims = priorClaimResult.data;
  const recoveryCases = cutoff
    ? allRecoveryCases.filter((recoveryCase) => recoveryCase.created_at >= cutoff || recoveryCase.updated_at >= cutoff)
    : allRecoveryCases;

  const [outcomeResult, priorOutcomeResult] = await Promise.all([
    claims.length > 0
      ? serviceClient
        .from('claim_outcomes')
        .select('claim_id,decision,outcome,amount_refunded,amount_recovered,recommended_payout_action,followed_recommendation,decided_at,updated_at')
        .in('claim_id', claims.map((claim: ClaimRow) => claim.id))
        .then((r: {
          error: unknown;
          data: Array<{
            claim_id: string;
            decision: string | null;
            outcome: string | null;
            amount_refunded: number | null;
            amount_recovered: number | null;
            recommended_payout_action: string | null;
            followed_recommendation: boolean | null;
            decided_at: string | null;
            updated_at: string | null;
          }> | null;
        }) => ({ data: r.error ? [] as OutcomeRow[] : ((r.data ?? []).map(mapOutcomeRow)) }))
      : Promise.resolve({ data: [] as OutcomeRow[] }),
    priorClaims.length > 0
      ? serviceClient
        .from('claim_outcomes')
        .select('claim_id,decision,outcome,amount_refunded,amount_recovered,recommended_payout_action,followed_recommendation,decided_at,updated_at')
        .in('claim_id', priorClaims.map((claim: ClaimRow) => claim.id))
        .then((r: {
          error: unknown;
          data: Array<{
            claim_id: string;
            decision: string | null;
            outcome: string | null;
            amount_refunded: number | null;
            amount_recovered: number | null;
            recommended_payout_action: string | null;
            followed_recommendation: boolean | null;
            decided_at: string | null;
            updated_at: string | null;
          }> | null;
        }) => ({ data: r.error ? [] as OutcomeRow[] : ((r.data ?? []).map(mapOutcomeRow)) }))
      : Promise.resolve({ data: [] as OutcomeRow[] }),
  ]);

  const claimMetrics = buildClaimOpsMetrics(claims, outcomeResult.data ?? []);
  const priorMetrics = range === 'all'
    ? null
    : buildClaimOpsMetrics(priorClaims, priorOutcomeResult.data ?? []);
  const recoveryMetrics = buildRecoveryMetrics(recoveryCases);

  const sourcesCoverage: SourcesCoverage = {
    customerProfiles: dataPresence.sources.customerProfiles,
    merchantClaims: dataPresence.sources.merchantClaims,
    supportCases: dataPresence.sources.supportCases,
    evidencePackages: dataPresence.sources.evidencePackages,
    auditTransactions: dataPresence.sources.auditTransactions,
    recoveryCases: allRecoveryCases.length,
    partners: partners.length,
    partnerRules: partnerRules.length,
  };

  const hasAnyData = dataPresence.hasAnyData || claims.length > 0 || allRecoveryCases.length > 0;
  const liveCta = liveSetupCta(connectionState);

  return (
    <ReportsPageView
      connectionState={connectionState}
      setupState={setupState}
      hasAnyData={hasAnyData}
      activeTab={activeTab}
      range={range}
      tabPanel={{
        activeTab,
        overview: {
          connectionState,
          liveCta,
          claims,
          claimMetrics,
          priorMetrics,
          recoveryMetrics,
          range,
          claimTypeBreakdown: buildClaimTypeBreakdown(claims),
          requestedActionBreakdown: buildRequestedActionBreakdown(claims),
          outcomeBreakdown: buildOutcomeBreakdown(outcomeResult.data ?? []),
          sourcesCoverage,
        },
        recovery: {
          connectionState,
          liveCta,
          range,
          recoveryMetrics,
          recoveryStatusBreakdown: buildRecoveryStatusBreakdown(recoveryCases),
          partnerPerformance: buildPartnerPerformance(recoveryCases),
          sourcesCoverage,
        },
      }}
    />
  );
}
