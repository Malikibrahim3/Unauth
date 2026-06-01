import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import { getExposureAtRisk } from '@/lib/supabase/merchantHelpers';
import { formatCurrencyNullable, formatDateMode } from '@/lib/utils/format';
import { MetricCard, SectionCard, WorkbenchPage } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { buildClaimOpsMetrics } from '@/lib/claims/reporting';
import ExportMenu from '@/components/reports/ExportMenu';
import { GRADE_COLOURS, GRADE_LABELS } from '@/lib/utils/confidenceStyles';
import Link from 'next/link';

type ClaimRow = {
  id: string;
  status: string;
  amount_at_risk: number | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type RunSummary = {
  id: string;
  created_at: string;
  total_rows: number;
  flagged_count: number | null;
  filename?: string | null;
  status?: string | null;
};

type GradeBucket = 'definite' | 'probable' | 'possible' | 'weak';

type TxGradeRow = {
  identity_confidence_grade: string | null;
  match_status: string | null;
};

const GRADE_META: Record<GradeBucket, { label: string; color: string }> = {
  definite: { label: `A · ${GRADE_LABELS.definite}`, color: GRADE_COLOURS.definite },
  probable: { label: `B · ${GRADE_LABELS.probable}`, color: GRADE_COLOURS.probable },
  possible: { label: `C · ${GRADE_LABELS.possible}`, color: GRADE_COLOURS.possible },
  weak: { label: `D · ${GRADE_LABELS.weak}`, color: GRADE_COLOURS.weak },
};

function gradeFromTransaction(row: TxGradeRow): GradeBucket {
  const grade = row.identity_confidence_grade?.toLowerCase();
  if (grade === 'definite' || grade === 'probable' || grade === 'possible' || grade === 'weak') return grade;
  const status = row.match_status?.toLowerCase();
  if (status === 'definite') return 'definite';
  if (status === 'probable') return 'probable';
  if (status === 'candidate' || status === 'possible') return 'possible';
  return 'weak';
}

function buildRatePoints(trend: RunSummary[]) {
  const rates = trend.map((row) => (row.total_rows > 0 ? ((row.flagged_count ?? 0) / row.total_rows) * 100 : 0));
  const maxRate = Math.max(4, ...rates);
  if (rates.length === 0) return { points: [] as Array<{ x: number; y: number; rate: number }>, maxRate };
  if (rates.length === 1) {
    const y = 190 - (rates[0] / maxRate) * 150;
    return { points: [{ x: 48, y, rate: rates[0] }, { x: 472, y, rate: rates[0] }], maxRate };
  }
  return {
    points: rates.map((rate, index) => ({
      x: 34 + (index / (rates.length - 1)) * 452,
      y: 190 - (rate / maxRate) * 150,
      rate,
    })),
    maxRate,
  };
}

function delta(current: number, prior: number | null | undefined): string | null {
  if (prior == null) return null;
  if (prior === 0) return current > 0 ? 'new vs prior period' : null;
  const pct = Math.round(((current - prior) / prior) * 100);
  if (pct === 0) return null;
  return pct > 0 ? `↑ ${pct}%` : `↓ ${Math.abs(pct)}%`;
}

function deltaCurrency(current: number, prior: number | null | undefined): string | null {
  if (prior == null) return null;
  if (prior === 0) return current > 0 ? 'new exposure vs prior period' : null;
  const diff = Math.round(current - prior);
  if (diff === 0) return null;
  const amount = formatCurrencyNullable(Math.abs(diff));
  return diff > 0 ? `+${amount} vs prior` : `−${amount} vs prior`;
}

function metricHint(base: string, current: number, priorMetrics: ReturnType<typeof buildClaimOpsMetrics> | null, priorKey: keyof ReturnType<typeof buildClaimOpsMetrics>) {
  const change = priorMetrics ? delta(current, priorMetrics[priorKey] as number) : null;
  return [base, change].filter(Boolean).join(' · ') || base;
}

function metricHintCurrency(
  base: string,
  current: number,
  priorMetrics: ReturnType<typeof buildClaimOpsMetrics> | null,
) {
  const change = priorMetrics ? deltaCurrency(current, priorMetrics.valueAtRisk) : null;
  return [base, change].filter(Boolean).join(' · ') || base;
}

const TABS = ['overview', 'csv', 'integration'] as const;
type Tab = typeof TABS[number];

function TabBar({ active, range }: { active: Tab; range: string }) {
  const labels: Record<Tab, string> = {
    overview: 'Overview',
    csv: 'CSV audits',
    integration: 'Live reports',
  };
  return (
    <div
      className="flex gap-0.5 border-b px-4"
      style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-overlay)' }}
    >
      {TABS.map((tab) => (
        <Link
          key={tab}
          href={`/reports?tab=${tab}&range=${range}`}
          className="px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
          style={{
            borderColor: active === tab ? 'var(--copper-bright)' : 'transparent',
            color: active === tab ? 'var(--ink-primary)' : 'var(--ink-tertiary)',
          }}
        >
          {labels[tab]}
        </Link>
      ))}
    </div>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams?: Promise<{ range?: string; tab?: string }> }) {
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_DASHBOARD);
  if (denied) redirect(await resolveDefaultAppPath(serviceClient, user.id));

  const connectionState = await getConnectionState(serviceClient, ctx.merchantId);

  const resolvedSearchParams = (await searchParams) ?? {};
  const range = resolvedSearchParams.range === '7d' || resolvedSearchParams.range === '90d' || resolvedSearchParams.range === 'all'
    ? resolvedSearchParams.range
    : '30d';
  const rawTab = resolvedSearchParams.tab;
  const activeTab: Tab = rawTab === 'csv' || rawTab === 'integration' ? rawTab : 'overview';

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
  const matchRate = totalRows > 0 ? (totalFlagged / totalRows) * 100 : 0;
  const trend = rows.slice(0, 7).reverse();
  const { points, maxRate } = buildRatePoints(trend);
  const linePath = points.length > 0
    ? points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
    : '';
  const areaPath = points.length > 0
    ? `${linePath} L${points[points.length - 1].x.toFixed(1)} 198 L${points[0].x.toFixed(1)} 198 Z`
    : '';
  const gradeTotal = Math.max(1, Object.values(gradeCounts).reduce((sum, count) => sum + count, 0));
  const buckets = (Object.keys(GRADE_META) as GradeBucket[]).map((key) => ({
    key,
    ...GRADE_META[key],
    count: gradeCounts[key],
    pct: (gradeCounts[key] / gradeTotal) * 100,
  }));

  let claimsQuery = serviceClient
    .from('merchant_claims' as never)
    .select('id,status,amount_at_risk,submitted_at,created_at,updated_at')
    .eq('merchant_id', ctx.merchantId);
  if (cutoff) claimsQuery = claimsQuery.gte('submitted_at', cutoff);

  let priorClaimsQuery = serviceClient
    .from('merchant_claims' as never)
    .select('id,status,amount_at_risk,submitted_at,created_at,updated_at')
    .eq('merchant_id', ctx.merchantId);
  if (priorCutoff) priorClaimsQuery = priorClaimsQuery.gte('submitted_at', priorCutoff);
  if (priorEnd) priorClaimsQuery = priorClaimsQuery.lte('submitted_at', priorEnd);

  const [{ data: claimRows }, priorClaimResult] = await Promise.all([
    claimsQuery,
    range === 'all' ? Promise.resolve({ data: [] as ClaimRow[] | null }) : priorClaimsQuery,
  ]);
  const claims = (claimRows ?? []) as ClaimRow[];
  const priorClaims = (priorClaimResult.data ?? []) as ClaimRow[];

  const [outcomeResult, priorOutcomeResult] = await Promise.all([
    claims.length > 0
      ? serviceClient
        .from('merchant_case_outcomes' as never)
        .select('claim_id,decision,outcome,amount_refunded,decided_at,created_at,updated_at')
        .in('claim_id', claims.map((claim) => claim.id))
      : Promise.resolve({ data: [] }),
    priorClaims.length > 0
      ? serviceClient
        .from('merchant_case_outcomes' as never)
        .select('claim_id,decision,outcome,amount_refunded,decided_at,created_at,updated_at')
        .in('claim_id', priorClaims.map((c) => c.id))
      : Promise.resolve({ data: [] }),
  ]);

  const claimMetrics = buildClaimOpsMetrics(claims, outcomeResult.data ?? []);
  const priorMetrics = range === 'all'
    ? null
    : buildClaimOpsMetrics(priorClaims, priorOutcomeResult.data ?? []);

  const hasAnyData = rows.length > 0 || claims.length > 0;

  // ── Tab content ──────────────────────────────────────────────────────────

  const OverviewTab = (
    <div className="p-4 space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="Total reports"
          value={(rows.length + (claims.length > 0 ? 1 : 0)).toLocaleString()}
          hint="CSV audits + integration data"
          density="compact"
        />
        <MetricCard
          label="CSV audits"
          value={rows.length.toLocaleString()}
          hint="From uploaded files"
          density="compact"
        />
        <MetricCard
          label="Live reports"
          value={claims.length > 0 ? '1 active' : '—'}
          hint="From Shopify + helpdesk"
          density="compact"
        />
        <MetricCard
          label="Latest generated"
          value={rows[0] ? formatDateMode(rows[0].created_at, 'recent') : claims[0]?.submitted_at ? formatDateMode(claims[0].submitted_at, 'recent') : '—'}
          hint="Most recent report"
          density="compact"
        />
      </div>

      {/* Two recent lists */}
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Recent CSV audits" description="Uploaded files processed for fraud signals">
          {rows.length === 0 ? (
            <p className="t-caption py-4" style={{ color: 'var(--ink-tertiary)' }}>No CSV audits yet. <Link href="/upload" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Upload a file →</Link></p>
          ) : (
            <div className="space-y-2">
              {rows.slice(0, 5).map((run) => (
                <Link
                  key={run.id}
                  href={`/audit/${run.id}`}
                  className="flex items-center justify-between gap-3 rounded border px-3 py-2 hover-bg-subtle"
                  style={{ borderColor: 'var(--surface-border)' }}
                >
                  <div className="min-w-0">
                    <p className="t-body-sm truncate font-medium" style={{ color: 'var(--ink-primary)' }}>{run.filename ?? run.id}</p>
                    <p className="t-caption font-mono" style={{ color: 'var(--ink-tertiary)' }}>
                      {(run.flagged_count ?? 0).toLocaleString()} flagged of {run.total_rows.toLocaleString()} rows · {formatDateMode(run.created_at, 'recent')}
                    </p>
                  </div>
                  <span className="t-caption shrink-0 font-semibold" style={{ color: 'var(--accent)' }}>Open →</span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent live reports" description="Data from connected Shopify + helpdesk">
          {!connectionState.bothConnected && claims.length === 0 ? (
            <div className="py-4 space-y-2">
              <p className="t-caption" style={{ color: 'var(--ink-tertiary)' }}>
                Connect Shopify and your helpdesk to generate live reports.
              </p>
              <Link href="/settings/integrations" className="t-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Complete setup →</Link>
            </div>
          ) : claims.length === 0 ? (
            <p className="t-caption py-4" style={{ color: 'var(--ink-tertiary)' }}>No integration data in this period.</p>
          ) : (
            <div className="space-y-2">
              <div className="rounded border px-3 py-2" style={{ borderColor: 'var(--surface-border)' }}>
                <p className="t-body-sm font-medium" style={{ color: 'var(--ink-primary)' }}>Helpdesk claims — {range === 'all' ? 'all time' : `last ${range.replace('d', ' days')}`}</p>
                <p className="t-caption font-mono" style={{ color: 'var(--ink-tertiary)' }}>
                  {claimMetrics.totalClaims.toLocaleString()} claims · {claimMetrics.openClaims.toLocaleString()} open · {formatCurrencyNullable(claimMetrics.valueAtRisk || null)} at risk
                </p>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );

  const CsvTab = (
    <div className="p-4 space-y-4">
      <SectionCard title="CSV audit history" description={`${rows.length} files processed · ${totalRows.toLocaleString()} total rows · ${totalFlagged.toLocaleString()} flagged`}>
        {rows.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <p className="t-body-sm" style={{ color: 'var(--ink-secondary)' }}>No CSV audits yet.</p>
            <Link href="/upload" className="t-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Upload a file to start →</Link>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--surface-border)' }}>
            {rows.map((run) => {
              const flagRate = run.total_rows > 0 ? ((run.flagged_count ?? 0) / run.total_rows) * 100 : 0;
              return (
                <div key={run.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="t-body-sm truncate font-medium" style={{ color: 'var(--ink-primary)' }}>{run.filename ?? run.id}</p>
                    <p className="t-caption font-mono mt-0.5" style={{ color: 'var(--ink-tertiary)' }}>
                      {run.total_rows.toLocaleString()} rows · {(run.flagged_count ?? 0).toLocaleString()} flagged ({flagRate.toFixed(1)}%) · {formatDateMode(run.created_at, 'recent')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className="t-caption font-medium px-1.5 py-0.5 rounded"
                      style={{
                        background: run.status === 'completed' ? 'color-mix(in srgb, var(--sev-clear) 15%, transparent)' : 'var(--surface-overlay)',
                        color: run.status === 'completed' ? 'var(--sev-clear)' : 'var(--ink-tertiary)',
                      }}
                    >
                      {run.status ?? 'unknown'}
                    </span>
                    <Link href={`/audit/${run.id}`} className="t-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Open →</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Match rate over time">
          <svg className="h-56 w-full" viewBox="0 0 520 220" preserveAspectRatio="none" role="img" aria-label="Match rate over time">
            {[40, 90, 140, 190].map((y) => (
              <line key={y} x1="22" x2="498" y1={y} y2={y} stroke="var(--surface-border)" strokeOpacity="0.7" vectorEffect="non-scaling-stroke" />
            ))}
            {areaPath && <path d={areaPath} fill="var(--copper-glow)" />}
            {linePath && <path d={linePath} fill="none" stroke="var(--copper-bright)" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" vectorEffect="non-scaling-stroke" />}
            {points.slice(points.length > 1 ? -1 : 0).map((point, index) => (
              <g key={`${point.x}-${index}`}>
                <circle cx={point.x} cy={point.y} r="5" fill="var(--copper-bright)" />
                <text x={Math.min(460, point.x + 12)} y={Math.max(20, point.y - 10)} className="t-label" fill="var(--ink-tertiary)">
                  {point.rate.toFixed(1)}%
                </text>
              </g>
            ))}
            {points.length === 0 && (
              <text x="260" y="112" textAnchor="middle" className="t-label" fill="var(--ink-tertiary)">AWAITING AUDIT DATA</text>
            )}
          </svg>
        </SectionCard>

        <SectionCard title="Flag distribution by grade">
          <div className="flex h-56 flex-col justify-between gap-5">
            <div>
              <div className="flex h-5 overflow-hidden rounded-[3px] border" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}>
                {buckets.map((bucket) => (
                  <div
                    key={bucket.key}
                    style={{
                      width: `${Math.max(bucket.count > 0 ? 4 : 0, bucket.pct)}%`,
                      background: bucket.color,
                    }}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {buckets.map((bucket) => (
                  <div key={bucket.key} className="rounded-sm border px-3 py-2" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-overlay)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="t-label" style={{ color: bucket.color }}>{bucket.label}</span>
                      <span className="t-mono-md num" style={{ color: 'var(--ink-primary)' }}>{bucket.count.toLocaleString()}</span>
                    </div>
                    <div className="mt-2 h-1 rounded-full" style={{ background: 'var(--surface-muted)' }}>
                      <div className="h-1 rounded-full" style={{ width: `${bucket.pct}%`, background: bucket.color }} />
                    </div>
                    <p className="t-caption mt-1" style={{ color: 'var(--ink-tertiary)' }}>{bucket.pct.toFixed(1)}% of analysed rows</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t pt-3" style={{ borderColor: 'var(--surface-border)' }}>
              <p className="t-caption" style={{ color: 'var(--ink-tertiary)' }}>
                Distribution is derived from merchant-owned audit transactions only; cross-merchant identifiers remain aggregate.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );

  const LiveTab = (
    <div className="p-4 space-y-4">
      {!connectionState.bothConnected && claims.length === 0 && (
        <div
          className="rounded border px-4 py-3 flex items-center justify-between gap-4"
          style={{
            background: 'color-mix(in srgb, var(--warning, #b45309) 8%, var(--surface-raised))',
            borderColor: 'color-mix(in srgb, var(--warning, #b45309) 20%, transparent)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: 'var(--warning, #b45309)' }} />
            <p className="t-body-sm" style={{ color: 'var(--ink-primary)' }}>
              Connect Shopify and your helpdesk to generate live reports.
              {' '}Shopify provides order data; your helpdesk provides claim history. One without the other is incomplete.
            </p>
          </div>
          <Link href="/settings/integrations" className="t-caption shrink-0 font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Complete setup →</Link>
        </div>
      )}

      <SectionCard title="Live report — claims operations" description={`Claim metrics for ${range === 'all' ? 'all time' : `last ${range.replace('d', ' days')}`} · source: Shopify + helpdesk`}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Total claims" value={claimMetrics.totalClaims.toLocaleString()} density="compact" hint={metricHint('Filed in range', claimMetrics.totalClaims, priorMetrics, 'totalClaims')} />
          <MetricCard label="Open claims" value={claimMetrics.openClaims.toLocaleString()} density="compact" hint={metricHint('Needs action', claimMetrics.openClaims, priorMetrics, 'openClaims')} />
          <MetricCard label="Under review / pending" value={claimMetrics.inReviewOrPendingClaims.toLocaleString()} density="compact" hint="In progress" />
          <MetricCard label="Resolved" value={claimMetrics.resolvedClaims.toLocaleString()} density="compact" hint={metricHint('Closed outcomes', claimMetrics.resolvedClaims, priorMetrics, 'resolvedClaims')} />
          <MetricCard label="Denied" value={claimMetrics.deniedClaims.toLocaleString()} density="compact" hint="Latest decisions" />
          <MetricCard label="Approved" value={claimMetrics.approvedClaims.toLocaleString()} density="compact" hint="Latest decisions" />
          <MetricCard label="Open claim value" value={formatCurrencyNullable(claimMetrics.valueAtRisk || null)} density="compact" hint={metricHintCurrency('Unresolved claim value', claimMetrics.valueAtRisk, priorMetrics)} />
          <MetricCard label="Recovered / refunded" value={formatCurrencyNullable(claimMetrics.amountRefunded || null)} density="compact" hint="Outcome totals" />
          <MetricCard
            label="Resolution rate"
            value={`${Math.round(claimMetrics.resolutionRate * 100)}%`}
            density="compact"
            hint={[
              'Resolved / total',
              priorMetrics ? delta(Math.round(claimMetrics.resolutionRate * 100), Math.round(priorMetrics.resolutionRate * 100)) : null,
            ].filter(Boolean).join(' · ') || 'Resolved / total'}
          />
          <MetricCard label="Overdue" value={claimMetrics.overdueClaims.toLocaleString()} density="compact" hint={metricHint('>72h open', claimMetrics.overdueClaims, priorMetrics, 'overdueClaims')} />
        </div>
        {priorMetrics && (
          <p className="mt-3 t-caption" style={{ color: 'var(--ink-tertiary)' }}>
            Δ vs previous {range.replace('d', '-day')} period
          </p>
        )}
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Resolution funnel" description="Claim volume by current status">
          <div className="space-y-3">
            {[
              { label: 'Open', value: claimMetrics.openClaims, color: 'var(--ink-tertiary)' },
              { label: 'In review / pending', value: claimMetrics.inReviewOrPendingClaims, color: 'var(--sev-probable)' },
              { label: 'Resolved', value: claimMetrics.resolvedClaims, color: 'var(--sev-clear)' },
              { label: 'Overdue SLA', value: claimMetrics.overdueClaims, color: 'var(--sev-definite)' },
            ].map((step) => {
              const pct = claimMetrics.totalClaims > 0 ? (step.value / claimMetrics.totalClaims) * 100 : 0;
              return (
                <div key={step.label}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="t-label" style={{ color: 'var(--ink-secondary)' }}>{step.label}</span>
                    <span className="t-mono-md num" style={{ color: 'var(--ink-primary)' }}>{step.value.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'var(--surface-muted)' }}>
                    <div className="h-2 rounded-full" style={{ width: `${Math.max(step.value > 0 ? 4 : 0, pct)}%`, background: step.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Loss vs recovery" description="Financial impact for selected date range">
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Open claim value"
              value={formatCurrencyNullable(claimMetrics.valueAtRisk || null)}
              hint="Unresolved claim value"
            />
            <MetricCard
              label="Recovered / refunded"
              value={formatCurrencyNullable(claimMetrics.amountRefunded || null)}
              hint="Recorded in outcomes"
            />
          </div>
          <p className="t-caption mt-3" style={{ color: 'var(--ink-tertiary)' }}>
            Net claim value (open minus recovered): {formatCurrencyNullable(Math.max(0, claimMetrics.valueAtRisk - claimMetrics.amountRefunded) || null)}
          </p>
        </SectionCard>
      </div>

      <SectionCard title="Order value in review queue" description="Matched orders with open claim exposure">
        <MetricCard
          label="Order value linked"
          value={exposureAtRisk === null ? 'Unavailable' : formatCurrencyNullable(exposureAtRisk)}
          hint="Matched orders in review queue · source: Shopify"
        />
      </SectionCard>
    </div>
  );

  const tabContent = activeTab === 'csv' ? CsvTab : activeTab === 'integration' ? LiveTab : OverviewTab;

  return (
    <PageConnectionGate requires="both" connection={connectionState} pageName="Reports" pageDescription="Report metrics combine Shopify order data with helpdesk claim data. Without both connected, claim counts, dispute rates, and outcome summaries will be incomplete or zero." hasData={hasAnyData}>
    <WorkbenchPage
      title="Reports"
      subtitle="Audit signal performance and claim operations over time."
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="reports"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border p-0.5" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-input)' }}>
            {['7d', '30d', '90d', 'all'].map((option) => (
              <a
                key={option}
                href={`/reports?tab=${activeTab}&range=${option}`}
                className="t-label px-2.5 py-1"
                style={{
                  borderRadius: 3,
                  background: range === option ? 'var(--copper-dim)' : 'transparent',
                  color: range === option ? 'var(--copper-bright)' : 'var(--ink-tertiary)',
                }}
              >
                {option}
              </a>
            ))}
          </div>
          <ExportMenu range={range} />
        </div>
      }
      kpiStrip={<TabBar active={activeTab} range={range} />}
      main={tabContent}
    />
    </PageConnectionGate>
  );
}
