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
import { dominantCurrency } from '@/lib/utils/format';
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

type FinancialSummaryRow = {
  support_payout_case_id: string;
  currency: string;
  exposed_minor: number;
  paid_minor: number;
  confirmed_loss_minor: number;
  recoverable_minor: number;
  recovered_minor: number;
  prevented_minor: number;
  written_off_minor: number;
};

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
      'currency',
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
    .select('id,status,claim_type,currency,amount_at_risk,total_estimated_loss,requested_action,submitted_at,created_at,updated_at')
    .eq('merchant_id', ctx.merchantId);
  if (priorCutoff) priorClaimsQuery = priorClaimsQuery.gte('submitted_at', priorCutoff);
  if (priorEnd) priorClaimsQuery = priorClaimsQuery.lte('submitted_at', priorEnd);

  const [claimsResult, priorClaimResult, allRecoveryCases, partners, partnerRules, financialResult] = await Promise.all([
    claimsQuery.then((r: { error: unknown; data: ClaimRow[] | null }) => ({ data: r.error ? [] as ClaimRow[] : ((r.data ?? []) as ClaimRow[]) })),
    range === 'all' ? Promise.resolve({ data: [] as ClaimRow[] }) : priorClaimsQuery.then((r: { error: unknown; data: ClaimRow[] | null }) => ({ data: r.error ? [] as ClaimRow[] : ((r.data ?? []) as ClaimRow[]) })),
    listRecoveryCases(serviceClient, ctx.merchantId).catch(() => []),
    listPartners(serviceClient, ctx.merchantId).catch(() => []),
    listPartnerRecoveryRules(serviceClient, ctx.merchantId).catch(() => []),
    serviceClient
      .from(TABLES.CASE_FINANCIAL_SUMMARIES)
      .select('support_payout_case_id,currency,exposed_minor,paid_minor,confirmed_loss_minor,recoverable_minor,recovered_minor,prevented_minor,written_off_minor')
      .eq('merchant_id', ctx.merchantId)
      .then((result: { error: unknown; data: FinancialSummaryRow[] | null }) => ({ data: result.error ? [] as FinancialSummaryRow[] : (result.data ?? []) })),
  ]);
  const financialByCaseCurrency = new Map<string, FinancialSummaryRow>(
    financialResult.data.map((row: FinancialSummaryRow) => [`${row.support_payout_case_id}:${row.currency.toUpperCase()}`, row]),
  );
  const withFinancialSummary = (claim: ClaimRow): ClaimRow => {
    const currency = (claim.currency ?? 'USD').toUpperCase();
    const summary = financialByCaseCurrency.get(`${claim.id}:${currency}`);
    if (!summary) return claim;
    return {
      ...claim,
      amount_at_risk: Number(summary.exposed_minor ?? 0) / 100,
      total_estimated_loss: Number(summary.confirmed_loss_minor ?? 0) / 100,
      refund_amount: Number(summary.paid_minor ?? 0) / 100,
    };
  };
  const claims = claimsResult.data.map(withFinancialSummary);
  const priorClaims = priorClaimResult.data;
  const ledgerRecoveryCases = allRecoveryCases.map((recoveryCase) => {
    const currency = recoveryCase.currency.toUpperCase();
    const summary = financialByCaseCurrency.get(`${recoveryCase.support_payout_case_id}:${currency}`);
    return summary ? {
      ...recoveryCase,
      eligible_loss_amount: Number(summary.recoverable_minor ?? 0) / 100,
      estimated_recoverable_min: Number(summary.recoverable_minor ?? 0) / 100,
      estimated_recoverable_max: Number(summary.recoverable_minor ?? 0) / 100,
      amount_recovered: Number(summary.recovered_minor ?? 0) / 100,
    } : recoveryCase;
  });
  const recoveryCases = cutoff
    ? ledgerRecoveryCases.filter((recoveryCase) => recoveryCase.created_at >= cutoff || recoveryCase.updated_at >= cutoff)
    : ledgerRecoveryCases;

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
  const currencyByCase = new Map(claimsResult.data.map((claim: ClaimRow) => [claim.id, (claim.currency ?? 'USD').toUpperCase()]));
  const withFinancialOutcome = (outcome: OutcomeRow): OutcomeRow => {
    const currency = currencyByCase.get(outcome.claim_id) ?? 'USD';
    const summary = financialByCaseCurrency.get(`${outcome.claim_id}:${currency}`);
    return summary
      ? { ...outcome, amount_refunded: Number(summary.paid_minor ?? 0) / 100, amount_recovered: Number(summary.recovered_minor ?? 0) / 100 }
      : outcome;
  };
  const outcomes = outcomeResult.data.map(withFinancialOutcome);
  const priorOutcomes = priorOutcomeResult.data.map(withFinancialOutcome);

  // Display currency for money KPIs/charts: most common case currency, then recovery-case currency.
  const displayCurrency = dominantCurrency(claims, dominantCurrency(ledgerRecoveryCases));

  const claimMetrics = buildClaimOpsMetrics(claims, outcomes);
  const priorMetrics = range === 'all'
    ? null
    : buildClaimOpsMetrics(priorClaims, priorOutcomes);
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
          displayCurrency,
          claimTypeBreakdown: buildClaimTypeBreakdown(claims),
          requestedActionBreakdown: buildRequestedActionBreakdown(claims),
          outcomeBreakdown: buildOutcomeBreakdown(outcomes),
          sourcesCoverage,
        },
        recovery: {
          connectionState,
          liveCta,
          range,
          displayCurrency,
          recoveryMetrics,
          recoveryStatusBreakdown: buildRecoveryStatusBreakdown(recoveryCases),
          partnerPerformance: buildPartnerPerformance(recoveryCases),
          sourcesCoverage,
        },
      }}
    />
  );
}
