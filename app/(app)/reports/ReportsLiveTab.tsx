'use client';

import Link from 'next/link';
import { ArrowRight, Headphones, ShoppingBag } from 'lucide-react';
import { SectionCard } from '@/components/ui';
import { AnalyticsKpiCard } from '@/components/analytics/AnalyticsKpiCard';
import { AnalyticsHBarChart } from '@/components/analytics/AnalyticsHBarChart';
import { AnalyticsGaugeCard } from '@/components/analytics/AnalyticsGaugeCard';
import { formatCurrencyCompact } from '@/components/charts/chartFormatters';
import { formatCurrencyNullable } from '@/lib/utils/format';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { ClaimOpsMetrics } from '@/lib/claims/reporting';
import type { ClaimTypeBreakdown, OutcomeBreakdown, SourcesCoverage } from '@/app/(app)/reports/reportsPageTypes';
import { ReportsSourceTag as SourceTag } from '@/app/(app)/reports/ReportsSourceTag';

type LiveSetupCta = { title: string; body: string; label: string };
export type LiveTabProps = {
  connectionState: ConnectionState;
  liveCta: LiveSetupCta | null;
  range: string;
  claimMetrics: ClaimOpsMetrics;
  priorMetrics: ClaimOpsMetrics | null;
  exposureAtRisk: number | null;
  claimTypeBreakdown: ClaimTypeBreakdown;
  outcomeBreakdown: OutcomeBreakdown;
  sourcesCoverage: SourcesCoverage;
};

export function LiveTab({
  connectionState,
  liveCta,
  range,
  claimMetrics,
  exposureAtRisk,
  claimTypeBreakdown,
  outcomeBreakdown,
  sourcesCoverage,
}: LiveTabProps) {
  const rangeLabel = range === 'all' ? 'all time' : `last ${range.replace('d', ' days')}`;
  const resolutionRate = claimMetrics.totalClaims > 0
    ? (claimMetrics.resolvedClaims / claimMetrics.totalClaims) * 100
    : 0;
  const overdueRate = claimMetrics.totalClaims > 0
    ? (claimMetrics.overdueClaims / claimMetrics.totalClaims) * 100
    : 0;

  /* ── Colour helpers ─────────────────────────────────────────────────── */
  const OUTCOME_COLOR: Record<string, string> = {
    approved: 'var(--neutral)',
    denied: 'var(--accent)',
    partial: 'var(--warning)',
    chargeback: 'var(--sev-neutral)',
    withdrawn: 'var(--text-tertiary)',
  };

  return (
    <div className="p-4 space-y-4">

      {/* ── Setup CTA banner ─────────────────────────────────────────────── */}
      {liveCta && (
        <div
          className="rounded border px-4 py-3 flex flex-wrap items-center justify-between gap-3"
          style={{
            background: 'color-mix(in srgb, var(--warning) 8%, var(--surface))',
            borderColor: 'color-mix(in srgb, var(--warning) 28%, var(--border))',
          }}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <span
              className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded"
              style={{ background: 'color-mix(in srgb, var(--warning) 15%, transparent)' }}
            >
              {connectionState.shopifyOnlyConnected ? (
                <Headphones className="h-3.5 w-3.5" style={{ color: 'var(--warning)' }} />
              ) : (
                <ShoppingBag className="h-3.5 w-3.5" style={{ color: 'var(--warning)' }} />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{liveCta.title}</p>
              <p className="t-caption mt-0.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>{liveCta.body}</p>
            </div>
          </div>
          <Link href="/settings/integrations" className="btn-accent shrink-0 inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-caption font-semibold">
            {liveCta.label} <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* ── 4-KPI top strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AnalyticsKpiCard label="Claims filed" value={claimMetrics.totalClaims} hint={rangeLabel} />
        <AnalyticsKpiCard label="Open claims" value={claimMetrics.openClaims} />
        <AnalyticsKpiCard
          label="Open claim value"
          value={claimMetrics.valueAtRisk ? formatCurrencyCompact(claimMetrics.valueAtRisk) : '—'}
        />
        <AnalyticsKpiCard label="Evidence packages" value={sourcesCoverage.evidencePackages} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <AnalyticsGaugeCard
          label="Resolution rate"
          value={resolutionRate}
          hint={`Resolved claims · ${rangeLabel}`}
          color="var(--neutral)"
        />
        <AnalyticsGaugeCard
          label="Ageing claims"
          value={overdueRate}
          hint="Claims open longer than 72h"
          color="var(--warning)"
        />
        <AnalyticsGaugeCard
          label="Source coverage"
          value={(connectionState.shopify ? 50 : 0) + (connectionState.helpdesk ? 50 : 0)}
          hint="Connected live data sources"
          color="var(--lime)"
        />
      </div>

      {/* ── Status + Claim reason charts ─────────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Claim status" description={`Breakdown · ${rangeLabel}`} actions={<SourceTag source="live" />}>
          <AnalyticsHBarChart
            data={[
              { label: 'Open', value: claimMetrics.openClaims, color: 'var(--text-tertiary)' },
              { label: 'In review / pending', value: claimMetrics.inReviewOrPendingClaims, color: 'var(--warning)' },
              { label: 'Resolved', value: claimMetrics.resolvedClaims, color: 'var(--neutral)' },
              { label: 'Ageing (>72h)', value: claimMetrics.overdueClaims, color: 'var(--accent)' },
            ]}
            emptyLabel="No claim data"
          />
        </SectionCard>

        <SectionCard title="Claim reason" description={`By claim type · ${rangeLabel}`} actions={<SourceTag source="live" />}>
          <AnalyticsHBarChart
            data={claimTypeBreakdown.slice(0, 6).map((item) => ({
              label: item.label,
              value: item.count,
              color: 'var(--accent)',
            }))}
            yAxisWidth={140}
            emptyLabel="No claim type data"
          />
        </SectionCard>
      </div>

      {/* ── Outcomes + Source coverage ────────────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Outcome decisions" description={`Decision breakdown · ${rangeLabel}`} actions={<SourceTag source="live" />}>
          {outcomeBreakdown.length === 0 ? (
            <div className="py-8 text-center">
              <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>No recorded outcomes yet.</p>
            </div>
          ) : (
            <AnalyticsHBarChart
              data={outcomeBreakdown.slice(0, 6).map((item) => ({
                label: item.label,
                value: item.count,
                color: OUTCOME_COLOR[item.decision] ?? 'var(--sev-neutral)',
              }))}
              yAxisWidth={110}
            />
          )}
        </SectionCard>

        <SectionCard title="Source coverage" description="Records across connected sources">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mt-1">
            {[
              { label: 'Customer profiles', value: sourcesCoverage.customerProfiles },
              { label: 'Order records', value: sourcesCoverage.auditTransactions },
              { label: 'Claim records', value: sourcesCoverage.merchantClaims },
              { label: 'Source cases', value: sourcesCoverage.supportCases },
              { label: 'Evidence packages', value: sourcesCoverage.evidencePackages },
            ].map(({ label, value }) => (
              <AnalyticsKpiCard key={label} label={label} value={value} compact />
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Exposure panel ───────────────────────────────────────────────── */}
      {exposureAtRisk !== null && (
        <SectionCard title="Exposure on open claims" description="Order value linked to open claims · Shopify source" actions={<SourceTag source="live" />}>
          <div className="py-1">
            <p className="num text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrencyNullable(exposureAtRisk)}
            </p>
            <p className="t-caption mt-1" style={{ color: 'var(--text-tertiary)' }}>Matched orders on open claims</p>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
