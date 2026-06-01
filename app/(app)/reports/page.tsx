import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import { getExposureAtRisk } from '@/lib/supabase/merchantHelpers';
import { formatCurrencyNullable } from '@/lib/utils/format';
import { MetricCard, SectionCard, WorkbenchPage } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { buildClaimOpsMetrics } from '@/lib/claims/reporting';
import ExportMenu from '@/components/reports/ExportMenu';
import { GRADE_COLOURS, GRADE_LABELS } from '@/lib/utils/confidenceStyles';

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

export default async function ReportsPage({ searchParams }: { searchParams?: Promise<{ range?: string }> }) {
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
      .select('id,created_at,total_rows,flagged_count')
      .eq('merchant_id', ctx.merchantId)
      .eq('hidden_by_merchant', false)
      .order('created_at', { ascending: false })
      .limit(12),
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

  return (
    <PageConnectionGate requires="both" connection={connectionState} pageName="Reports" pageDescription="Report metrics combine Shopify order data with helpdesk claim data. Without both connected, claim counts, dispute rates, and outcome summaries will be incomplete or zero." hasData={rows.length > 0}>
    <WorkbenchPage
      title="Reports"
      subtitle="Network signal performance and evidence readiness over time."
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="reports"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border p-0.5" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-input)' }}>
            {['7d', '30d', '90d', 'all'].map((option) => (
              <a
                key={option}
                href={`/reports?range=${option}`}
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
      kpiStrip={
        <div className="border-b p-4" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-overlay)' }}>
          <p className="text-body-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>Weekly ops summary</p>
          <p className="text-body-sm mt-2 max-w-3xl" style={{ color: 'var(--ink-secondary)' }}>
            {range === 'all' ? 'All time' : `Last ${range.replace('d', ' days')}`}: {claimMetrics.totalClaims.toLocaleString()} claims filed,{' '}
            {claimMetrics.openClaims.toLocaleString()} still open, {claimMetrics.overdueClaims.toLocaleString()} overdue SLA,{' '}
            {formatCurrencyNullable(claimMetrics.valueAtRisk || null)} open claim value with{' '}
            {formatCurrencyNullable(claimMetrics.amountRefunded || null)} refunded or recovered.
            Resolution rate is {Math.round(claimMetrics.resolutionRate * 100)}%.
          </p>
        </div>
      }
      main={
        <div className="grid gap-4 p-4 xl:grid-cols-2">
          <SectionCard title="Claims operations" description={`Claim metrics for ${range === 'all' ? 'all time' : `last ${range.replace('d', ' days')}`}`}>
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

          <SectionCard title="Audit signal performance" description={`${totalRows.toLocaleString()} rows analysed · ${matchRate.toFixed(1)}% match rate`}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 mb-4">
              <MetricCard label="Matched orders" value={totalFlagged.toLocaleString()} hint={`${totalRows.toLocaleString()} rows analysed`} density="compact" />
              <MetricCard label="Match rate" value={`${matchRate.toFixed(1)}%`} hint={`Peak axis ${maxRate.toFixed(1)}%`} density="compact" />
              <MetricCard label="Order value in queue" value={exposureAtRisk === null ? 'Unavailable' : formatCurrencyNullable(exposureAtRisk)} hint="Matched orders in review queue" density="compact" />
            </div>
          </SectionCard>

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
      }
    />
    </PageConnectionGate>
  );
}
