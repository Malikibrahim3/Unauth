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
import EmptyDashboardHero from '@/components/EmptyDashboardHero';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { Badge } from '@/components/ui/Badge';
import { riskLevelToNewGrade } from '@/lib/confidence';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import { getMerchantDataPresence } from '@/lib/supabase/getMerchantDataPresence';
import PartialSetupHero from '@/components/PartialSetupHero';

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

type DedupedQueueEntry = {
  row: QueueRow;
  profileId: string | undefined;
  extraOrders: number;
};

function dedupeQueueByCustomer(
  rows: QueueRow[],
  profileIdByTx: Map<string, string>,
): DedupedQueueEntry[] {
  const byKey = new Map<string, DedupedQueueEntry>();
  for (const row of rows) {
    const profileId = profileIdByTx.get(row.id);
    const key = profileId ?? row.customer_email ?? row.customer_name ?? row.id;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { row, profileId, extraOrders: 0 });
    } else {
      existing.extraOrders += 1;
    }
  }
  return Array.from(byKey.values());
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

  const connectionState = await getConnectionState(serviceClient, ctx.merchantId);

  const [{ data: runs }, dataPresence] = await Promise.all([
    serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .select('*')
      .eq('merchant_id', ctx.merchantId)
      .eq('hidden_by_merchant', false)
      .order('created_at', { ascending: false })
      .limit(50),
    // Pass user.id so legacy profiles stored with auth-user UUID are counted.
    getMerchantDataPresence(serviceClient, ctx.merchantId, user.id),
  ]);
  const typedRuns = (runs ?? []) as unknown as RunRow[];
  const latestRun = typedRuns[0] ?? null;

  // isFresh: no data from any source AND no active connections
  const isFresh = !dataPresence.hasAnyData && connectionState.neitherConnected;
  // partialSetup: at least one integration active but no data has arrived yet
  const partialSetup = !dataPresence.hasAnyData && !connectionState.neitherConnected && !connectionState.bothConnected;

  const jobIds = typedRuns.map((run) => run.id);

  const { data: evidenceRows } = await serviceClient
    .from('evidence_packages' as never)
    .select('ce3_eligible')
    .eq('merchant_id', ctx.merchantId);
  const totalPackages = evidenceRows?.length ?? 0;
  const priorMatchPackages =
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

  const recentRuns = typedRuns.slice(0, 5);

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
  if (priorMatchPackages > 0) {
    activity.push({
      type: 'Evidence',
      detail: `${priorMatchPackages} evidence report${priorMatchPackages === 1 ? '' : 's'} with prior identity match`,
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

  if (isFresh) {
    return (
      <div className="p-4 md:p-6">
        <TrackPageView event="Dashboard Viewed" />
        <EmptyDashboardHero />
      </div>
    );
  }

  if (partialSetup) {
    return (
      <div className="p-4 md:p-6">
        <TrackPageView event="Dashboard Viewed" />
        <PartialSetupHero connection={connectionState} />
      </div>
    );
  }

  // Has data (any source) or both connections active — show real dashboard.
  // hasExistingProfiles: customer_profiles exist but neither integration is connected,
  // meaning the profiles came from a previous Shopify sync that is no longer active.
  const hasExistingProfiles =
    dataPresence.sources.customerProfiles > 0 && connectionState.neitherConnected;

  return (
    <PageConnectionGate
      requires="both"
      connection={connectionState}
      pageName="Dashboard"
      hasData={dataPresence.hasAnyData}
      hasExistingProfiles={hasExistingProfiles}
    >
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
              Look up customers, review linked identities, and export evidence for your helpdesk.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {typedRuns.some((run) => run.status === 'completed') ? (
              <span className="t-label flex items-center gap-2" style={{ color: 'var(--ink-tertiary)' }}>
                <span className="ua-pulse h-2 w-2 rounded-full" style={{ background: 'var(--sev-clear)' }} />
                Data synced
              </span>
            ) : null}
            {connectionState.shopifyOnlyConnected ? (
              <Link href="/settings/integrations" className="btn-accent rounded-md px-3 py-1.5 text-caption font-semibold">
                Connect helpdesk
              </Link>
            ) : connectionState.helpdeskOnlyConnected ? (
              <Link href="/settings/integrations" className="btn-accent rounded-md px-3 py-1.5 text-caption font-semibold">
                Connect Shopify
              </Link>
            ) : !connectionState.bothConnected && dataPresence.sources.customerProfiles > 0 ? (
              <Link href="/settings/integrations" className="btn-accent rounded-md px-3 py-1.5 text-caption font-semibold">
                Reconnect integrations
              </Link>
            ) : (
              <Link href="/upload" className="btn-accent rounded-md px-3 py-1.5 text-caption font-semibold">
                New audit
              </Link>
            )}
          </div>
        </div>

        {!connectionState.bothConnected && (
          <div className="flex items-center gap-2 border-b px-4 py-2" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-alt)' }}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--warning, #b45309)' }} aria-hidden="true" />
            <span className="t-caption" style={{ color: 'var(--ink-secondary)' }}>
              {connectionState.shopifyOnlyConnected
                ? 'Shopify is connected. Connect your helpdesk to add claim history and dispute context.'
                : connectionState.helpdeskOnlyConnected
                  ? 'Your helpdesk is connected. Connect Shopify to add order data.'
                  : dataPresence.sources.customerProfiles > 0
                    ? 'Showing existing Shopify data. Reconnect Shopify and your helpdesk to keep this current.'
                    : 'Connect Shopify and your helpdesk to see complete data.'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 border-b md:grid-cols-4" style={{ borderColor: 'var(--border-default)' }}>
          {[
            {
              label: 'Customer profiles',
              value: dataPresence.sources.customerProfiles === 0 ? '—' : dataPresence.sources.customerProfiles.toLocaleString(),
              hint: dataPresence.sources.customerProfiles > 0 ? 'Synced profiles across all sources' : 'Profiles appear once Shopify or CSV data is imported',
            },
            {
              label: 'Linked identities',
              value: reviewQueue === null ? 'Unavailable' : reviewQueue === 0 ? '—' : reviewQueue.toLocaleString(),
              hint: reviewQueue === null ? 'Count could not be loaded' : reviewQueue === 0 ? 'No high-confidence matches yet — run identity analysis via CSV or Shopify' : 'Profiles with high-confidence identity matches',
            },
            {
              label: 'Evidence packages ready',
              value: totalPackages.toLocaleString(),
              hint: priorMatchPackages > 0 ? `${priorMatchPackages} with prior identity match` : 'Export for dispute review',
            },
            {
              label: 'CSV audit runs',
              value: typedRuns.length.toLocaleString(),
              hint: latestRun
                ? formatDateMode(latestRun.created_at, 'recent')
                : dataPresence.sources.customerProfiles > 0
                  ? 'Customer data active via Shopify — CSV is optional for backfills'
                  : 'Upload a CSV for offline or historical analysis',
            },
          ].map((metric, idx) => (
            <div
              key={metric.label}
              className="px-3 py-3 md:px-4"
              style={{
                borderRightColor: 'var(--border-default)',
                borderRightWidth: idx === 3 ? 0 : 1,
                borderRightStyle: idx === 3 ? 'none' : 'solid',
              }}
            >
              <p className="t-label" style={{ color: 'var(--ink-tertiary)' }}>{metric.label}</p>
              <p className="t-display mt-1 num" style={{ color: 'var(--data-score)' }}>{metric.value}</p>
              <p className="t-caption mt-1" style={{ color: 'var(--ink-tertiary)' }}>{metric.hint}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="border-r" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-alt)' }}>
              <div>
                <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Customers with claim history</p>
                <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>
                  Look up by email, then take intelligence back to Gorgias or Zendesk
                </p>
              </div>
              <Link href="/customers?risk=high&status=new" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                View all
              </Link>
            </div>

            {reviewRows.length === 0 ? (
              <div className="px-4 py-8">
                <p className="text-body-sm font-medium" style={{ color: 'var(--text)' }}>
                  No high-confidence identity matches in the queue.
                </p>
                <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>
                  {dataPresence.sources.customerProfiles > 0
                    ? 'Your customers are imported. Identity matches appear after audit analysis runs.'
                    : 'Identity matches appear after audit analysis runs against your customer data.'}
                </p>
                <div className="mt-3 flex items-center gap-4">
                  {dataPresence.sources.customerProfiles > 0 && (
                    <Link href="/customers" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                      Browse customers →
                    </Link>
                  )}
                  {!connectionState.shopify && (
                    <Link href="/upload" className="text-caption hover:underline" style={{ color: 'var(--ink-tertiary)' }}>
                      Upload CSV
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
                  const networkLinked = signalList(row).some((signal) => signal.toLowerCase().includes('crossmerchant'));
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
            <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-alt)' }}>
              <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>
                {connectionState.helpdesk ? 'Helpdesk connected' : 'Connect your helpdesk'}
              </p>
              {connectionState.helpdesk ? (
                <p className="text-caption mt-1" style={{ color: 'var(--sev-clear)' }}>
                  Claim history is syncing from {connectionState.helpdeskProvider ?? 'your helpdesk'}.
                </p>
              ) : (
                <>
                  <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>
                    {connectionState.shopify
                      ? 'Shopify is connected. Add your helpdesk to bring in claim history and dispute signals.'
                      : 'Gorgias and Zendesk available. Connects claim history directly to customer profiles.'}
                  </p>
                  <Link
                    href="/settings/integrations"
                    className="mt-2 inline-flex items-center gap-1 text-caption font-semibold hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    {connectionState.shopify ? 'Connect helpdesk →' : 'Set up integrations →'}
                  </Link>
                </>
              )}
            </div>

            <div className="border-b px-4 py-2" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-alt)' }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Evidence packages ready</p>
                <Link href="/chargebacks" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                  View all →
                </Link>
              </div>
            </div>
            <div className="border-b px-4 py-2" style={{ borderColor: 'var(--border-subtle)' }}>
              <p className="text-body-sm font-semibold num" style={{ color: 'var(--text)' }}>{totalPackages.toLocaleString()}</p>
              <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>
                {priorMatchPackages > 0
                  ? `${priorMatchPackages} include prior identity matches — export for dispute review.`
                  : 'Generate identity evidence from a customer profile when a dispute needs documentation.'}
              </p>
            </div>

            <div className="border-b px-4 py-2" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-alt)' }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>CSV audit runs</p>
                <Link href="/history" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                  History →
                </Link>
              </div>
            </div>
            <div className="border-b px-4 py-2" style={{ borderColor: 'var(--border-subtle)' }}>
              {recentRuns.length === 0 ? (
                <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>
                  {dataPresence.sources.customerProfiles > 0
                    ? 'No CSV audits. Customer data is synced from Shopify.'
                    : 'No audits yet.'}
                </p>
              ) : (
                <div className="space-y-2">
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

        {process.env.NODE_ENV === 'development' && (
          <details className="border-t px-4 py-2 text-[10px] font-mono" style={{ borderColor: 'var(--border-default)', color: 'var(--ink-tertiary)' }}>
            <summary className="cursor-pointer">debug: data presence</summary>
            <pre className="mt-1 whitespace-pre-wrap">
              {JSON.stringify({
                customerProfiles: dataPresence.sources.customerProfiles,
                csvJobs: dataPresence.sources.csvJobs,
                claims: dataPresence.sources.claims,
                evidencePackages: dataPresence.sources.evidencePackages,
                hasAnyData: dataPresence.hasAnyData,
                shopify: connectionState.shopify,
                helpdesk: connectionState.helpdesk,
                bothConnected: connectionState.bothConnected,
                neitherConnected: connectionState.neitherConnected,
              }, null, 2)}
            </pre>
          </details>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-alt)' }}>
          <span className="text-caption font-mono" style={{ color: 'var(--text-subtle)' }}>
            {latestRun ? `Audit ${formatDateMode(latestRun.created_at, 'table')} · ${latestRun.total_rows.toLocaleString()} rows` : 'No audits yet'}
          </span>
          <span className="text-caption font-mono" style={{ color: 'var(--text-subtle)' }}>
            Privacy-safe matching · encrypted identifiers · your store data only
          </span>
        </footer>
      </section>
    </div>
    </PageConnectionGate>
  );
}
