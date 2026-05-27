import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import { getExposureAtRisk } from '@/lib/supabase/merchantHelpers';
import { formatCurrencyNullable } from '@/lib/utils/format';
import { Button, MetricCard, SectionCard, WorkbenchPage } from '@/components/ui';
import { buildClaimOpsMetrics } from '@/lib/claims/reporting';

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
  definite: { label: 'A DEFINITE', color: 'var(--sev-definite)' },
  probable: { label: 'B PROBABLE', color: 'var(--sev-probable)' },
  possible: { label: 'C POSSIBLE', color: 'var(--sev-neutral)' },
  weak: { label: 'D WEAK', color: 'rgba(74,101,114,0.58)' },
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

export default async function ReportsPage({ searchParams }: { searchParams?: Promise<{ range?: string }> }) {
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_DASHBOARD);
  if (denied) redirect(await resolveDefaultAppPath(serviceClient, user.id));
  const resolvedSearchParams = (await searchParams) ?? {};
  const range = resolvedSearchParams.range === '7d' || resolvedSearchParams.range === '90d' || resolvedSearchParams.range === 'all'
    ? resolvedSearchParams.range
    : '30d';
  const cutoff = range === 'all'
    ? null
    : new Date(Date.now() - (range === '7d' ? 7 : range === '90d' ? 90 : 30) * 86400000).toISOString();

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
    .from('merchant_claims' as any)
    .select('id,status,amount_at_risk,submitted_at,created_at,updated_at')
    .eq('merchant_id', ctx.merchantId);
  if (cutoff) claimsQuery = claimsQuery.gte('submitted_at', cutoff);
  const { data: claimRows } = await claimsQuery;
  const claims = (claimRows ?? []) as Array<{ id: string; status: string; amount_at_risk: number | null; submitted_at?: string | null; created_at?: string | null; updated_at?: string | null }>;

  const { data: outcomeRows } = claims.length > 0
    ? await serviceClient
      .from('merchant_case_outcomes' as any)
      .select('claim_id,decision,outcome,amount_refunded,decided_at,created_at,updated_at')
      .in('claim_id', claims.map((claim) => claim.id))
    : { data: [] };
  const claimMetrics = buildClaimOpsMetrics(claims, outcomeRows ?? []);

  return (
    <WorkbenchPage
      title="Reports"
      subtitle="Network signal performance and evidence readiness over time."
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
          <a href={`/api/reports/claims?range=${range}`}><Button variant="secondary" size="sm">Export claims CSV</Button></a>
        </div>
      }
      kpiStrip={
        <div className="grid grid-cols-1 gap-3 border-b p-4 md:grid-cols-3" style={{ borderColor: 'var(--surface-border)' }}>
          <MetricCard label="Total flagged" value={totalFlagged.toLocaleString()} hint={`${totalRows.toLocaleString()} rows analysed`} />
          <MetricCard label="Match rate trend" value={`${matchRate.toFixed(1)}%`} hint={`Peak axis ${maxRate.toFixed(1)}%`} />
          <MetricCard label="Avg exposure" value={exposureAtRisk === null ? 'Unavailable' : formatCurrencyNullable(exposureAtRisk)} hint="Current review queue" />
        </div>
      }
      main={
        <div className="grid gap-4 p-4 xl:grid-cols-2">
          <SectionCard title="Claims Operations" description={`Claim metrics for ${range === 'all' ? 'all time' : `last ${range.replace('d', ' days')}`}`}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard label="Total claims" value={claimMetrics.totalClaims.toLocaleString()} density="compact" />
              <MetricCard label="Open claims" value={claimMetrics.openClaims.toLocaleString()} density="compact" />
              <MetricCard label="Under review / pending" value={claimMetrics.inReviewOrPendingClaims.toLocaleString()} density="compact" />
              <MetricCard label="Resolved" value={claimMetrics.resolvedClaims.toLocaleString()} density="compact" />
              <MetricCard label="Denied" value={claimMetrics.deniedClaims.toLocaleString()} density="compact" />
              <MetricCard label="Approved" value={claimMetrics.approvedClaims.toLocaleString()} density="compact" />
              <MetricCard label="Suspected outcomes" value={claimMetrics.suspectedFraudOutcomes.toLocaleString()} density="compact" />
              <MetricCard label="Legitimate outcomes" value={claimMetrics.legitimateOutcomes.toLocaleString()} density="compact" />
              <MetricCard label="Value at risk" value={formatCurrencyNullable(claimMetrics.valueAtRisk || null)} density="compact" />
              <MetricCard label="Refunded" value={formatCurrencyNullable(claimMetrics.amountRefunded || null)} density="compact" />
              <MetricCard label="Resolution rate" value={`${Math.round(claimMetrics.resolutionRate * 100)}%`} density="compact" />
              <MetricCard label="Overdue" value={claimMetrics.overdueClaims.toLocaleString()} density="compact" />
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
  );
}
