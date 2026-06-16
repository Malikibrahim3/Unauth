'use client';

import Link from 'next/link';
import { ArrowRight, FileSpreadsheet } from 'lucide-react';
import { SectionCard, Badge } from '@/components/ui';
import { formatDateMode } from '@/lib/utils/format';
import type { GradeBucketDisplay, RunSummary } from '@/app/(app)/reports/reportsPageTypes';
import { GRADE_SAMPLE_LIMIT } from '@/app/(app)/reports/reportsPageUtils';
import { ReportsSourceTag as SourceTag } from '@/app/(app)/reports/ReportsSourceTag';
import { AnalyticsLineChart } from '@/components/analytics/AnalyticsLineChart';
import { AnalyticsDonutChart } from '@/components/analytics/AnalyticsDonutChart';
import type { TrendDataPoint } from '@/components/charts/WeeklyTrendChart';

export type CsvTabProps = {
  rows: RunSummary[];
  totalRows: number;
  totalFlagged: number;
  matchRateTrend: TrendDataPoint[];
  gradeSampled: boolean;
  analysedRows: number;
  buckets: GradeBucketDisplay[];
};

export function CsvTab({
  rows,
  totalRows,
  totalFlagged,
  matchRateTrend,
  gradeSampled,
  analysedRows,
  buckets,
}: CsvTabProps) {
  const gradeDonut = buckets.map((b) => ({ label: b.label, value: b.count, color: b.color }));

  return (
    <div className="p-4 space-y-4">
      <div
        className="rounded border px-4 py-2.5 flex items-center gap-2"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <FileSpreadsheet className="h-4 w-4 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        <p className="t-caption" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Historical import.</span>{' '}
          These reports come from uploaded CSV files — backfill only, not live monitoring. For ongoing coverage, connect Shopify and your helpdesk under{' '}
          <Link href="/settings/integrations" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Live intelligence</Link>.
        </p>
      </div>

      <SectionCard
        title="CSV audit history"
        description={`${rows.length} files · ${totalRows.toLocaleString()} rows · ${totalFlagged.toLocaleString()} records with signals`}
        actions={<SourceTag source="csv" />}
      >
        {rows.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>No CSV audit history.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {rows.map((run) => {
              const flagRate = run.total_rows > 0 ? ((run.flagged_count ?? 0) / run.total_rows) * 100 : 0;
              return (
                <div key={run.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm truncate font-medium" style={{ color: 'var(--text-primary)' }}>{run.filename ?? run.id}</p>
                    <p className="t-caption font-mono mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {run.total_rows.toLocaleString()} rows · {(run.flagged_count ?? 0).toLocaleString()} with signals ({flagRate.toFixed(1)}%) · {formatDateMode(run.created_at, 'recent')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className="t-caption font-medium px-1.5 py-0.5 rounded"
                      style={{
                        background: run.status === 'completed' ? 'color-mix(in srgb, var(--neutral) 15%, transparent)' : 'var(--surface)',
                        color: run.status === 'completed' ? 'var(--neutral)' : 'var(--text-tertiary)',
                      }}
                    >
                      {run.status ?? 'unknown'}
                    </span>
                    <Link href={`/audit/${run.id}`} className="inline-flex items-center gap-1 t-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                      Open <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Identity signal match rate" description="Signal rate per import run" actions={<SourceTag source="csv" />}>
          <AnalyticsLineChart
            data={matchRateTrend}
            height={220}
            valueFormatter={(n) => `${n.toFixed(1)}%`}
            seriesName="Signal rate"
            emptyLabel="No import runs yet"
          />
        </SectionCard>

        <SectionCard
          title="Signal confidence by grade"
          description={gradeSampled
            ? `Sampled · ${GRADE_SAMPLE_LIMIT.toLocaleString()} rows`
            : analysedRows > 0 ? `${analysedRows.toLocaleString()} rows` : 'No data yet'}
          actions={gradeSampled ? <Badge tone="warning" size="sm">Sampled</Badge> : <SourceTag source="csv" />}
        >
          <AnalyticsDonutChart
            data={gradeDonut}
            height={240}
            gradePalette
            emptyLabel="No analysed rows yet"
          />
          {gradeSampled && (
            <p className="mt-2 t-caption font-medium" style={{ color: 'var(--warning)' }}>
              Percentages reflect a {GRADE_SAMPLE_LIMIT.toLocaleString()}-row sample — indicative, not exact.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
