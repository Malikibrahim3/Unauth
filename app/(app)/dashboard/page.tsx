import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatDateMode } from '@/lib/utils/format';
import { formatCurrencyNullable } from '@/lib/utils/format';
import type { Database } from '@/lib/supabase/types';
import {
  countMerchantReviewQueueProfiles,
  fetchMerchantReviewQueueRows,
  fetchReviewQueueProfileIds,
  getExposureAtRisk,
} from '@/lib/supabase/merchantHelpers';
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import TrackPageView from '@/components/common/TrackPageView';
import DashboardCharts, { type TransactionChartData } from '@/components/dashboard/DashboardCharts';
import NextUpPanel, { type NextUpClaim } from '@/components/dashboard/NextUpPanel';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { Badge } from '@/components/ui/Badge';
import { riskLevelToNewGrade } from '@/lib/confidence';
import { signalCopy } from '@/lib/copy/signals';
import { ACTIVE_CLAIM_STATUSES } from '@/lib/claims/sla';
import { pickPriorityClaim } from '@/lib/claims/priority';

type RunRow = Database['public']['Tables']['processing_jobs']['Row'];

type QueueRow = {
  id: string;
  job_id: string;
  order_id: string | null;
  processed_at: string;
  order_value: number | string | null;
  identity_confidence_grade: string | null;
  identity_score: number | null;
  match_status: string | null;
  customer_email: string | null;
  customer_name: string | null;
  signals_matched: string[] | null;
};

type ClusterRow = {
  id: string;
  names: string[] | null;
  primary_email: string | null;
  risk_level: string;
  total_orders: number;
  total_refund_claims: number;
  total_merchants_seen_at: number;
};

type ActivityItem = {
  type: string;
  detail: string;
  time: string;
  href?: string;
};

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function signalList(row: QueueRow): string[] {
  if (!Array.isArray(row.signals_matched)) return [];
  return row.signals_matched.filter((s): s is string => typeof s === 'string' && s.length > 0);
}

function formatCompactMoney(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function gradeFromQueueRow(row: QueueRow): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (row.identity_confidence_grade) {
    return riskLevelToNewGrade(row.identity_confidence_grade);
  }
  if (row.match_status === 'definite') return 'A';
  if (row.match_status === 'probable') return 'B';
  if (row.match_status === 'candidate') return 'C';
  return 'F';
}

export default async function DashboardPage() {
  const supabase = createClient();
  const serviceClient = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_DASHBOARD);
  if (denied) {
    redirect(await resolveDefaultAppPath(serviceClient, user.id, { exclude: ['/dashboard'] }));
  }

  const { data: runs } = await serviceClient
    .from(TABLES.PROCESSING_JOBS)
    .select('*')
    .eq('merchant_id', ctx.merchantId)
    .eq('hidden_by_merchant', false)
    .order('created_at', { ascending: false })
    .limit(50);
  const typedRuns = (runs ?? []) as unknown as RunRow[];
  const latestRun = typedRuns[0] ?? null;
  const isEmpty = typedRuns.length === 0;

  const totalTransactions = typedRuns.reduce((sum, r) => sum + r.total_rows, 0);
  const totalFlagged = typedRuns.reduce((sum, r) => sum + (r.flagged_count ?? 0), 0);
  const avgFlagRate = totalTransactions > 0 ? (totalFlagged / totalTransactions) * 100 : null;
  const jobIds = typedRuns.map((run) => run.id);

  let chartTransactions: TransactionChartData[] = [];
  if (jobIds.length > 0) {
    const { data } = await serviceClient
      .from(TABLES.AUDIT_TRANSACTIONS)
      .select('id,job_id,processed_at,order_value,refund_claimed,chargeback_filed,risk_level,identity_confidence_grade,match_status,identity_score,match_score,signals_matched,fraud_flags')
      .in('job_id', jobIds)
      .order('processed_at', { ascending: true });
    chartTransactions = (data ?? []) as unknown as TransactionChartData[];
  }

  const { data: evidenceRows } = await serviceClient
    .from('evidence_packages' as never)
    .select('ce3_eligible')
    .eq('merchant_id', ctx.merchantId);
  const totalPackages = evidenceRows?.length ?? 0;
  const ce3Packages =
    (evidenceRows as Array<{ ce3_eligible: boolean }> | null)?.filter((pkg) => pkg.ce3_eligible).length ?? 0;

  const { count: unreviewedAppearances } = await serviceClient
    .from('watchlist_appearances' as never)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', ctx.merchantId)
    .is('reviewed_at', null);
  const watchlistNeedReview = unreviewedAppearances ?? 0;

  let reviewQueue: number | null = null;
  try {
    reviewQueue = await countMerchantReviewQueueProfiles(serviceClient, ctx.merchantId);
  } catch {
    reviewQueue = null;
  }

  let exposureAtRisk: number | null = null;
  try {
    exposureAtRisk = await getExposureAtRisk(serviceClient, ctx.merchantId);
  } catch {
    exposureAtRisk = null;
  }

  let reviewRows: QueueRow[] = [];
  let profileIdByTx = new Map<string, string>();
  try {
    const queue = await fetchMerchantReviewQueueRows(serviceClient, ctx.merchantId, { from: 0, to: 5 });
    reviewRows = (queue.rows as QueueRow[]) ?? [];
    const txIds = reviewRows.map((r) => r.id).filter((id) => typeof id === 'string');
    profileIdByTx = await fetchReviewQueueProfileIds(serviceClient, queue.ownedJobIds, txIds);
  } catch {
    reviewRows = [];
    profileIdByTx = new Map<string, string>();
  }

  const merchantFilter = `merchant_ids.cs.${JSON.stringify([user.id])},merchant_ids.cs.${JSON.stringify([ctx.merchantId])}`;
  let clusterRows: ClusterRow[] = [];
  try {
    const { data } = await serviceClient
      .from(TABLES.CUSTOMER_PROFILES)
      .select('id,names,primary_email,risk_level,total_orders,total_refund_claims,total_merchants_seen_at')
      .or(merchantFilter)
      .order('total_merchants_seen_at', { ascending: false })
      .order('risk_score', { ascending: false })
      .limit(6);
    clusterRows = (data as ClusterRow[] | null) ?? [];
  } catch {
    clusterRows = [];
  }

  const signalCounts = new Map<string, number>();
  for (const row of reviewRows) {
    for (const sig of signalList(row)) {
      signalCounts.set(sig, (signalCounts.get(sig) ?? 0) + 1);
    }
  }
  const topSignals = [...signalCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
  const networkClusterRows = clusterRows.filter((profile) => profile.total_merchants_seen_at > 1);
  const visibleClusterRows = networkClusterRows.length > 0 ? networkClusterRows : clusterRows;

  let nextUpClaims: NextUpClaim[] = [];
  try {
    const { data: rawClaims } = await serviceClient
      .from('merchant_claims' as never)
      .select('id,customer_id,claim_type,status,amount_at_risk,currency,submitted_at,created_at,updated_at')
      .eq('merchant_id', ctx.merchantId)
      .in('status', [...ACTIVE_CLAIM_STATUSES])
      .limit(50);

    const claimPool = (rawClaims ?? []) as Array<{
      id: string;
      customer_id: string | null;
      claim_type: string;
      status: string;
      amount_at_risk: number | null;
      currency: string | null;
      submitted_at?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    }>;

    const remaining = [...claimPool];
    const ranked: typeof claimPool = [];
    while (ranked.length < 5 && remaining.length > 0) {
      const next = pickPriorityClaim(remaining);
      if (!next) break;
      ranked.push(next);
      remaining.splice(remaining.findIndex((claim) => claim.id === next.id), 1);
    }

    const customerIds = [...new Set(ranked.map((c) => c.customer_id).filter(Boolean) as string[])];
    const profileById = new Map<string, { names: string[] | null; primary_email: string | null }>();
    if (customerIds.length > 0) {
      const { data: profiles } = await serviceClient
        .from(TABLES.CUSTOMER_PROFILES)
        .select('id, names, primary_email')
        .in('id', customerIds);
      for (const profile of (profiles ?? []) as Array<{ id: string; names: string[] | null; primary_email: string | null }>) {
        profileById.set(profile.id, profile);
      }
    }

    nextUpClaims = ranked
      .filter((claim) => claim.customer_id)
      .map((claim) => {
        const profile = profileById.get(claim.customer_id!);
        return {
          id: claim.id,
          customerId: claim.customer_id!,
          customerName: profile?.names?.[0] ?? 'Unknown customer',
          customerEmail: profile?.primary_email ?? null,
          claimType: claim.claim_type,
          status: claim.status,
          amountAtRisk: claim.amount_at_risk,
          currency: claim.currency,
          submittedAt: claim.submitted_at,
          createdAt: claim.created_at,
          updatedAt: claim.updated_at,
        };
      });
  } catch {
    nextUpClaims = [];
  }

  const activity: ActivityItem[] = [];
  if (latestRun) {
    activity.push({
      type: 'Audit',
      detail: `${latestRun.filename} · ${(latestRun.flagged_count ?? 0).toLocaleString()} flagged`,
      time: formatDateMode(latestRun.created_at, 'recent'),
      href: `/audit/${latestRun.id}`,
    });
  }
  if (reviewRows[0]) {
    const row = reviewRows[0];
    activity.push({
      type: 'Queue',
      detail: `${row.customer_name ?? row.customer_email ?? 'Unidentified'} · ${row.match_status ?? 'candidate'}`,
      time: formatDateMode(row.processed_at, 'recent'),
      href: profileIdByTx.get(row.id) ? `/customers/${profileIdByTx.get(row.id)}` : `/audit/${row.job_id}`,
    });
  }
  if (ce3Packages > 0) {
    activity.push({
      type: 'Evidence',
      detail: `${ce3Packages} signal report${ce3Packages === 1 ? '' : 's'} with CE3.0 signals detected`,
      time: 'current',
      href: '/chargebacks',
    });
  }
  if (watchlistNeedReview > 0) {
    activity.push({
      type: 'Watchlist',
      detail: `${watchlistNeedReview} watchlist appearance${watchlistNeedReview === 1 ? '' : 's'} pending`,
      time: 'current',
      href: '/watchlist',
    });
  }

  return (
    <div className="p-4 md:p-6">
      <TrackPageView event="Dashboard Viewed" />

      <section
        className="relative overflow-hidden border"
        style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)', borderRadius: 4 }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3 md:px-5" style={{ borderColor: 'var(--border-default)' }}>
          <div className="min-w-0">
            <h1 className="t-heading" style={{ color: 'var(--ink-primary)' }}>Dashboard</h1>
            <p className="text-body-sm mt-1" style={{ color: 'var(--ink-secondary)' }}>
              Operational overview and priority work across your merchant data.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="t-label flex items-center gap-2" style={{ color: 'var(--ink-tertiary)' }}>
              <span className="ua-pulse h-2 w-2 rounded-full" style={{ background: 'var(--sev-clear)' }} />
              Graph live
            </span>
            <Link href="/upload" className="btn-accent rounded-md px-3 py-1.5 text-caption font-semibold">
              New audit
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b md:grid-cols-[1.35fr_repeat(4,minmax(0,1fr))]" style={{ borderColor: 'var(--border-default)' }}>
          {[
            {
              label: 'Exposure at risk',
              value: exposureAtRisk === null ? 'Unavailable' : formatCurrencyNullable(exposureAtRisk),
              hint: exposureAtRisk === null ? 'Could not be computed' : 'Current queue',
            },
            {
              label: 'Customers to review',
              value: reviewQueue === null ? 'Unavailable' : reviewQueue === 0 ? '—' : reviewQueue.toLocaleString(),
              hint: reviewQueue === null ? 'Count could not be loaded' : 'Open profiles',
            },
            {
              label: 'Transactions analysed',
              value: totalTransactions.toLocaleString(),
              hint: `${typedRuns.length} audit ${typedRuns.length === 1 ? 'run' : 'runs'}`,
            },
            {
              label: 'Evidence ready',
              value: totalPackages.toLocaleString(),
              hint: ce3Packages > 0 ? `${ce3Packages} with CE3.0 signals` : 'No CE3.0 signals detected',
            },
            {
              label: 'Avg match rate',
              value: avgFlagRate === null ? '—' : `${avgFlagRate.toFixed(1)}%`,
              hint: avgFlagRate === null ? 'Awaiting data' : avgFlagRate >= 10 ? 'High' : avgFlagRate >= 4 ? 'Elevated' : 'Normal',
            },
          ].map((metric, idx) => (
            <div
              key={metric.label}
              className={idx === 4 ? 'px-3 py-3 md:px-4' : 'px-3 py-3 md:px-4'}
              style={{
                borderRightColor: 'var(--border-default)',
                borderRightWidth: idx === 4 ? 0 : 1,
                borderRightStyle: idx === 4 ? 'none' : 'solid',
              }}
            >
              <p className="t-label" style={{ color: 'var(--ink-tertiary)' }}>{metric.label}</p>
              <p className="t-display mt-1 num" style={{ color: metric.label.toLowerCase().includes('exposure') ? 'var(--data-currency)' : 'var(--data-score)' }}>{metric.value}</p>
              <p className="t-caption mt-1" style={{ color: 'var(--ink-tertiary)' }}>{metric.hint}</p>
            </div>
          ))}
        </div>

        <NextUpPanel claims={nextUpClaims} inboxCount={reviewRows.length} />

        <DashboardCharts
          runs={typedRuns.map((run) => ({
            id: run.id,
            filename: run.filename,
            total_rows: run.total_rows,
            flagged_count: run.flagged_count ?? 0,
            created_at: run.created_at,
          }))}
          transactions={chartTransactions}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="border-r" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-alt)' }}>
              <div>
                <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Cases requiring attention</p>
                <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>
                  {reviewRows.length} in immediate queue
                </p>
              </div>
              <Link href="/customers?risk=high&status=new" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                View all
              </Link>
            </div>

            {reviewRows.length === 0 ? (
              <div className="px-4 py-8">
                <p className="text-body-sm font-medium" style={{ color: 'var(--text)' }}>
                  {isEmpty ? 'Run your first audit to populate the queue.' : 'No review cases in the queue right now.'}
                </p>
                <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>
                  {isEmpty ? 'Upload a CSV to start generating cases, clusters, and evidence signals.' : 'Current high-confidence identities are resolved.'}
                </p>
                <Link href="/upload" className="mt-3 inline-block text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                  Upload a CSV
                </Link>
              </div>
            ) : (
              <div>
                {reviewRows.map((row) => {
                  const score = row.identity_score === null ? null : Math.round(row.identity_score);
                  const profileId = profileIdByTx.get(row.id);
                  const href = profileId ? `/customers/${profileId}` : `/audit/${row.job_id}/transaction/${row.id}`;
                  const signalCount = signalList(row).length;
                  const networkLinked = signalList(row).some((signal) => signal.toLowerCase().includes('crossmerchant'));
                  return (
                    <Link
                      key={row.id}
                      href={href}
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b px-4 py-3 hover-bg-subtle"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-body-sm truncate font-medium" style={{ color: 'var(--text)' }}>
                            {row.customer_name ?? row.customer_email ?? 'Unidentified customer'}
                          </p>
                          <ConfidenceBadge grade={gradeFromQueueRow(row)} score={score ?? undefined} size="sm" />
                          {row.match_status && <Badge size="sm" tone="warning">{row.match_status}</Badge>}
                          {networkLinked && <Badge size="sm" tone="info">Network</Badge>}
                        </div>
                        <p className="text-caption mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
                          {row.order_id ?? row.id} · {formatCurrencyNullable(toNumber(row.order_value))}
                        </p>
                        <p className="text-caption mt-1" style={{ color: 'var(--text-subtle)' }}>
                          {signalCount > 0 ? `${signalCount} signal${signalCount === 1 ? '' : 's'} matched` : 'No signal breakdown'} · {formatDateMode(row.processed_at, 'recent')}
                        </p>
                      </div>
              <span className="text-caption self-center font-semibold" style={{ color: 'var(--accent)' }}>
                        Open →
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <aside>
            <div className="border-b px-4 py-2" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-alt)' }}>
              <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Network exposure</p>
            </div>
            <div className="border-b px-4 py-2" style={{ borderColor: 'var(--border-subtle)' }}>
              {visibleClusterRows.length === 0 ? (
                <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>No network-linked profiles yet.</p>
              ) : (
                <div className="space-y-2">
                  {visibleClusterRows.map((profile) => (
                    <Link key={profile.id} href={`/customers/${profile.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 hover:opacity-80">
                      <div className="min-w-0">
                        <p className="truncate text-caption font-medium" style={{ color: 'var(--text)' }}>
                          {profile.names?.[0] ?? profile.primary_email ?? 'Unknown profile'}
                        </p>
                        <p className="truncate text-caption font-mono" style={{ color: 'var(--text-muted)' }}>
                          {profile.total_merchants_seen_at} merchants · {profile.total_orders} orders · {profile.total_refund_claims} claims
                        </p>
                      </div>
                      <ConfidenceBadge grade={riskLevelToNewGrade(profile.risk_level)} size="sm" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="border-b px-4 py-2" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-alt)' }}>
              <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Top signals</p>
            </div>
            <div className="border-b px-4 py-2" style={{ borderColor: 'var(--border-subtle)' }}>
              {topSignals.length === 0 ? (
                <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>No signal breakdown yet.</p>
              ) : (
                <div className="space-y-2">
                  {topSignals.map((sig) => (
                    <div key={sig.name} className="grid grid-cols-[minmax(0,1fr)_26px] items-center gap-2">
                      <p className="truncate text-caption" style={{ color: 'var(--text-muted)' }}>{signalCopy(sig.name).short}</p>
                      <span className="text-caption text-right font-mono num" style={{ color: 'var(--text)' }}>{sig.count}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-b px-4 py-2" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-alt)' }}>
              <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Activity</p>
            </div>
            <div className="border-b px-4 py-2" style={{ borderColor: 'var(--border-subtle)' }}>
              {activity.length === 0 ? (
                <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>No recent activity.</p>
              ) : (
                <div className="space-y-2">
                  {activity.slice(0, 5).map((item, idx) => {
                    const content = (
                      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2">
                        <span className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>{item.type}</span>
                        <p className="truncate text-caption" style={{ color: 'var(--text)' }}>{item.detail}</p>
                        <span className="text-caption font-mono" style={{ color: 'var(--text-subtle)' }}>{item.time}</span>
                      </div>
                    );
                    return item.href ? (
                      <Link key={`${item.type}-${idx}`} href={item.href} className="block hover:opacity-80">
                        {content}
                      </Link>
                    ) : (
                      <div key={`${item.type}-${idx}`}>{content}</div>
                    );
                  })}
                </div>
              )}
            </div>

          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-alt)' }}>
          <span className="text-caption font-mono" style={{ color: 'var(--text-subtle)' }}>
            {latestRun ? `Audit ${formatDateMode(latestRun.created_at, 'table')} · ${latestRun.total_rows.toLocaleString()} rows` : 'No audits yet'}
          </span>
          <span className="text-caption font-mono" style={{ color: 'var(--text-subtle)' }}>
            k &gt;= 3 gate · HMAC-SHA256 matching · merchant-scoped data
          </span>
        </footer>
      </section>
    </div>
  );
}
