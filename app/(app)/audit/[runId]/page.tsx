import { createClient, createServiceClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ESTIMATED_CHARGEBACK_RATE } from '@/lib/engine/weights';
import type { DataQualityReport } from '@/lib/types/dataQuality';
import type { Database } from '@/lib/supabase/types';
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import { buildReviewableFilter } from '@/lib/supabase/filters';
import { TABLES } from '@/lib/supabase/tables';
import { AuditRunPageView } from '@/app/(app)/audit/[runId]/AuditRunPageView';
import type { CustomerRollup } from '@/app/(app)/audit/[runId]/AuditRunPageView';

type RunRow = Database['public']['Tables']['processing_jobs']['Row'];
type TxRow = Database['public']['Tables']['audit_transactions']['Row'];

interface RunPageProps {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ page?: string; txPage?: string; customerPage?: string; txPageSize?: string; customerPageSize?: string; tab?: string; customerEmail?: string }>;
}

const TX_PAGE_SIZE = 50;
const CUSTOMER_PAGE_SIZE = 100;
const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const SUMMARY_BATCH = 1000;
const OVERVIEW_CUSTOMER_SAMPLE = SUMMARY_BATCH;
const TX_TABLE_SELECT =
  'id,order_id,processed_at,order_value,identity_score,match_score,identity_confidence_grade,' +
  'signals_matched,identity_signals,fraud_flags';

type CustomerSummaryRow = {
  customer_email: string | null;
  customer_name: string | null;
  order_value: number | string | null;
  identity_score: number | null;
};
type PersistedCustomerSummaryRow = {
  customer_key: string;
  customer_email: string | null;
  customer_name: string | null;
  order_count: number;
  total_spend: number | string;
  max_score: number | string;
};
type PersistedAuditSummaryRow = {
  flagged_transactions: number;
  definite_count: number;
  probable_count: number;
  possible_count: number;
  weak_count: number;
  linked_cluster_count: number;
  customer_count: number;
  value_at_risk: number | string;
  estimated_exposure: number | string;
};

function normalizePageSize(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? String(fallback), 10);
  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number]) ? parsed : fallback;
}

function addCustomerSummary(
  customerAgg: Map<string, { maxScore: number; orderCount: number; totalSpend: number }>,
  row: CustomerSummaryRow,
) {
  const key = row.customer_email ?? row.customer_name ?? 'Unknown customer';
  const current = customerAgg.get(key) ?? { maxScore: 0, orderCount: 0, totalSpend: 0 };
  current.orderCount += 1;
  current.totalSpend += typeof row.order_value === 'string' ? Number.parseFloat(row.order_value) || 0 : row.order_value ?? 0;
  current.maxScore = Math.max(current.maxScore, row.identity_score ?? 0);
  customerAgg.set(key, current);
}

function sortCustomerRollups(customerAgg: Map<string, { maxScore: number; orderCount: number; totalSpend: number }>): CustomerRollup[] {
  return [...customerAgg.entries()].toSorted((a, b) => b[1].maxScore - a[1].maxScore || b[1].orderCount - a[1].orderCount);
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number.parseFloat(value) || 0;
  return 0;
}

export default async function AuditRunPage({ params, searchParams }: RunPageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_AUDIT);
  if (denied) redirect(await resolveDefaultAppPath(serviceClient, user.id));

  const txPage = Math.max(1, parseInt(resolvedSearchParams.txPage ?? resolvedSearchParams.page ?? '1', 10));
  const txPageSize = normalizePageSize(resolvedSearchParams.txPageSize, TX_PAGE_SIZE);
  const txOffset = (txPage - 1) * txPageSize;
  const customerPage = Math.max(1, parseInt(resolvedSearchParams.customerPage ?? '1', 10));
  const customerPageSize = normalizePageSize(resolvedSearchParams.customerPageSize, CUSTOMER_PAGE_SIZE);
  const customerOffset = (customerPage - 1) * customerPageSize;
  const defaultTab = resolvedSearchParams.tab ?? 'overview';
  const selectedCustomerEmail = resolvedSearchParams.customerEmail ?? null;

  const { data: run } = await serviceClient
    .from(TABLES.PROCESSING_JOBS)
    .select('id,status,filename,upload_type,total_rows,processed_rows,failed_rows,created_at,data_quality')
    .eq('id', resolvedParams.runId)
    .eq('merchant_id', ctx.merchantId)
    .single();

  if (!run) notFound();

  const runData = run as unknown as RunRow & { upload_type?: string };
  const dataQuality = (run as unknown as { data_quality?: DataQualityReport }).data_quality ?? null;
  const jobId = resolvedParams.runId;

  const { data: persistedMetrics } = await (serviceClient as any)
    .from('audit_result_summaries')
    .select('flagged_transactions,definite_count,probable_count,possible_count,weak_count,linked_cluster_count,customer_count,value_at_risk,estimated_exposure')
    .eq('audit_id', jobId)
    .eq('merchant_id', ctx.merchantId)
    .maybeSingle() as { data: PersistedAuditSummaryRow | null };

  const [
    definiteCount,
    probableCount,
    possibleCount,
    weakCount,
    flaggedCount,
    linkedCount,
  ] = persistedMetrics
    ? [
        { count: persistedMetrics.definite_count },
        { count: persistedMetrics.probable_count },
        { count: persistedMetrics.possible_count },
        { count: persistedMetrics.weak_count },
        { count: persistedMetrics.flagged_transactions },
        { count: persistedMetrics.linked_cluster_count },
      ]
    : await Promise.all([
        serviceClient.from(TABLES.AUDIT_TRANSACTIONS).select('id', { count: 'exact', head: true }).eq('job_id', jobId).eq('identity_confidence_grade', 'definite'),
        serviceClient.from(TABLES.AUDIT_TRANSACTIONS).select('id', { count: 'exact', head: true }).eq('job_id', jobId).eq('identity_confidence_grade', 'probable'),
        serviceClient.from(TABLES.AUDIT_TRANSACTIONS).select('id', { count: 'exact', head: true }).eq('job_id', jobId).eq('identity_confidence_grade', 'possible'),
        serviceClient.from(TABLES.AUDIT_TRANSACTIONS).select('id', { count: 'exact', head: true }).eq('job_id', jobId).eq('identity_confidence_grade', 'weak'),
        serviceClient.from(TABLES.AUDIT_TRANSACTIONS).select('id', { count: 'exact', head: true }).eq('job_id', jobId).or(buildReviewableFilter()).not('dismissed_by_merchant', 'is', true),
        serviceClient.from(TABLES.AUDIT_TRANSACTIONS).select('cluster_id', { count: 'exact', head: true }).eq('job_id', jobId).not('cluster_id', 'is', null),
      ]);

  const summary = {
    definite: definiteCount.count ?? 0,
    probable: probableCount.count ?? 0,
    possible: possibleCount.count ?? 0,
    weak: weakCount.count ?? 0,
    flaggedTransactions: flaggedCount.count ?? 0,
    ungraded: Math.max((runData.total_rows ?? 0) - ((definiteCount.count ?? 0) + (probableCount.count ?? 0) + (possibleCount.count ?? 0) + (weakCount.count ?? 0)), 0),
    linkedClusters: linkedCount.count ?? 0,
    valueAtRisk: 0,
    estimatedExposure: 0,
  };

  const gradeCounts = {
    definite: summary.definite,
    probable: summary.probable,
    possible: summary.possible,
    weak: summary.weak,
  };

  // ── Paginated all-transactions table (full run truth) ───────────────────────
  const { data: transactions } = await serviceClient
    .from(TABLES.AUDIT_TRANSACTIONS)
    .select(TX_TABLE_SELECT)
    .eq('job_id', jobId)
    .order('processed_at', { ascending: false, nullsFirst: false })
    .range(txOffset, txOffset + txPageSize - 1);

  const visibleTxIds = ((transactions ?? []) as Array<{ id: string }>).map((tx) => tx.id);
  const crossMerchantTxIds = new Set<string>();
  if (visibleTxIds.length > 0) {
    const { data: appearanceRows } = await (serviceClient as any)
      .from('customer_profile_audit_appearances')
      .select('transaction_id, profile_id')
      .eq('audit_id', jobId)
      .in('transaction_id', visibleTxIds);
    const profileIds = Array.from(new Set(((appearanceRows ?? []) as Array<{ profile_id: string }>).map((row) => row.profile_id)));
    if (profileIds.length > 0) {
      const { data: profileRows } = await (serviceClient as any)
        .from(TABLES.CUSTOMER_PROFILES)
        .select('id,total_merchants_seen_at')
        .in('id', profileIds);
      const crossProfiles = new Set(
        ((profileRows ?? []) as Array<{ id: string; total_merchants_seen_at: number }>)
          .flatMap((row) => (row.total_merchants_seen_at > 1 ? [row.id] : [])),
      );
      for (const row of (appearanceRows ?? []) as Array<{ transaction_id: string; profile_id: string }>) {
        if (crossProfiles.has(row.profile_id)) crossMerchantTxIds.add(row.transaction_id);
      }
    }
  }

  // ── Customer aggregation is only needed for the overview/customers tabs. Keep
  // the transaction and data-quality tabs from paying for hidden customer rows.
  const customerAgg = new Map<string, { maxScore: number; orderCount: number; totalSpend: number }>();
  const needsCustomerSummary = defaultTab === 'overview' || defaultTab === 'customers';
  const needsFullCustomerSummary = defaultTab === 'customers';
  let reviewOrderValue = 0;
  let estimatedExposure = 0;
  let totalCustomers = 0;
  let allCustomers: CustomerRollup[] = [];

  if (needsCustomerSummary) {
    const summaryFrom = needsFullCustomerSummary ? customerOffset : 0;
    const summaryTo = needsFullCustomerSummary ? customerOffset + customerPageSize - 1 : 9;
    const [{ data: persistedAuditSummary }, { data: persistedCustomers, count: persistedCustomerCount, error: persistedCustomersError }] = await Promise.all([
      Promise.resolve({ data: persistedMetrics }),
      (serviceClient as any)
        .from('audit_customer_summaries')
        .select('customer_key,customer_email,customer_name,order_count,total_spend,max_score', { count: 'exact' })
        .eq('audit_id', jobId)
        .eq('merchant_id', ctx.merchantId)
        .order('max_score', { ascending: false })
        .order('order_count', { ascending: false })
        .range(summaryFrom, summaryTo) as Promise<{
          data: PersistedCustomerSummaryRow[] | null;
          count: number | null;
          error: { message: string; code?: string } | null;
        }>,
    ]);

    if (!persistedCustomersError && ((persistedCustomers?.length ?? 0) > 0 || (persistedCustomerCount ?? 0) > 0)) {
      allCustomers = (persistedCustomers ?? []).map((row) => [
        row.customer_email ?? row.customer_name ?? row.customer_key,
        {
          maxScore: toNumber(row.max_score),
          orderCount: row.order_count,
          totalSpend: toNumber(row.total_spend),
        },
      ]);
      totalCustomers = persistedAuditSummary?.customer_count ?? persistedCustomerCount ?? allCustomers.length;
      reviewOrderValue = toNumber(persistedAuditSummary?.value_at_risk);
      estimatedExposure = toNumber(persistedAuditSummary?.estimated_exposure);
    } else {
      const summaryRows: CustomerSummaryRow[] = [];
      const maxRows = needsFullCustomerSummary ? Number.POSITIVE_INFINITY : OVERVIEW_CUSTOMER_SAMPLE;

      const fetchSummaryBatch = async (offset2: number): Promise<void> => {
        if (offset2 >= maxRows) return;

        const { data: batch } = await serviceClient
          .from(TABLES.AUDIT_TRANSACTIONS)
          .select('customer_email, customer_name, order_value, identity_score')
          .eq('job_id', jobId)
          .or(buildReviewableFilter())
          .not('dismissed_by_merchant', 'is', true)
          .order('identity_score', { ascending: false, nullsFirst: false })
          .range(offset2, offset2 + SUMMARY_BATCH - 1) as unknown as { data: CustomerSummaryRow[] | null };

        const rows = batch ?? [];
        summaryRows.push(...rows);
        for (const row of rows) {
          addCustomerSummary(customerAgg, row);
          reviewOrderValue += toNumber(row.order_value);
        }

        if (rows.length < SUMMARY_BATCH || !needsFullCustomerSummary) return;
        return fetchSummaryBatch(offset2 + SUMMARY_BATCH);
      };
      await fetchSummaryBatch(0);

      allCustomers = sortCustomerRollups(customerAgg);
      totalCustomers = needsFullCustomerSummary ? customerAgg.size : Math.min(customerAgg.size, summary.flaggedTransactions);
      estimatedExposure = reviewOrderValue * ESTIMATED_CHARGEBACK_RATE;
    }
  }

  const pagedCustomers = needsFullCustomerSummary ? allCustomers : allCustomers.slice(0, 10);
  const customerPages = Math.max(1, Math.ceil(totalCustomers / customerPageSize));
  const networkLinkedCount = summary.linkedClusters;

  const hasFlags = summary.flaggedTransactions > 0;
  const isRunComplete = runData.status === 'completed';
  const totalTransactions = runData.total_rows ?? 0;
  const txPages = Math.max(1, Math.ceil(totalTransactions / txPageSize));

  const valueAtRisk       = reviewOrderValue;
  const statusBadge = (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border text-xs font-medium" style={{
      background:   runData.status === 'completed' ? 'var(--success-bg)'        : runData.status === 'processing' ? 'var(--info-bg)'    : 'var(--risk-critical-bg)',
      color:        runData.status === 'completed' ? 'var(--success)'           : runData.status === 'processing' ? 'var(--info)'       : 'var(--risk-critical)',
      borderColor:  runData.status === 'completed' ? 'var(--success-bd)'        : runData.status === 'processing' ? 'var(--info-bd)'    : 'var(--risk-critical-bd)',
    }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} aria-hidden="true" />
      {runData.status}
    </span>
  );

  return (
    <AuditRunPageView
      runData={runData}
      jobId={jobId}
      statusBadge={statusBadge}
      summary={{ flaggedTransactions: summary.flaggedTransactions, linkedClusters: summary.linkedClusters }}
      gradeCounts={gradeCounts}
      networkLinkedCount={networkLinkedCount}
      dataQuality={dataQuality}
      defaultTab={defaultTab}
      hasFlags={hasFlags}
      isRunComplete={isRunComplete}
      allCustomers={allCustomers}
      customerPage={customerPage}
      txPage={txPage}
      customerPageSize={customerPageSize}
      txPageSize={txPageSize}
      customerOffset={customerOffset}
      totalCustomers={totalCustomers}
      customerPages={customerPages}
      pagedCustomers={pagedCustomers}
      selectedCustomerEmail={selectedCustomerEmail}
      totalTransactions={totalTransactions}
      txPages={txPages}
      transactions={(transactions ?? null) as TxRow[] | null}
      crossMerchantTxIds={crossMerchantTxIds}
      valueAtRisk={valueAtRisk}
      estimatedExposure={estimatedExposure}
    />
  );
}

