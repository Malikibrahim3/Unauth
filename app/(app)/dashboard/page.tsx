import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatDateMode } from '@/lib/utils/format';
import { formatCurrencyNullable } from '@/lib/utils/format';
import WeeklyTrendChart from '@/components/charts/WeeklyTrendChart';
import GradeDistBar from '@/components/charts/GradeDistBar';
import type { TrendDataPoint } from '@/components/charts/WeeklyTrendChart';
import type { GradeDistEntry } from '@/components/charts/GradeDistBar';
import type { Database } from '@/lib/supabase/types';
import {
  countMerchantReviewQueueProfiles,
  fetchMerchantReviewQueueRows,
  fetchReviewQueueProfileIds,
} from '@/lib/supabase/merchantHelpers';
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import TrackPageView from '@/components/common/TrackPageView';
import EmptyDashboardHero from '@/components/EmptyDashboardHero';
import PartialSetupHero from '@/components/PartialSetupHero';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { Badge } from '@/components/ui/Badge';
import { riskLevelToNewGrade } from '@/lib/confidence';
import { getConnectionState, type ConnectionState } from '@/lib/connections/getConnectionState';
import { getMerchantDataPresence, type MerchantDataPresence } from '@/lib/supabase/getMerchantDataPresence';
import { resolveMerchantSetupState, type MerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import {
  ShoppingBag,
  Headphones,
  ShieldCheck,
  Users,
  Activity,
  Inbox,
  Eye,
  Loader2,
  ArrowRight,
  Upload,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

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

type ActivityItem = { type: string; detail: string; time: string; href?: string };

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

type DedupedQueueEntry = { row: QueueRow; profileId: string | undefined; extraOrders: number };

function dedupeQueueByCustomer(rows: QueueRow[], profileIdByTx: Map<string, string>): DedupedQueueEntry[] {
  const byKey = new Map<string, DedupedQueueEntry>();
  for (const row of rows) {
    const profileId = profileIdByTx.get(row.id);
    const key = profileId ?? row.customer_email ?? row.customer_name ?? row.id;
    const existing = byKey.get(key);
    if (!existing) byKey.set(key, { row, profileId, extraOrders: 0 });
    else existing.extraOrders += 1;
  }
  return Array.from(byKey.values());
}

function gradeFromQueueRow(row: QueueRow): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (row.identity_confidence_grade) return riskLevelToNewGrade(row.identity_confidence_grade);
  if (row.match_status === 'definite') return 'A';
  if (row.match_status === 'probable') return 'B';
  if (row.match_status === 'candidate') return 'C';
  return 'F';
}

/* ---------- Presentational primitives (server-rendered) ---------- */

function MetricCard({
  label,
  value,
  hint,
  incomplete = false,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  incomplete?: boolean;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <div
      className="flex flex-col justify-between rounded-lg border p-4"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)', minHeight: 116 }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="t-label" style={{ color: 'var(--ink-tertiary)' }}>{label}</p>
        {Icon ? <Icon className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-tertiary)' }} /> : null}
      </div>
      <div>
        <p
          className="num mt-2 font-semibold"
          style={{ fontSize: 28, lineHeight: 1.1, color: incomplete ? 'var(--ink-tertiary)' : 'var(--data-score)' }}
        >
          {value}
        </p>
        {hint ? (
          <p className="t-caption mt-1.5 leading-snug" style={{ color: incomplete ? 'var(--warning)' : 'var(--ink-tertiary)' }}>
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ModuleCard({
  title,
  href,
  linkLabel,
  icon: Icon,
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
      <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: 'var(--border-default)' }}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: 'var(--ink-tertiary)' }} />
          <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>{title}</p>
        </div>
        {href ? (
          <Link href={href} className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
            {linkLabel ?? 'View'} →
          </Link>
        ) : null}
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

/* ---------- State-driven dashboard configuration ---------- */

type Tone = 'incomplete' | 'stale' | 'normal';

type DashboardConfig = {
  subtitle: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  banner: { tone: Tone; title: string; body: string } | null;
};

function buildConfig(state: MerchantSetupState, connection: ConnectionState): DashboardConfig {
  const integrations = '/settings/integrations';
  switch (state) {
    case 'shopify_only_with_data':
      return {
        subtitle: 'Shopify orders and customers are syncing. Add your helpdesk to complete claim context.',
        primaryCta: { label: 'Connect helpdesk', href: integrations },
        secondaryCta: undefined,
        banner: {
          tone: 'incomplete',
          title: 'Shopify is connected. Connect your helpdesk to finish setup.',
          body: 'Connect your helpdesk to add claim history and dispute context. Until then, claim and dispute metrics will read as incomplete — not zero.',
        },
      };
    case 'helpdesk_only_with_data':
      return {
        subtitle: 'Claim history is syncing from your helpdesk. Add Shopify for order and customer context.',
        primaryCta: { label: 'Connect Shopify', href: integrations },
        secondaryCta: undefined,
        banner: {
          tone: 'incomplete',
          title: 'Your helpdesk is connected. Connect Shopify to add order context.',
          body: 'Claims are arriving, but order and customer context comes from Shopify. Connect it to tie claims to real purchase history.',
        },
      };
    case 'csv_only':
      return {
        subtitle: 'Showing intelligence from your imported history.',
        primaryCta: { label: 'Connect Shopify & helpdesk', href: integrations },
        secondaryCta: { label: 'Import more', href: '/upload' },
        banner: {
          tone: 'incomplete',
          title: 'Connect Shopify and your helpdesk for live monitoring.',
          body: 'This workspace is built from imported CSV history. Connect your live sources to monitor new orders and claims as they happen.',
        },
      };
    case 'stale_existing_data':
      return {
        subtitle: 'Showing your existing customer and order intelligence.',
        primaryCta: { label: 'Reconnect sources', href: integrations },
        secondaryCta: undefined,
        banner: {
          tone: 'stale',
          title: 'Showing existing data.',
          body: 'Reconnect Shopify and your helpdesk to keep analysis current and add claim context.',
        },
      };
    case 'fully_connected_with_data':
    default:
      return {
        subtitle: 'Live fraud intelligence across your Shopify orders and helpdesk claims.',
        primaryCta: connection.bothConnected
          ? { label: 'Review queue', href: '/customers?risk=high&status=new' }
          : { label: 'Complete setup', href: integrations },
        banner: null,
      };
  }
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

  const [connectionState, dataPresence] = await Promise.all([
    getConnectionState(serviceClient, ctx.merchantId),
    getMerchantDataPresence(serviceClient, ctx.merchantId, user.id),
  ]);

  const setupState = resolveMerchantSetupState(connectionState, dataPresence);

  /* ---- Early full-screen states (no real data yet) ---- */
  if (setupState === 'fresh') {
    return (
      <div className="p-4 md:p-6">
        <TrackPageView event="Dashboard Viewed" />
        <EmptyDashboardHero />
      </div>
    );
  }

  if (setupState === 'shopify_only_empty' || setupState === 'helpdesk_only_empty') {
    return (
      <div className="p-4 md:p-6">
        <TrackPageView event="Dashboard Viewed" />
        <PartialSetupHero connection={connectionState} />
      </div>
    );
  }

  if (setupState === 'fully_connected_empty') {
    return (
      <div className="p-4 md:p-6">
        <TrackPageView event="Dashboard Viewed" />
        <SyncWaitingHero connection={connectionState} />
      </div>
    );
  }

  /* ---- Cockpit (data-present states) ---- */
  const config = buildConfig(setupState, connectionState);

  const [{ data: runs }, evidenceCounts, claimsNeedingAction, claimTrendRaw, exposureRaw] = await Promise.all([
    serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .select('*')
      .eq('merchant_id', ctx.merchantId)
      .eq('hidden_by_merchant', false)
      .order('created_at', { ascending: false })
      .limit(20),
    countEvidence(serviceClient, ctx.merchantId),
    countClaimsNeedingAction(serviceClient, ctx.merchantId),
    serviceClient
      .from('merchant_claims' as never)
      .select('submitted_at,created_at,amount_at_risk')
      .eq('merchant_id' as never, ctx.merchantId as never)
      .gte('submitted_at' as never, new Date(Date.now() - 56 * 24 * 3600 * 1000).toISOString() as never)
      .then((r: { data: Array<{ submitted_at: string | null; created_at: string; amount_at_risk: number | null }> | null; error: unknown }) => r.error ? [] : (r.data ?? [])),
    serviceClient
      .from('merchant_claims' as never)
      .select('amount_at_risk')
      .eq('merchant_id' as never, ctx.merchantId as never)
      .in('status' as never, ['open', 'under_review', 'evidence_requested', 'pending', 'escalated'] as never)
      .then((r: { data: Array<{ amount_at_risk: number | null }> | null; error: unknown }) => r.error ? [] : (r.data ?? [])),
  ]);

  // Build 8-week claim trend
  const claimTrend: TrendDataPoint[] = buildWeeklyTrend(
    claimTrendRaw as Array<{ submitted_at: string | null; created_at: string }>,
  );
  // Exposure at risk = sum of open claim amounts
  const exposureAtRisk = (exposureRaw as Array<{ amount_at_risk: number | null }>).reduce(
    (sum, r) => sum + (r.amount_at_risk ?? 0),
    0,
  );

  const typedRuns = (runs ?? []) as unknown as RunRow[];
  const latestRun = typedRuns[0] ?? null;
  const recentRuns = typedRuns.slice(0, 4);
  const { total: totalPackages, ce3Eligible: priorMatchPackages } = evidenceCounts;

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

  /* ---- Activity feed ---- */
  const activity: ActivityItem[] = [];
  if (reviewRows[0]) {
    const row = reviewRows[0];
    activity.push({
      type: 'Queue',
      detail: `${row.customer_name ?? row.customer_email ?? 'Unidentified'} · ${row.match_status ?? 'candidate'}`,
      time: formatDateMode(row.processed_at, 'recent'),
      href: profileIdByTx.get(row.id) ? `/customers/${profileIdByTx.get(row.id)}` : `/audit/${row.job_id}`,
    });
  }
  if (claimsNeedingAction > 0) {
    activity.push({
      type: 'Claims',
      detail: `${claimsNeedingAction} claim${claimsNeedingAction === 1 ? '' : 's'} awaiting a decision`,
      time: 'current',
      href: '/claims',
    });
  }
  if (priorMatchPackages > 0) {
    activity.push({
      type: 'Evidence',
      detail: `${priorMatchPackages} dispute-ready package${priorMatchPackages === 1 ? '' : 's'}`,
      time: 'current',
      href: '/chargebacks',
    });
  }
  if (watchlistNeedReview > 0) {
    activity.push({
      type: 'Watchlist',
      detail: `${watchlistNeedReview} appearance${watchlistNeedReview === 1 ? '' : 's'} pending review`,
      time: 'current',
      href: '/watchlist',
    });
  }
  if (latestRun) {
    activity.push({
      type: 'Import',
      detail: `${latestRun.filename} · ${(latestRun.flagged_count ?? 0).toLocaleString()} flagged`,
      time: formatDateMode(latestRun.created_at, 'recent'),
      href: `/audit/${latestRun.id}`,
    });
  }

  /* ---- KPI set (state-dependent) ---- */
  const kpis = buildKpis(setupState, connectionState, dataPresence, {
    reviewQueue,
    claimsNeedingAction,
    totalPackages,
  });

  const customerCount = dataPresence.sources.customerProfiles;
  const gradeDist = buildGradeDist(reviewRows);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <TrackPageView event="Dashboard Viewed" />

      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="t-heading" style={{ color: 'var(--ink-primary)' }}>Dashboard</h1>
          <p className="text-body-sm mt-1" style={{ color: 'var(--ink-secondary)' }}>{config.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {config.secondaryCta ? (
            <Link
              href={config.secondaryCta.href}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-caption font-semibold"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)', color: 'var(--ink-secondary)' }}
            >
              <Upload className="h-3.5 w-3.5" />
              {config.secondaryCta.label}
            </Link>
          ) : null}
          <Link
            href={config.primaryCta.href}
            className="btn-accent inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-caption font-semibold"
          >
            {config.primaryCta.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Setup / completeness banner */}
      {config.banner ? <CompletenessBanner banner={config.banner} primaryCta={config.primaryCta} /> : null}

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <MetricCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Trend row — claims over time + exposure snapshot */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-lg border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-body-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>Claims over time</p>
              <p className="text-caption" style={{ color: 'var(--ink-tertiary)' }}>8-week trend from your helpdesk</p>
            </div>
            <Link href="/claims" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>View claims →</Link>
          </div>
          {connectionState.helpdesk && claimTrend.some((pt) => pt.value > 0) ? (
            <WeeklyTrendChart data={claimTrend} color="var(--accent)" primaryLabel="Claims" height={130} />
          ) : (
            <div
              className="flex h-[130px] items-center justify-center rounded-md"
              style={{ background: 'var(--bg-surface-alt)', border: '1px dashed var(--border-default)' }}
            >
              <p className="text-caption text-center px-4" style={{ color: 'var(--ink-tertiary)' }}>
                {connectionState.helpdesk ? 'No claims in the past 8 weeks' : 'Connect your helpdesk to see claim trends'}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-lg border p-4 flex flex-col gap-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          <div>
            <p className="text-caption" style={{ color: 'var(--ink-tertiary)' }}>Exposure at risk</p>
            <p className="num font-semibold mt-1" style={{ fontSize: 26, color: exposureAtRisk > 0 ? 'var(--sev-definite)' : 'var(--data-score)' }}>
              {exposureAtRisk > 0 ? formatCurrencyNullable(exposureAtRisk) : '—'}
            </p>
            <p className="text-caption mt-0.5" style={{ color: 'var(--ink-secondary)' }}>
              {exposureAtRisk > 0 ? 'Open claims with amounts' : 'No open claim exposure'}
            </p>
          </div>
          <div>
            <p className="text-caption mb-2" style={{ color: 'var(--ink-tertiary)' }}>Identity grade distribution</p>
            <GradeDistBar grades={gradeDist} />
          </div>
        </section>
      </div>

      {/* Main cockpit grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Attention queue */}
        <section className="rounded-lg border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4" style={{ color: 'var(--ink-tertiary)' }} />
              <div>
                <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Attention queue</p>
                <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>
                  Customers with linked identities or claim history worth a look
                </p>
              </div>
            </div>
            <Link href="/customers?risk=high&status=new" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              View all →
            </Link>
          </div>

          {reviewRows.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-body-sm font-medium" style={{ color: 'var(--text)' }}>
                {customerCount > 0 ? 'Nothing needs review right now.' : 'No customers monitored yet.'}
              </p>
              <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>
                {customerCount > 0
                  ? `${customerCount.toLocaleString()} customer profiles monitored. High-confidence matches surface here as analysis runs.`
                  : 'Customer profiles appear once Shopify or an import syncs data.'}
              </p>
              <div className="mt-3 flex items-center justify-center gap-4">
                {customerCount > 0 && (
                  <Link href="/customers" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                    Browse customers →
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div>
              {dedupeQueueByCustomer(reviewRows, profileIdByTx).map(({ row, profileId, extraOrders }) => {
                const score = row.identity_score === null ? null : Math.round(row.identity_score);
                const href = profileId ? `/customers/${profileId}` : `/audit/${row.job_id}/transaction/${row.id}`;
                const signalCount = signalList(row).length;
                const networkLinked = signalList(row).some((s) => s.toLowerCase().includes('crossmerchant'));
                return (
                  <Link
                    key={profileId ?? row.id}
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
                        {extraOrders > 0 ? `+${extraOrders} more order${extraOrders === 1 ? '' : 's'} · ` : ''}
                        {signalCount > 0 ? `${signalCount} signal${signalCount === 1 ? '' : 's'} matched` : 'No signal breakdown'} · {formatDateMode(row.processed_at, 'recent')}
                      </p>
                    </div>
                    <span className="text-caption self-center font-semibold" style={{ color: 'var(--accent)' }}>Open →</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Right rail modules */}
        <aside className="space-y-4">
          <ModuleCard title="Claims needing action" href="/claims" linkLabel="Open claims" icon={Headphones}>
            {connectionState.helpdesk ? (
              <>
                <p className="num font-semibold" style={{ fontSize: 22, color: 'var(--data-score)' }}>
                  {claimsNeedingAction.toLocaleString()}
                </p>
                <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>
                  {claimsNeedingAction > 0
                    ? 'Awaiting a decision or evidence. Review before SLA lapses.'
                    : 'No open claims need action right now.'}
                </p>
              </>
            ) : (
              <p className="text-caption" style={{ color: 'var(--warning)' }}>
                Connect your helpdesk to add claim history and surface claims that need a decision.
              </p>
            )}
          </ModuleCard>

          <ModuleCard title="Evidence ready" href="/chargebacks" linkLabel="View all" icon={ShieldCheck}>
            <p className="num font-semibold" style={{ fontSize: 22, color: 'var(--data-score)' }}>
              {totalPackages.toLocaleString()}
            </p>
            <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>
              {totalPackages === 0
                ? 'Generate an evidence package from a customer profile when a dispute needs documentation.'
                : priorMatchPackages > 0
                  ? `${priorMatchPackages} include a prior identity match — strongest for disputes.`
                  : 'Export packaged identity evidence for dispute review.'}
            </p>
          </ModuleCard>

          <ModuleCard title="Watchlist appearances" href="/watchlist" linkLabel="Open" icon={Eye}>
            <p className="num font-semibold" style={{ fontSize: 22, color: 'var(--data-score)' }}>
              {watchlistNeedReview.toLocaleString()}
            </p>
            <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>
              {watchlistNeedReview > 0
                ? 'Watched identities appeared in new activity — review pending.'
                : 'No new appearances from watched identities.'}
            </p>
          </ModuleCard>

          <ModuleCard title="Sync health" href="/settings/integrations" linkLabel="Manage" icon={Activity}>
            <div className="space-y-2">
              <SyncRow label="Shopify" connected={connectionState.shopify} icon={ShoppingBag} />
              <SyncRow
                label={connectionState.helpdeskProvider ? capitalize(connectionState.helpdeskProvider) : 'Helpdesk'}
                connected={connectionState.helpdesk}
                icon={Headphones}
              />
            </div>
          </ModuleCard>

          <ModuleCard title="Recent activity" icon={Activity}>
            {activity.length === 0 ? (
              <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>No recent activity.</p>
            ) : (
              <div className="space-y-2.5">
                {activity.slice(0, 5).map((item, idx) => {
                  const content = (
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                      <span className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>{item.type}</span>
                      <p className="truncate text-caption" style={{ color: 'var(--text)' }}>{item.detail}</p>
                      <span className="text-caption font-mono" style={{ color: 'var(--text-subtle)' }}>{item.time}</span>
                    </div>
                  );
                  return item.href ? (
                    <Link key={`${item.type}-${idx}`} href={item.href} className="block hover:opacity-80">{content}</Link>
                  ) : (
                    <div key={`${item.type}-${idx}`}>{content}</div>
                  );
                })}
              </div>
            )}
          </ModuleCard>

          {/* Secondary: import / backfill summary */}
          <section className="rounded-lg border" style={{ background: 'var(--bg-surface-alt)', borderColor: 'var(--border-default)' }}>
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Upload className="h-3.5 w-3.5" style={{ color: 'var(--ink-tertiary)' }} />
                <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Imports & backfill</p>
              </div>
              <Link href="/history" className="text-caption font-semibold hover:underline" style={{ color: 'var(--ink-tertiary)' }}>
                History →
              </Link>
            </div>
            <div className="border-t px-4 py-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
              {recentRuns.length === 0 ? (
                <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>
                  {setupState === 'csv_only'
                    ? 'No imports yet.'
                    : 'No CSV imports — your data is syncing from live sources. CSV is optional for backfills.'}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {recentRuns.map((run) => (
                    <Link key={run.id} href={`/audit/${run.id}`} className="block hover:opacity-80">
                      <p className="truncate text-caption font-medium" style={{ color: 'var(--text)' }}>{run.filename}</p>
                      <p className="text-caption font-mono" style={{ color: 'var(--text-muted)' }}>
                        {(run.flagged_count ?? 0).toLocaleString()} flagged · {formatDateMode(run.created_at, 'recent')}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ---------- Sub-components & helpers ---------- */

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function SyncRow({
  label,
  connected,
  icon: Icon,
}: {
  label: string;
  connected: boolean;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: 'var(--ink-tertiary)' }} />
        <span className="text-caption" style={{ color: 'var(--text)' }}>{label}</span>
      </div>
      {connected ? (
        <span className="flex items-center gap-1.5 text-caption font-medium" style={{ color: 'var(--sev-clear)' }}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Connected
        </span>
      ) : (
        <Link href="/settings/integrations" className="flex items-center gap-1.5 text-caption font-medium hover:underline" style={{ color: 'var(--warning)' }}>
          <AlertTriangle className="h-3.5 w-3.5" /> Not connected
        </Link>
      )}
    </div>
  );
}

function CompletenessBanner({
  banner,
  primaryCta,
}: {
  banner: { tone: Tone; title: string; body: string };
  primaryCta: { label: string; href: string };
}) {
  const accentBorder =
    banner.tone === 'stale'
      ? 'var(--border-default)'
      : 'color-mix(in srgb, var(--warning) 35%, var(--border-default))';
  const bg =
    banner.tone === 'stale'
      ? 'var(--bg-surface)'
      : 'color-mix(in srgb, var(--warning) 7%, var(--bg-surface))';
  return (
    <section
      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border px-4 py-3.5"
      style={{ background: bg, borderColor: accentBorder }}
    >
      <div className="flex items-start gap-3 min-w-0">
        <span
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{ background: 'color-mix(in srgb, var(--warning) 14%, transparent)' }}
        >
          <AlertTriangle className="h-4 w-4" style={{ color: 'var(--warning)' }} />
        </span>
        <div className="min-w-0">
          <p className="text-body-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>{banner.title}</p>
          <p className="text-caption mt-0.5 leading-snug" style={{ color: 'var(--ink-secondary)' }}>{banner.body}</p>
        </div>
      </div>
      <Link
        href={primaryCta.href}
        className="btn-accent shrink-0 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-caption font-semibold"
      >
        {primaryCta.label}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

function SyncWaitingHero({ connection }: { connection: ConnectionState }) {
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="font-semibold mb-1.5" style={{ fontSize: 20, color: 'var(--ink-primary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
          Your sources are connected. Waiting for synced data.
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-secondary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
          Shopify and your helpdesk are both connected. We&apos;re waiting for the first customer, order, and claim data to
          sync. This usually completes within a few minutes of the first webhook.
        </p>
      </div>
      <div className="rounded-xl border p-5 space-y-3" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-default)' }}>
        <SyncRow label="Shopify" connected={connection.shopify} icon={ShoppingBag} />
        <SyncRow
          label={connection.helpdeskProvider ? capitalize(connection.helpdeskProvider) : 'Helpdesk'}
          connected={connection.helpdesk}
          icon={Headphones}
        />
        <div className="flex items-center gap-2 pt-1 text-caption" style={{ color: 'var(--ink-tertiary)' }}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Waiting for first sync…
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/settings/integrations" className="btn-accent inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold">
          Check sync status
        </Link>
        <Link href="/upload" className="text-sm font-medium hover:underline" style={{ color: 'var(--ink-tertiary)' }}>
          Historical import →
        </Link>
      </div>
    </div>
  );
}

type Kpi = {
  label: string;
  value: string;
  hint?: string;
  incomplete?: boolean;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
};

function fmt(n: number): string {
  return n === 0 ? '—' : n.toLocaleString();
}

function buildKpis(
  state: MerchantSetupState,
  connection: ConnectionState,
  presence: MerchantDataPresence,
  metrics: { reviewQueue: number | null; claimsNeedingAction: number; totalPackages: number },
): Kpi[] {
  const s = presence.sources;
  const customers: Kpi = {
    label: state === 'csv_only' ? 'Imported customers' : 'Customers monitored',
    value: fmt(s.customerProfiles),
    hint: s.customerProfiles > 0 ? 'Profiles across all sources' : 'Appears once data syncs',
    icon: Users,
  };
  const orders: Kpi = {
    label: 'Orders synced',
    value: fmt(s.shopifyOrderSignals || s.auditTransactions),
    hint: s.shopifyOrderSignals > 0 ? 'From Shopify' : s.auditTransactions > 0 ? 'From imports' : undefined,
    icon: ShoppingBag,
  };
  const identityMatches: Kpi = {
    label: 'Identity matches',
    value: metrics.reviewQueue === null ? 'Unavailable' : fmt(metrics.reviewQueue),
    hint: 'High-confidence linked identities',
    icon: Users,
  };
  const evidence: Kpi = {
    label: 'Evidence ready',
    value: fmt(metrics.totalPackages),
    hint: 'Dispute-ready packages',
    icon: ShieldCheck,
  };
  const reviewQueue: Kpi = {
    label: 'Review queue',
    value: metrics.reviewQueue === null ? 'Unavailable' : fmt(metrics.reviewQueue),
    hint: 'Profiles needing a look',
    icon: Inbox,
  };
  const claims: Kpi = {
    label: 'Claims needing action',
    value: connection.helpdesk ? fmt(metrics.claimsNeedingAction) : 'Missing',
    hint: connection.helpdesk ? 'Awaiting a decision' : 'Connect helpdesk to add claim history',
    incomplete: !connection.helpdesk,
    icon: Headphones,
  };
  const syncHealth: Kpi = {
    label: 'Sync health',
    value: connection.bothConnected ? 'Healthy' : connection.neitherConnected ? 'Offline' : 'Partial',
    hint: connection.bothConnected ? 'Both sources connected' : 'One source missing',
    incomplete: !connection.bothConnected,
    icon: Activity,
  };

  switch (state) {
    case 'shopify_only_with_data':
      return [customers, orders, identityMatches, claims, evidence];
    case 'helpdesk_only_with_data':
      return [
        { label: 'Claims tracked', value: fmt(s.merchantClaims + s.supportCases), hint: 'From your helpdesk', icon: Headphones },
        claims,
        customers,
        { label: 'Order context', value: 'Missing', hint: 'Connect Shopify to add orders', incomplete: true, icon: ShoppingBag },
        evidence,
      ];
    case 'csv_only':
      return [
        customers,
        reviewQueue,
        { label: 'Matched orders', value: fmt(s.auditTransactions), hint: 'From imports', icon: ShoppingBag },
        evidence,
        { label: 'Live monitoring', value: 'Off', hint: 'Connect Shopify & helpdesk', incomplete: true, icon: Activity },
      ];
    case 'stale_existing_data':
      return [customers, identityMatches, orders, evidence, syncHealth];
    case 'fully_connected_with_data':
    default:
      return [customers, reviewQueue, claims, evidence, syncHealth];
  }
}

// Build an 8-week trend array from rows that have submitted_at or created_at
function buildWeeklyTrend(
  rows: Array<{ submitted_at: string | null; created_at: string }>,
): TrendDataPoint[] {
  const NOW = Date.now();
  const WEEK_MS = 7 * 24 * 3600 * 1000;
  const counts = new Array<number>(8).fill(0);
  for (const row of rows) {
    const ts = new Date(row.submitted_at ?? row.created_at).getTime();
    const weeksAgo = Math.floor((NOW - ts) / WEEK_MS);
    if (weeksAgo >= 0 && weeksAgo < 8) counts[7 - weeksAgo] += 1;
  }
  return counts.map((value, i) => ({
    label: i === 7 ? 'Now' : i === 6 ? '1w' : `${8 - i}w`,
    value,
  }));
}

// Build grade distribution array from review queue rows
function buildGradeDist(rows: QueueRow[]): GradeDistEntry[] {
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  for (const row of rows) {
    const g = gradeFromQueueRow(row);
    if (g in counts) counts[g as keyof typeof counts] += 1;
  }
  return [
    { key: 'A', label: 'A · Definite', count: counts.A, color: 'var(--sev-definite)' },
    { key: 'B', label: 'B · Probable', count: counts.B, color: 'var(--sev-probable)' },
    { key: 'C', label: 'C · Possible', count: counts.C, color: 'var(--sev-possible)' },
    { key: 'D', label: 'D · Weak',     count: counts.D, color: 'var(--sev-clear)' },
  ];
}

async function countEvidence(
  serviceClient: ReturnType<typeof createServiceClient>,
  merchantId: string,
): Promise<{ total: number; ce3Eligible: number }> {
  const [{ count: total }, { count: ce3Eligible }] = await Promise.all([
    serviceClient
      .from('evidence_packages' as never)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId),
    serviceClient
      .from('evidence_packages' as never)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .eq('ce3_eligible', true),
  ]);
  return { total: total ?? 0, ce3Eligible: ce3Eligible ?? 0 };
}

async function countClaimsNeedingAction(
  serviceClient: ReturnType<typeof createServiceClient>,
  merchantId: string,
): Promise<number> {
  const { count } = await serviceClient
    .from('merchant_claims' as never)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .in('status', ['open', 'under_review', 'evidence_requested', 'pending', 'escalated']);
  return count ?? 0;
}
