'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SectionCard } from '@/components/ui';
import { formatCurrencyCompact } from '@/components/charts/chartFormatters';
import { AnalyticsLineChart } from '@/components/analytics/AnalyticsLineChart';
import { AnalyticsDonutChart } from '@/components/analytics/AnalyticsDonutChart';
import { AnalyticsKpiCard } from '@/components/analytics/AnalyticsKpiCard';
import { AnalyticsGaugeCard } from '@/components/analytics/AnalyticsGaugeCard';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { ClaimOpsMetrics } from '@/lib/claims/reporting';
import type { ClaimRow, GradeBucketDisplay, RunSummary } from '@/app/(app)/reports/reportsPageTypes';
import { GRADE_SAMPLE_LIMIT } from '@/app/(app)/reports/reportsPageUtils';
import { ReportsSourceTag as SourceTag } from '@/app/(app)/reports/ReportsSourceTag';
import type { TrendDataPoint } from '@/components/charts/WeeklyTrendChart';

type LiveSetupCta = { title: string; body: string; label: string };

export type OverviewTabProps = {
  connectionState: ConnectionState;
  liveCta: LiveSetupCta | null;
  claims: ClaimRow[];
  claimMetrics: ClaimOpsMetrics;
  rows: RunSummary[];
  totalFlagged: number;
  matchRateTrend: TrendDataPoint[];
  gradeSampled: boolean;
  analysedRows: number;
  buckets: GradeBucketDisplay[];
  range: string;
};

export function OverviewTab({
  connectionState,
  liveCta,
  claims,
  claimMetrics,
  rows,
  totalFlagged,
  matchRateTrend,
  gradeSampled,
  analysedRows,
  buckets,
  range,
}: OverviewTabProps) {
  const gradeDonut = buckets.map((b) => ({ label: b.label, value: b.count, color: b.color }));
  const hasLiveClaims = claims.length > 0 || connectionState.helpdesk;
  const rangeLabel = range === 'all' ? 'all time' : `last ${range.replace('d', ' days')}`;
  const signalDensity = analysedRows > 0 ? (totalFlagged / analysedRows) * 100 : 0;
  const strongestBucket = buckets.reduce<GradeBucketDisplay | null>(
    (best, bucket) => (best === null || bucket.count > best.count ? bucket : best),
    null,
  );

  return (
    <div className="p-4 space-y-4">

      {/* ── 3-column top strip ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

        {/* Live sources */}
        <div
          className="rounded-lg border p-4"
          style={{
            background: connectionState.bothConnected
              ? 'color-mix(in srgb, var(--neutral) 5%, var(--surface))'
              : 'color-mix(in srgb, var(--warning) 5%, var(--surface))',
            borderColor: connectionState.bothConnected
              ? 'color-mix(in srgb, var(--neutral) 22%, var(--border))'
              : 'color-mix(in srgb, var(--warning) 22%, var(--border))',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="t-caption font-semibold" style={{ color: 'var(--text-primary)' }}>Live sources</span>
            <SourceTag source="live" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>Shopify</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: connectionState.shopify ? 'var(--neutral)' : 'var(--warning)' }}>
                {connectionState.shopify ? 'Connected' : 'Not set up'}
              </p>
            </div>
            <div>
              <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>Helpdesk</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: connectionState.helpdesk ? 'var(--neutral)' : 'var(--warning)' }}>
                {connectionState.helpdesk ? 'Connected' : 'Not set up'}
              </p>
            </div>
          </div>
          {liveCta && (
            <Link href="/settings/integrations" className="t-caption mt-3 inline-block font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              {liveCta.label} <ArrowRight className="inline h-3 w-3 align-[-2px]" aria-hidden="true" />
            </Link>
          )}
        </div>

        {/* Historical imports */}
        <div className="rounded-lg border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="t-caption font-semibold" style={{ color: 'var(--text-primary)' }}>Historical imports</span>
            <SourceTag source="csv" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>Files processed</p>
              <p className="num text-lg font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{rows.length.toLocaleString()}</p>
            </div>
            <div>
              <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>Records with signals</p>
              <p className="num text-lg font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{totalFlagged.toLocaleString()}</p>
            </div>
          </div>
          {analysedRows > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="t-caption" style={{ color: 'var(--text-tertiary)' }}>Signal density</span>
                <span className="t-caption font-semibold num" style={{ color: 'var(--text-secondary)' }}>
                  {((totalFlagged / analysedRows) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}>
                <div
                  style={{
                    width: `${Math.min((totalFlagged / analysedRows) * 100, 100)}%`,
                    background: 'var(--neutral)',
                    height: '100%',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <p className="t-caption mt-1" style={{ color: 'var(--text-tertiary)' }}>
                {totalFlagged.toLocaleString()} of {analysedRows.toLocaleString()} rows flagged
              </p>
            </div>
          )}
          {rows.length > 0 && (
            <Link href="?tab=csv" className="t-caption mt-3 inline-block font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              View all audits <ArrowRight className="inline h-3 w-3 align-[-2px]" aria-hidden="true" />
            </Link>
          )}
        </div>

        {/* Connected claim value */}
        <div className="rounded-lg border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="t-caption font-semibold" style={{ color: 'var(--text-primary)' }}>Connected claim summary</span>
            <SourceTag source="live" />
          </div>
          {hasLiveClaims ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>Claims</p>
                <p className="num text-lg font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{claimMetrics.totalClaims.toLocaleString()}</p>
              </div>
              <div>
                <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>Active claim value</p>
                <p className="num text-lg font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                  {claimMetrics.valueAtRisk ? formatCurrencyCompact(claimMetrics.valueAtRisk) : '—'}
                </p>
              </div>
            </div>
          ) : (
            <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
              Connect Shopify and a helpdesk to see live claim data.
            </p>
          )}
          {hasLiveClaims && (
            <Link href="?tab=integration" className="t-caption mt-3 inline-block font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              View live intelligence <ArrowRight className="inline h-3 w-3 align-[-2px]" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <AnalyticsGaugeCard
          label="Signal density"
          value={signalDensity}
          hint={analysedRows > 0 ? `${totalFlagged.toLocaleString()} of ${analysedRows.toLocaleString()} rows` : 'No analysed rows yet'}
          color="var(--lime)"
        />
        <AnalyticsGaugeCard
          label="Live source coverage"
          value={(connectionState.shopify ? 50 : 0) + (connectionState.helpdesk ? 50 : 0)}
          hint="Shopify + helpdesk connection health"
          color="var(--accent)"
        />
        <AnalyticsGaugeCard
          label="Top confidence bucket"
          value={strongestBucket?.pct ?? 0}
          hint={strongestBucket ? `${strongestBucket.label} · ${strongestBucket.count.toLocaleString()} rows` : 'No confidence sample yet'}
          color={strongestBucket?.color ?? 'var(--text-tertiary)'}
        />
      </div>

      {/* ── Two large charts ──────────────────────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Identity signal match rate"
          description="Signal rate per import run"
          actions={<SourceTag source="csv" />}
        >
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
            : analysedRows > 0 ? `${analysedRows.toLocaleString()} analysed rows` : 'No data yet'}
          actions={<SourceTag source="csv" />}
        >
          <AnalyticsDonutChart
            data={gradeDonut}
            height={240}
            gradePalette
            emptyLabel="No analysed rows yet"
          />
        </SectionCard>
      </div>

      {/* ── Compact claim strip ───────────────────────────────────────────── */}
      {hasLiveClaims && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AnalyticsKpiCard label="Total claims" value={claimMetrics.totalClaims} compact />
          <AnalyticsKpiCard label="Open claims" value={claimMetrics.openClaims} compact />
          <AnalyticsKpiCard label="Resolved" value={claimMetrics.resolvedClaims} compact />
          <AnalyticsKpiCard
            label="Evidence packages"
            value="—"
            hint={`${rangeLabel}`}
            compact
          />
        </div>
      )}
    </div>
  );
}
