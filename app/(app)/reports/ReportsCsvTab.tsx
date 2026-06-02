import Link from 'next/link';
import { FileSpreadsheet } from 'lucide-react';
import { MetricCard, SectionCard, Badge } from '@/components/ui';
import { formatDateMode } from '@/lib/utils/format';
import type { GradeBucketDisplay, RatePoint, RunSummary } from '@/app/(app)/reports/reportsPageTypes';
import { GRADE_SAMPLE_LIMIT } from '@/app/(app)/reports/reportsPageUtils';
import { ReportsSourceTag as SourceTag } from '@/app/(app)/reports/ReportsSourceTag';

export type CsvTabProps = {
  rows: RunSummary[];
  totalRows: number;
  totalFlagged: number;
  points: RatePoint[];
  linePath: string;
  areaPath: string;
  gradeSampled: boolean;
  analysedRows: number;
  buckets: GradeBucketDisplay[];
};

export function CsvTab({
  rows,
  totalRows,
  totalFlagged,
  points,
  linePath,
  areaPath,
  gradeSampled,
  analysedRows,
  buckets,
}: CsvTabProps) {
  return (
    <div className="p-4 space-y-4">
      <div
        className="rounded border px-4 py-2.5 flex items-center gap-2"
        style={{ background: 'var(--surface-overlay)', borderColor: 'var(--surface-border)' }}
      >
        <FileSpreadsheet className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-tertiary)' }} />
        <p className="t-caption" style={{ color: 'var(--ink-secondary)' }}>
          <span className="font-semibold" style={{ color: 'var(--ink-primary)' }}>Historical import.</span>{' '}
          These reports come from uploaded CSV files - backfill, not live monitoring. For ongoing coverage, connect Shopify and your helpdesk under{' '}
          <Link href="/settings/integrations" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Live reports</Link>.
        </p>
      </div>

      <SectionCard
        title="CSV audit history"
        description={`${rows.length} files processed · ${totalRows.toLocaleString()} total rows · ${totalFlagged.toLocaleString()} flagged`}
        actions={<SourceTag source="csv" />}
      >
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

        <SectionCard
          title="Flag distribution by grade"
          description={gradeSampled
            ? `Sampled from the most recent ${GRADE_SAMPLE_LIMIT.toLocaleString()} analysed rows`
            : `Across ${analysedRows.toLocaleString()} analysed rows`}
          actions={gradeSampled ? <Badge tone="warning" size="sm">Sampled</Badge> : <SourceTag source="csv" />}
        >
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
                    <p className="t-caption mt-1" style={{ color: 'var(--ink-tertiary)' }}>{bucket.pct.toFixed(1)}% of {gradeSampled ? 'sample' : 'analysed rows'}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t pt-3 space-y-1" style={{ borderColor: 'var(--surface-border)' }}>
              {gradeSampled && (
                <p className="t-caption font-medium" style={{ color: 'var(--warning)' }}>
                  Percentages reflect a {GRADE_SAMPLE_LIMIT.toLocaleString()}-row sample, not every audited row - treat as indicative, not exact.
                </p>
              )}
              <p className="t-caption" style={{ color: 'var(--ink-tertiary)' }}>
                Distribution is derived from merchant-owned audit transactions only; cross-merchant identifiers remain aggregate.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
