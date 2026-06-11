import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { getMerchantDataPresence } from '@/lib/supabase/getMerchantDataPresence';
import { resolveMerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import { getExposureAtRisk } from '@/lib/supabase/merchantHelpers';
import { buildClaimOpsMetrics } from '@/lib/claims/reporting';
import { ReportsPageView } from '@/app/(app)/reports/ReportsPageView';
import type { ClaimRow, ClaimTypeBreakdown, GradeBucket, OutcomeBreakdown, OutcomeRow, ReportsTab, RunSummary, SourcesCoverage, TxGradeRow } from '@/app/(app)/reports/reportsPageTypes';
import {
  GRADE_SAMPLE_LIMIT,
  buildClaimTypeBreakdown,
  buildGradeBuckets,
  buildMatchRateTrend,
  buildOutcomeBreakdown,
  gradeFromTransaction,
  liveSetupCta,
} from '@/app/(app)/reports/reportsPageUtils';

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
  const activeTab: ReportsTab = rawTab === 'csv' || rawTab === 'integration' ? rawTab : 'overview';

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

  const [{ data: runs }, exposureAtRisk] = await Promise.all([
    serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .select('id,created_at,total_rows,flagged_count,filename,status')
      .eq('merchant_id', ctx.merchantId)
      .eq('hidden_by_merchant', false)
      .order('created_at', { ascending: false })
      .limit(50),
    getExposureAtRisk(serviceClient, ctx.merchantId),
  ]);

  const rows = (runs ?? []) as RunSummary[];
  const jobIds = rows.map((row) => row.id);
  const { data: txRows } = jobIds.length > 0
    ? await serviceClient
      .from(TABLES.AUDIT_TRANSACTIONS)
      .select('identity_confidence_grade,match_status')
      .in('job_id', jobIds)
      .not('dismissed_by_merchant', 'is', true)
      .limit(2000)
    : { data: [] };

  const gradeCounts: Record<GradeBucket, number> = {
    definite: 0,
    probable: 0,
    possible: 0,
    weak: 0,
  };

  for (const tx of ((txRows ?? []) as TxGradeRow[])) {
    gradeCounts[gradeFromTransaction(tx)] += 1;
  }

  const totalRows = rows.reduce((sum, row) => sum + row.total_rows, 0);
  const totalFlagged = rows.reduce((sum, row) => sum + (row.flagged_count ?? 0), 0);
  const trend = rows.slice(0, 7).reverse();
  const matchRateTrend = buildMatchRateTrend(trend);
  const buckets = buildGradeBuckets(gradeCounts);

  let claimsQuery = serviceClient
    .from('merchant_claims' as never)
    .select('id,status,claim_type,amount_at_risk,submitted_at,created_at,updated_at')
    .eq('merchant_id', ctx.merchantId);
  if (cutoff) claimsQuery = claimsQuery.gte('submitted_at', cutoff);

  let priorClaimsQuery = serviceClient
    .from('merchant_claims' as never)
    .select('id,status,claim_type,amount_at_risk,submitted_at,created_at,updated_at')
    .eq('merchant_id', ctx.merchantId);
  if (priorCutoff) priorClaimsQuery = priorClaimsQuery.gte('submitted_at', priorCutoff);
  if (priorEnd) priorClaimsQuery = priorClaimsQuery.lte('submitted_at', priorEnd);

  const [claimsResult, priorClaimResult] = await Promise.all([
    claimsQuery.then((r: { data: ClaimRow[] | null; error: unknown }) => ({ data: r.error ? [] as ClaimRow[] : (r.data ?? []) })),
    range === 'all' ? Promise.resolve({ data: [] as ClaimRow[] }) : priorClaimsQuery.then((r: { data: ClaimRow[] | null; error: unknown }) => ({ data: r.error ? [] as ClaimRow[] : (r.data ?? []) })),
  ]);
  const claims = claimsResult.data;
  const priorClaims = (priorClaimResult.data ?? []) as ClaimRow[];

  const [outcomeResult, priorOutcomeResult] = await Promise.all([
    claims.length > 0
      ? serviceClient
        .from('merchant_case_outcomes' as never)
        .select('claim_id,decision,outcome,amount_refunded,decided_at,created_at,updated_at')
        .in('claim_id', claims.map((claim: ClaimRow) => claim.id))
        .then((r: { data: OutcomeRow[] | null; error: unknown }) => ({ data: r.error ? [] as OutcomeRow[] : (r.data ?? []) }))
      : Promise.resolve({ data: [] as OutcomeRow[] }),
    priorClaims.length > 0
      ? serviceClient
        .from('merchant_case_outcomes' as never)
        .select('claim_id,decision,outcome,amount_refunded,decided_at,created_at,updated_at')
        .in('claim_id', priorClaims.map((c) => c.id))
        .then((r: { data: OutcomeRow[] | null; error: unknown }) => ({ data: r.error ? [] as OutcomeRow[] : (r.data ?? []) }))
      : Promise.resolve({ data: [] as OutcomeRow[] }),
  ]);

  const claimMetrics = buildClaimOpsMetrics(claims, outcomeResult.data ?? []);
  const priorMetrics = range === 'all'
    ? null
    : buildClaimOpsMetrics(priorClaims, priorOutcomeResult.data ?? []);

  const claimTypeBreakdown: ClaimTypeBreakdown = buildClaimTypeBreakdown(claims);
  const outcomeBreakdown: OutcomeBreakdown = buildOutcomeBreakdown(outcomeResult.data ?? []);

  const sourcesCoverage: SourcesCoverage = {
    customerProfiles: dataPresence.sources.customerProfiles,
    merchantClaims: dataPresence.sources.merchantClaims,
    supportCases: dataPresence.sources.supportCases,
    evidencePackages: dataPresence.sources.evidencePackages,
    auditTransactions: dataPresence.sources.auditTransactions,
  };

  const hasAnyData = dataPresence.hasAnyData;
  const liveCta = liveSetupCta(connectionState);
  const gradeSampled = (txRows ?? []).length >= GRADE_SAMPLE_LIMIT;
  const analysedRows = (txRows ?? []).length;

  const chartProps = { matchRateTrend, gradeSampled, analysedRows, buckets };

  return (
    <ReportsPageView
      connectionState={connectionState}
      setupState={setupState}
      hasAnyData={hasAnyData}
      activeTab={activeTab}
      range={range}
      csvCount={rows.length}
      tabPanel={{
        activeTab,
        overview: {
          connectionState,
          liveCta,
          claims,
          claimMetrics,
          rows,
          totalFlagged,
          range,
          ...chartProps,
        },
        csv: {
          rows,
          totalRows,
          totalFlagged,
          ...chartProps,
        },
        live: {
          connectionState,
          liveCta,
          range,
          claimMetrics,
          priorMetrics,
          exposureAtRisk,
          claimTypeBreakdown,
          outcomeBreakdown,
          sourcesCoverage,
        },
      }}
    />
  );
}
