// TODO(product-gating): require NETWORK_GRAPH entitlement when ENFORCE_PRODUCT_GATES is enabled.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, GitBranch } from 'lucide-react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import { formatDateMode } from '@/lib/utils/format';
import { MetricCard, SectionCard } from '@/components/ui';
import { GradeBadge } from '@/components/ui/GradeBadge';
import { NetworkFootprint } from '@/components/ui/NetworkFootprint';
import { PrivacyBadge } from '@/components/ui/PrivacyBadge';
import { signalCopy } from '@/lib/copy/signals';
import GlobalIdentityGraphClient from '@/components/global/GlobalIdentityGraphClient';
import { gradeToLetter, type ConfidenceGrade } from '@/lib/engine/weights';

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

function gradeFromIdentityGrade(grade: string | null): 'A' | 'B' | 'C' | 'D' {
  const known: ConfidenceGrade[] = ['definite', 'probable', 'possible', 'weak'];
  if (known.includes(grade as ConfidenceGrade)) {
    return gradeToLetter(grade as ConfidenceGrade);
  }
  return 'D';
}

function privacySafeProfileLabel(id: string) {
  return `hash:${id.slice(0, 10)}`;
}

export default async function GlobalGraphPage() {
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) redirect(await resolveDefaultAppPath(serviceClient, user.id));

  const merchantFilter = `merchant_ids.cs.${JSON.stringify([ctx.merchantId])},merchant_ids.cs.${JSON.stringify([user.id])}`;
  const [{ data: runs }, { data: profiles }, { data: networkProfiles }, definite, probable, possible, weak] = await Promise.all([
    serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .select('id,filename,created_at,total_rows,flagged_count')
      .eq('merchant_id', ctx.merchantId)
      .eq('hidden_by_merchant', false)
      .order('created_at', { ascending: false })
      .limit(20),
    serviceClient
      .from(TABLES.CUSTOMER_PROFILES)
      .select('id,primary_email,risk_level,risk_score,total_orders,total_merchants_seen_at,total_refund_claims,first_seen,last_seen,identity_confidence_grade,identity_signals_summary')
      .or(merchantFilter)
      .gt('total_merchants_seen_at', 1)
      .order('total_merchants_seen_at', { ascending: false })
      .order('risk_score', { ascending: false })
      .limit(25),
    serviceClient
      .from(TABLES.CUSTOMER_PROFILES)
      .select('id,total_orders,total_merchants_seen_at,total_refund_claims')
      .or(merchantFilter)
      .gt('total_merchants_seen_at', 1)
      .limit(1000),
    serviceClient.from(TABLES.CUSTOMER_PROFILES).select('id', { count: 'exact', head: true }).or(merchantFilter).gt('total_merchants_seen_at', 1).eq('identity_confidence_grade', 'definite'),
    serviceClient.from(TABLES.CUSTOMER_PROFILES).select('id', { count: 'exact', head: true }).or(merchantFilter).gt('total_merchants_seen_at', 1).eq('identity_confidence_grade', 'probable'),
    serviceClient.from(TABLES.CUSTOMER_PROFILES).select('id', { count: 'exact', head: true }).or(merchantFilter).gt('total_merchants_seen_at', 1).eq('identity_confidence_grade', 'possible'),
    serviceClient.from(TABLES.CUSTOMER_PROFILES).select('id', { count: 'exact', head: true }).or(merchantFilter).gt('total_merchants_seen_at', 1).eq('identity_confidence_grade', 'weak'),
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
          <h1 className="text-h1">Network Intelligence</h1>
          <p className="text-body-sm mt-2 max-w-3xl" style={{ color: 'var(--text-secondary)' }}>
            Cross-run and cross-merchant identity matches, with privacy-safe network counts. Other merchant names and order details are intentionally hidden.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Network-linked profiles" value={crossMerchantMatches.toLocaleString()} hint="Seen at 2+ merchants" />
        <MetricCard label="Network-linked orders" value={networkLinkedOrders.toLocaleString()} hint={`${totalRows.toLocaleString()} rows scanned`} />
        <MetricCard label="Claims on linked shoppers" value={networkClaims.toLocaleString()} hint="Refund or dispute events" />
        <MetricCard label="Widest footprint" value={maxMerchantSpan ? `${maxMerchantSpan} merchants` : '—'} hint="Names and order IDs hidden" />
      </div>

      <GlobalIdentityGraphClient profiles={clusterRows} />

      <SectionCard title="Confidence breakdown">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['A', 'Definite', definite.count ?? 0],
            ['B', 'Probable', probable.count ?? 0],
            ['C', 'Possible', possible.count ?? 0],
            ['D', 'Weak', weak.count ?? 0],
          ].map(([grade, label, count]) => (
            <div key={String(label)} className="rounded-md border p-3" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
              <GradeBadge grade={grade as 'A' | 'B' | 'C' | 'D'} size="sm" compact />
              <p className="text-mono-lg mt-2" style={{ color: 'var(--text)' }}>{Number(count).toLocaleString()}</p>
              <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>{label}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <SectionCard title="Network signal trend" description="Recent audit match volume and match rate">
          <div className="grid grid-cols-8 gap-2 min-h-[172px] items-end">
            {recentTrend.map((item) => (
              <div key={item.label} className="flex min-w-0 flex-col items-center gap-2">
                <div className="flex h-28 w-full items-end rounded-sm" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-muted)' }}>
                  <div
                    className="w-full rounded-sm"
                    title={`${item.value.toLocaleString()} matches · ${item.rate.toFixed(1)}%`}
                    style={{
                      height: `${Math.max(8, (item.value / maxTrendValue) * 100)}%`,
                      background: 'linear-gradient(180deg, var(--neutral) 0%, var(--text-primary) 100%)',
                    }}
                  />
                </div>
                <p className="text-xs leading-tight text-center truncate w-full" style={{ color: 'var(--text-tertiary)' }}>{item.label}</p>
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
                    <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{bucket.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-sm" style={{ background: 'var(--bg-inset)' }}>
                    <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: 'var(--neutral)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <SectionCard title="Linked shoppers across stores">
          {clusterRows.length === 0 ? (
            <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>No cross-store linked shoppers are visible for your account yet.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-muted)' }}>
              {clusterRows.map((cluster) => {
                const signals = Array.isArray(cluster.identity_signals_summary) ? cluster.identity_signals_summary : [];
                return (
                  <Link key={cluster.id} href={`/customers/${cluster.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3 hover:opacity-80">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <GitBranch className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                        <p className="truncate text-body-sm font-semibold" style={{ color: 'var(--text)' }}>
                          {privacySafeProfileLabel(cluster.id)}
                        </p>
                        <GradeBadge grade={gradeFromIdentityGrade(cluster.identity_confidence_grade)} size="sm" compact />
                        <PrivacyBadge value="Hashed" />
                      </div>
                      <NetworkFootprint
                        merchants={cluster.total_merchants_seen_at}
                        claims={cluster.total_refund_claims}
                        grade={gradeFromIdentityGrade(cluster.identity_confidence_grade)}
                        kSatisfied={cluster.total_merchants_seen_at >= 3}
                        variant="compact"
                        className="mt-2"
                      />
                      <p className="text-caption mt-1 truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {signals.length > 0 ? signals.slice(0, 4).map((signal) => signalCopy(signal).short).join(', ') : 'No signal summary stored'}
                      </p>
                    </div>
                    <span className="self-center inline-flex items-center gap-1 text-caption font-semibold" style={{ color: 'var(--text-primary)' }}>
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
              <Link key={run.id} href={`/audit/${run.id}`} className="block rounded-md border p-3 hover:bg-[var(--surface-hover)]" style={{ borderColor: 'var(--border-muted)' }}>
                <p className="truncate text-caption font-semibold" style={{ color: 'var(--text)' }}>{run.filename}</p>
                <p className="text-caption mt-1" style={{ color: 'var(--text-secondary)' }}>
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
