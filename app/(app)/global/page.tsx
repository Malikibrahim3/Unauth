import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, GitBranch } from 'lucide-react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { formatDateMode } from '@/lib/utils/format';
import { MetricCard, SectionCard } from '@/components/ui';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { riskLevelToNewGrade } from '@/lib/confidence';
import { signalCopy } from '@/lib/copy/signals';

type RunRow = {
  id: string;
  filename: string;
  created_at: string;
  total_rows: number;
  flagged_count: number | null;
};

type ProfileRow = {
  id: string;
  primary_email: string | null;
  risk_level: string;
  risk_score: number;
  total_orders: number;
  total_merchants_seen_at: number;
  total_refund_claims: number;
  first_seen: string;
  last_seen: string;
  identity_confidence_grade: string | null;
  identity_signals_summary: string[] | null;
};

export default async function GlobalGraphPage() {
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) redirect('/dashboard');

  const merchantFilter = `merchant_ids.cs.${JSON.stringify([ctx.merchantId])},merchant_ids.cs.${JSON.stringify([user.id])}`;
  const [{ data: runs }, { data: profiles }, { data: networkProfiles }, definite, probable, possible, weak] = await Promise.all([
    serviceClient
      .from('processing_jobs')
      .select('id,filename,created_at,total_rows,flagged_count')
      .eq('merchant_id', ctx.merchantId)
      .eq('hidden_by_merchant', false)
      .order('created_at', { ascending: false })
      .limit(20),
    serviceClient
      .from('customer_profiles')
      .select('id,primary_email,risk_level,risk_score,total_orders,total_merchants_seen_at,total_refund_claims,first_seen,last_seen,identity_confidence_grade,identity_signals_summary')
      .or(merchantFilter)
      .gt('total_merchants_seen_at', 1)
      .order('total_merchants_seen_at', { ascending: false })
      .order('risk_score', { ascending: false })
      .limit(25),
    serviceClient
      .from('customer_profiles')
      .select('id,total_orders,total_merchants_seen_at,total_refund_claims')
      .or(merchantFilter)
      .gt('total_merchants_seen_at', 1)
      .limit(1000),
    serviceClient.from('customer_profiles').select('id', { count: 'exact', head: true }).or(merchantFilter).gt('total_merchants_seen_at', 1).eq('identity_confidence_grade', 'definite'),
    serviceClient.from('customer_profiles').select('id', { count: 'exact', head: true }).or(merchantFilter).gt('total_merchants_seen_at', 1).eq('identity_confidence_grade', 'probable'),
    serviceClient.from('customer_profiles').select('id', { count: 'exact', head: true }).or(merchantFilter).gt('total_merchants_seen_at', 1).eq('identity_confidence_grade', 'possible'),
    serviceClient.from('customer_profiles').select('id', { count: 'exact', head: true }).or(merchantFilter).gt('total_merchants_seen_at', 1).eq('identity_confidence_grade', 'weak'),
  ]);

  const runRows = (runs ?? []) as RunRow[];
  const clusterRows = (profiles ?? []) as ProfileRow[];
  const networkRows = (networkProfiles ?? []) as Array<Pick<ProfileRow, 'id' | 'total_orders' | 'total_merchants_seen_at' | 'total_refund_claims'>>;
  const totalRows = runRows.reduce((sum, run) => sum + (run.total_rows ?? 0), 0);
  const crossMerchantMatches = networkRows.length;
  const networkLinkedOrders = networkRows.reduce((sum, row) => sum + row.total_orders, 0);
  const networkClaims = networkRows.reduce((sum, row) => sum + row.total_refund_claims, 0);
  const maxMerchantSpan = Math.max(0, ...networkRows.map((row) => row.total_merchants_seen_at ?? 0));
  const recentTrend = runRows.slice(0, 8).reverse().map((run) => ({
    label: formatDateMode(run.created_at, 'table'),
    value: run.flagged_count ?? 0,
    rate: run.total_rows > 0 ? ((run.flagged_count ?? 0) / run.total_rows) * 100 : 0,
  }));
  const maxTrendValue = Math.max(1, ...recentTrend.map((item) => item.value));
  const merchantSpanBuckets = [
    { label: '2 merchants', count: networkRows.filter((row) => row.total_merchants_seen_at === 2).length },
    { label: '3 merchants', count: networkRows.filter((row) => row.total_merchants_seen_at === 3).length },
    { label: '4+ merchants', count: networkRows.filter((row) => row.total_merchants_seen_at >= 4).length },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-overline mb-2" style={{ color: 'var(--text-muted)' }}>Persistent intelligence</p>
          <h1 className="text-h1">Global Identity Graph</h1>
          <p className="text-body-sm mt-2 max-w-3xl" style={{ color: 'var(--text-muted)' }}>
            Cross-run and cross-merchant matches for your merchant, with privacy-safe network counts. Other merchant names and order details are intentionally hidden.
          </p>
        </div>
        <Link href="/upload" className="btn-accent rounded-md px-3 py-2 text-caption font-semibold">Process CSV</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Network-linked profiles" value={crossMerchantMatches.toLocaleString()} hint="Seen at 2+ merchants" />
        <MetricCard label="Network-linked orders" value={networkLinkedOrders.toLocaleString()} hint={`${totalRows.toLocaleString()} rows scanned`} />
        <MetricCard label="Claims in clusters" value={networkClaims.toLocaleString()} hint="Refund or dispute events" />
        <MetricCard label="Widest footprint" value={maxMerchantSpan ? `${maxMerchantSpan} merchants` : '—'} hint="Names and order IDs hidden" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-md border p-4" style={{ background: 'var(--surface-raised)', borderColor: 'var(--surface-border)' }}>
          <p className="t-label" style={{ color: 'var(--ink-tertiary)' }}>Controls</p>
          <div className="mt-4 space-y-4">
            {['Grade tier', 'Merchant count', 'Date range'].map((label) => (
              <label key={label} className="block">
                <span className="t-label mb-2 block" style={{ color: 'var(--ink-tertiary)' }}>{label}</span>
                <select className="w-full rounded-md border px-3 py-2 text-sm" style={{ background: 'var(--surface-input)', borderColor: 'var(--surface-border)', color: 'var(--ink-primary)' }}>
                  <option>All</option>
                  <option>Definite</option>
                  <option>Probable</option>
                </select>
              </label>
            ))}
          </div>
        </aside>
        <section className="relative min-h-[440px] overflow-hidden rounded-md border" style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)' }}>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 440" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Cross-merchant identity graph">
            <defs>
              <filter id="nodePulse">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="var(--copper-bright)" floodOpacity="0.35" />
              </filter>
            </defs>
            {clusterRows.slice(0, 12).map((cluster, index) => {
              const angle = (Math.PI * 2 * index) / Math.max(1, Math.min(clusterRows.length, 12));
              const x = 450 + Math.cos(angle) * (135 + (index % 3) * 38);
              const y = 220 + Math.sin(angle) * (100 + (index % 2) * 46);
              const width = Math.max(1.5, Math.min(7, cluster.risk_score / 18));
              return (
                <line
                  key={`edge-${cluster.id}`}
                  x1="450"
                  y1="220"
                  x2={x}
                  y2={y}
                  stroke="var(--surface-muted)"
                  strokeWidth={width}
                  opacity="0.55"
                />
              );
            })}
            <circle cx="450" cy="220" r="34" fill="var(--copper-dim)" stroke="var(--copper-bright)" strokeWidth="2" filter="url(#nodePulse)" />
            <text x="450" y="224" textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--ink-primary)">GRAPH</text>
            {clusterRows.slice(0, 12).map((cluster, index) => {
              const angle = (Math.PI * 2 * index) / Math.max(1, Math.min(clusterRows.length, 12));
              const x = 450 + Math.cos(angle) * (135 + (index % 3) * 38);
              const y = 220 + Math.sin(angle) * (100 + (index % 2) * 46);
              const fill =
                riskLevelToNewGrade(cluster.risk_level) === 'A' ? 'var(--sev-definite)' :
                riskLevelToNewGrade(cluster.risk_level) === 'B' ? 'var(--sev-probable)' :
                'var(--sev-neutral)';
              const r = Math.max(10, Math.min(26, cluster.total_orders + cluster.risk_score / 8));
              return (
                <g key={cluster.id}>
                  <circle cx={x} cy={y} r={r} fill={fill} opacity="0.92" />
                  <circle cx={x} cy={y} r={r + 5} fill="none" stroke="var(--copper-bright)" strokeWidth={index === 0 ? 2 : 0} opacity="0.85" />
                </g>
              );
            })}
          </svg>
          <div className="absolute bottom-4 left-4 rounded-md border px-3 py-2" style={{ background: 'var(--surface-overlay)', borderColor: 'var(--surface-border)' }}>
            <p className="t-label" style={{ color: 'var(--ink-tertiary)' }}>Selected node</p>
            <p className="t-body mt-1" style={{ color: 'var(--ink-primary)' }}>{clusterRows[0]?.primary_email ?? 'No node selected'}</p>
          </div>
        </section>
      </div>

      <SectionCard title="Confidence breakdown">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['A', 'Definite', definite.count ?? 0],
            ['B', 'Probable', probable.count ?? 0],
            ['C', 'Possible', possible.count ?? 0],
            ['D', 'Weak', weak.count ?? 0],
          ].map(([grade, label, count]) => (
            <div key={String(label)} className="rounded-md border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
              <ConfidenceBadge grade={grade as any} size="sm" />
              <p className="text-mono-lg mt-2" style={{ color: 'var(--text)' }}>{Number(count).toLocaleString()}</p>
              <p className="text-caption" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <SectionCard title="Network signal trend" description="Recent audit match volume and match rate">
          <div className="grid grid-cols-8 gap-2 min-h-[172px] items-end">
            {recentTrend.map((item) => (
              <div key={item.label} className="flex min-w-0 flex-col items-center gap-2">
                <div className="flex h-28 w-full items-end rounded-sm" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                  <div
                    className="w-full rounded-sm"
                    title={`${item.value.toLocaleString()} matches · ${item.rate.toFixed(1)}%`}
                    style={{
                      height: `${Math.max(8, (item.value / maxTrendValue) * 100)}%`,
                      background: 'linear-gradient(180deg, var(--accent) 0%, var(--brand-ink) 100%)',
                    }}
                  />
                </div>
                <p className="text-[10px] leading-tight text-center truncate w-full" style={{ color: 'var(--text-subtle)' }}>{item.label}</p>
                <p className="text-caption font-mono" style={{ color: 'var(--text)' }}>{item.rate.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Merchant span distribution" description="How widely linked profiles appear">
          <div className="space-y-3">
            {merchantSpanBuckets.map((bucket) => {
              const pct = crossMerchantMatches > 0 ? (bucket.count / crossMerchantMatches) * 100 : 0;
              return (
                <div key={bucket.label}>
                  <div className="flex items-center justify-between text-caption mb-1">
                    <span style={{ color: 'var(--text)' }}>{bucket.label}</span>
                    <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{bucket.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-sm" style={{ background: 'var(--bg-inset)' }}>
                    <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <SectionCard title="Flagged identity clusters">
          {clusterRows.length === 0 ? (
            <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>No cross-merchant clusters are visible for this merchant yet.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {clusterRows.map((cluster) => {
                const signals = cluster.identity_signals_summary ?? [];
                return (
                  <Link key={cluster.id} href={`/customers/${cluster.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3 hover:opacity-80">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <GitBranch className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        <p className="truncate text-body-sm font-semibold" style={{ color: 'var(--text)' }}>
                          {cluster.primary_email ?? `Cluster ${cluster.id.slice(0, 8)}`}
                        </p>
                        <ConfidenceBadge grade={riskLevelToNewGrade(cluster.risk_level)} size="sm" />
                      </div>
                      <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>
                        Network footprint: {cluster.total_merchants_seen_at} merchants · {cluster.total_orders} orders · {cluster.total_refund_claims} claims
                      </p>
                      <p className="text-caption mt-1 truncate" style={{ color: 'var(--text-subtle)' }}>
                        {signals.length > 0 ? signals.slice(0, 4).map((signal) => signalCopy(signal).short).join(', ') : 'No signal summary stored'}
                      </p>
                    </div>
                    <span className="self-center inline-flex items-center gap-1 text-caption font-semibold" style={{ color: 'var(--accent)' }}>
                      Deep dive <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="CSV runs processed">
          <div className="space-y-3">
            {runRows.map((run) => (
              <Link key={run.id} href={`/audit/${run.id}`} className="block rounded-md border p-3 hover:bg-[var(--bg-hover)]" style={{ borderColor: 'var(--border-subtle)' }}>
                <p className="truncate text-caption font-semibold" style={{ color: 'var(--text)' }}>{run.filename}</p>
                <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>
                  {formatDateMode(run.created_at, 'table')} · {run.total_rows.toLocaleString()} rows · {(run.flagged_count ?? 0).toLocaleString()} matches
                </p>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
