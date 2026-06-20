'use client';

import Link from 'next/link';
import { ArrowRight, Headphones, ShoppingBag } from 'lucide-react';
import { SectionCard } from '@/components/ui';
import { AnalyticsKpiCard } from '@/components/analytics/AnalyticsKpiCard';
import { AnalyticsHBarChart } from '@/components/analytics/AnalyticsHBarChart';
import { AnalyticsGaugeCard } from '@/components/analytics/AnalyticsGaugeCard';
import { formatCurrencyCompact } from '@/components/charts/chartFormatters';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type {
  PartnerPerformanceRow,
  RecoveryMetrics,
  RecoveryStatusBreakdown,
  SourcesCoverage,
} from '@/app/(app)/reports/reportsPageTypes';
import { ReportsSourceTag as SourceTag } from '@/app/(app)/reports/ReportsSourceTag';

type LiveSetupCta = { title: string; body: string; label: string };
export type RecoveryTabProps = {
  connectionState: ConnectionState;
  liveCta: LiveSetupCta | null;
  range: string;
  recoveryMetrics: RecoveryMetrics;
  recoveryStatusBreakdown: RecoveryStatusBreakdown;
  partnerPerformance: PartnerPerformanceRow[];
  sourcesCoverage: SourcesCoverage;
};

export function RecoveryTab({
  connectionState,
  liveCta,
  range,
  recoveryMetrics,
  recoveryStatusBreakdown,
  partnerPerformance,
  sourcesCoverage,
}: RecoveryTabProps) {
  const rangeLabel = range === 'all' ? 'all time' : `last ${range.replace('d', ' days')}`;

  return (
    <div className="p-4 space-y-4">
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

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AnalyticsKpiCard label="Recovered amount" value={recoveryMetrics.recoveredAmount ? formatCurrencyCompact(recoveryMetrics.recoveredAmount) : '—'} hint={rangeLabel} />
        <AnalyticsKpiCard label="Unrecovered amount" value={recoveryMetrics.unrecoveredAmount ? formatCurrencyCompact(recoveryMetrics.unrecoveredAmount) : '—'} />
        <AnalyticsKpiCard label="Open recovery value" value={recoveryMetrics.openRecoveryValue ? formatCurrencyCompact(recoveryMetrics.openRecoveryValue) : '—'} />
        <AnalyticsKpiCard label="Recovery cases" value={recoveryMetrics.totalCases} />
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AnalyticsKpiCard label="Evidence needed" value={recoveryMetrics.evidenceNeeded} compact />
        <AnalyticsKpiCard label="Chase due" value={recoveryMetrics.chaseDue} compact />
        <AnalyticsKpiCard label="Submitted" value={recoveryMetrics.submittedCases} compact />
        <AnalyticsKpiCard label="Approved / paid" value={recoveryMetrics.approvedCases} compact />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <AnalyticsGaugeCard
          label="Recovery win rate"
          value={recoveryMetrics.winRate * 100}
          hint="Approved, partially approved, or paid recoveries"
          color="var(--accent)"
        />
        <AnalyticsGaugeCard
          label="Open recovery load"
          value={recoveryMetrics.totalCases > 0 ? (recoveryMetrics.openCases / recoveryMetrics.totalCases) * 100 : 0}
          hint={`${recoveryMetrics.openCases.toLocaleString()} open of ${recoveryMetrics.totalCases.toLocaleString()} total`}
          color="var(--warning)"
        />
        <AnalyticsGaugeCard
          label="Partner rule coverage"
          value={sourcesCoverage.partners > 0 ? Math.min((sourcesCoverage.partnerRules / sourcesCoverage.partners) * 100, 100) : 0}
          hint={`${sourcesCoverage.partnerRules.toLocaleString()} active or configured rules`}
          color="var(--lime)"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Recovery status" description={`Recovery case board · ${rangeLabel}`} actions={<SourceTag source="live" />}>
          <AnalyticsHBarChart
            data={recoveryStatusBreakdown.slice(0, 8).map((item) => ({
              label: item.label,
              value: item.count,
              color: item.status === 'chase_due' || item.status === 'evidence_needed' ? 'var(--warning)' : 'var(--accent)',
            }))}
            yAxisWidth={160}
            emptyLabel="No recovery cases"
          />
        </SectionCard>

        <SectionCard title="Partner performance" description="Recovered and open recovery value by owner" actions={<SourceTag source="live" />}>
          <AnalyticsHBarChart
            data={partnerPerformance.slice(0, 8).map((item) => ({
              label: item.partnerName,
              value: item.recoveredAmount + item.openRecoveryValue,
              color: item.recoveredAmount > 0 ? 'var(--neutral)' : 'var(--accent)',
            }))}
            yAxisWidth={160}
            valueFormatter={(value) => formatCurrencyCompact(value)}
            emptyLabel="No partner recovery data"
          />
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Recovery value" description="Open, recovered, and unrecovered totals">
          <AnalyticsHBarChart
            data={[
              { label: 'Recovered amount', value: recoveryMetrics.recoveredAmount, color: 'var(--neutral)' },
              { label: 'Open recovery value', value: recoveryMetrics.openRecoveryValue, color: 'var(--accent)' },
              { label: 'Estimated recoverable max', value: recoveryMetrics.estimatedRecoverableMax, color: 'var(--warning)' },
              { label: 'Unrecovered amount', value: recoveryMetrics.unrecoveredAmount, color: 'var(--text-tertiary)' },
            ]}
            yAxisWidth={180}
            valueFormatter={(value) => formatCurrencyCompact(value)}
            emptyLabel="No recovery value yet"
          />
        </SectionCard>

        <SectionCard title="Partner rulebook coverage" description="Configured recovery operating model">
          <div className="grid grid-cols-2 gap-3">
            <AnalyticsKpiCard label="Partners" value={sourcesCoverage.partners} compact />
            <AnalyticsKpiCard label="Partner rules" value={sourcesCoverage.partnerRules} compact />
            <AnalyticsKpiCard label="Recovery cases" value={sourcesCoverage.recoveryCases} compact />
            <AnalyticsKpiCard label="Evidence files" value={sourcesCoverage.evidencePackages} compact />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
