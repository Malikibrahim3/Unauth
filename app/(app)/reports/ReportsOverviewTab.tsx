import Link from 'next/link';
import { Headphones, ShoppingBag, FileSpreadsheet } from 'lucide-react';
import { MetricCard, SectionCard, Badge } from '@/components/ui';
import { formatCurrencyNullable, formatDateMode } from '@/lib/utils/format';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { ClaimOpsMetrics } from '@/lib/claims/reporting';
import type { ClaimRow, GradeBucketDisplay, RatePoint, RunSummary } from '@/app/(app)/reports/reportsPageTypes';
import {
  GRADE_SAMPLE_LIMIT,
  delta,
  metricHint,
  metricHintCurrency,
} from '@/app/(app)/reports/reportsPageUtils';
import { ReportsSourceTag as SourceTag } from '@/app/(app)/reports/ReportsSourceTag';

type LiveSetupCta = { title: string; body: string; label: string };

export type OverviewTabProps = {
  connectionState: ConnectionState;
  liveCta: LiveSetupCta | null;
  claims: ClaimRow[];
  claimMetrics: ClaimOpsMetrics;
  rows: RunSummary[];
  totalFlagged: number;
  points: RatePoint[];
  linePath: string;
  areaPath: string;
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
  points,
  linePath,
  areaPath,
  gradeSampled,
  analysedRows,
  buckets,
  range,
}: OverviewTabProps) {
  return (
    <div className="p-4 space-y-5">

      {/* ── Source health bands - always first ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Live sources */}
        <div
          className="rounded-lg border p-4"
          style={{
            background: connectionState.bothConnected
              ? 'color-mix(in srgb, var(--sev-clear) 6%, var(--surface-raised))'
              : 'color-mix(in srgb, var(--warning) 6%, var(--surface-raised))',
            borderColor: connectionState.bothConnected
              ? 'color-mix(in srgb, var(--sev-clear) 25%, var(--surface-border))'
              : 'color-mix(in srgb, var(--warning) 25%, var(--surface-border))',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="t-body-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>Live sources</p>
            <SourceTag source="live" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="t-caption" style={{ color: 'var(--ink-tertiary)' }}>Shopify</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: connectionState.shopify ? 'var(--sev-clear)' : 'var(--warning)' }}>
                {connectionState.shopify ? 'Connected' : 'Not connected'}
              </p>
            </div>
            <div>
              <p className="t-caption" style={{ color: 'var(--ink-tertiary)' }}>Helpdesk</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: connectionState.helpdesk ? 'var(--sev-clear)' : 'var(--warning)' }}>
                {connectionState.helpdesk ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          {claims.length > 0 && (
            <p className="t-caption mt-3" style={{ color: 'var(--ink-secondary)' }}>
              {claimMetrics.totalClaims.toLocaleString()} claims · {claimMetrics.openClaims.toLocaleString()} open · {formatCurrencyNullable(claimMetrics.valueAtRisk || null)} at risk
            </p>
          )}
          {liveCta && (
            <Link href="/settings/integrations" className="t-caption mt-2 inline-block font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              {liveCta.label} →
            </Link>
          )}
        </div>

        {/* Historical import */}
        <div
          className="rounded-lg border p-4"
          style={{ background: 'var(--surface-raised)', borderColor: 'var(--surface-border)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="t-body-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>Historical imports</p>
            <SourceTag source="csv" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="t-caption" style={{ color: 'var(--ink-tertiary)' }}>Files processed</p>
              <p className="num text-lg font-semibold mt-0.5" style={{ color: 'var(--ink-primary)' }}>{rows.length.toLocaleString()}</p>
            </div>
            <div>
              <p className="t-caption" style={{ color: 'var(--ink-tertiary)' }}>Rows flagged</p>
              <p className="num text-lg font-semibold mt-0.5" style={{ color: 'var(--ink-primary)' }}>{totalFlagged.toLocaleString()}</p>
            </div>
          </div>
          {rows.length > 0 && (
            <Link href="?tab=csv" className="t-caption mt-2 inline-block font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              View all audits →
            </Link>
          )}
        </div>
      </div>

      {/* ── Match rate trend + grade distribution ────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Match rate over time" actions={<SourceTag source="csv" />}>
          <svg className="h-44 w-full" viewBox="0 0 520 200" preserveAspectRatio="none" role="img" aria-label="Match rate over time">
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
            ? `Sampled from ${GRADE_SAMPLE_LIMIT.toLocaleString()} rows`
            : `Across ${analysedRows.toLocaleString()} rows`}
          actions={<SourceTag source="csv" />}
        >
          <div className="space-y-3">
            <div className="flex h-5 overflow-hidden rounded-[3px] border" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)' }}>
              {buckets.map((bucket) => (
                <div key={bucket.key} style={{ width: `${Math.max(bucket.count > 0 ? 4 : 0, bucket.pct)}%`, background: bucket.color }} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {buckets.map((bucket) => (
                <div key={bucket.key} className="rounded-sm border px-3 py-2" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-overlay)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="t-label" style={{ color: bucket.color }}>{bucket.label}</span>
                    <span className="t-mono-md num" style={{ color: 'var(--ink-primary)' }}>{bucket.count.toLocaleString()}</span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full" style={{ background: 'var(--surface-muted)' }}>
                    <div className="h-1 rounded-full" style={{ width: `${bucket.pct}%`, background: bucket.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ── Live claims summary ───────────────────────────────────────────── */}
      {(claims.length > 0 || connectionState.helpdesk) && (
        <SectionCard
          title="Live claims summary"
          description={`From your helpdesk · ${range === 'all' ? 'all time' : `last ${range.replace('d', ' days')}`}`}
          actions={<SourceTag source="live" />}
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Total claims" value={claimMetrics.totalClaims.toLocaleString()} density="compact" hint="Filed in range" />
            <MetricCard label="Open" value={claimMetrics.openClaims.toLocaleString()} density="compact" hint="Needs action" />
            <MetricCard label="Resolved" value={claimMetrics.resolvedClaims.toLocaleString()} density="compact" hint="Closed" />
            <MetricCard label="Open value" value={formatCurrencyNullable(claimMetrics.valueAtRisk || null)} density="compact" hint="At risk" />
          </div>
          <div className="mt-3">
            <Link href="?tab=integration" className="t-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              Full live report →
            </Link>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

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

