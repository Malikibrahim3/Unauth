import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import { getExposureAtRisk } from '@/lib/supabase/merchantHelpers';
import { formatCurrencyNullable } from '@/lib/utils/format';
import { Button, MetricCard, SectionCard, WorkbenchPage } from '@/components/ui';

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

export default async function ReportsPage() {
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_DASHBOARD);
  if (denied) redirect(await resolveDefaultAppPath(serviceClient, user.id));

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

  return (
    <WorkbenchPage
      title="Reports"
      subtitle="Network signal performance and evidence readiness over time."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border p-0.5" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-input)' }}>
            {['7d', '30d', '90d'].map((range, index) => (
              <span
                key={range}
                className="t-label px-2.5 py-1"
                style={{
                  borderRadius: 3,
                  background: index === 1 ? 'var(--copper-dim)' : 'transparent',
                  color: index === 1 ? 'var(--copper-bright)' : 'var(--ink-tertiary)',
                }}
              >
                {range}
              </span>
            ))}
          </div>
          <Button variant="secondary" size="sm">Export report</Button>
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
