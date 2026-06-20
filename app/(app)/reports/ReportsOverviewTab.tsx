'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SectionCard } from '@/components/ui';
import { formatCurrencyCompact } from '@/components/charts/chartFormatters';
import { AnalyticsHBarChart } from '@/components/analytics/AnalyticsHBarChart';
import { AnalyticsKpiCard } from '@/components/analytics/AnalyticsKpiCard';
import { AnalyticsGaugeCard } from '@/components/analytics/AnalyticsGaugeCard';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { ClaimOpsMetrics } from '@/lib/claims/reporting';
import type {
  ClaimRow,
  ClaimTypeBreakdown,
  OutcomeBreakdown,
  RecoveryMetrics,
  SourcesCoverage,
} from '@/app/(app)/reports/reportsPageTypes';
import { ReportsSourceTag as SourceTag } from '@/app/(app)/reports/ReportsSourceTag';
import { metricHint, metricHintCurrency } from '@/app/(app)/reports/reportsPageUtils';

type LiveSetupCta = { title: string; body: string; label: string };

export type OverviewTabProps = {
  connectionState: ConnectionState;
  liveCta: LiveSetupCta | null;
  claims: ClaimRow[];
  claimMetrics: ClaimOpsMetrics;
  priorMetrics: ClaimOpsMetrics | null;
  recoveryMetrics: RecoveryMetrics;
  claimTypeBreakdown: ClaimTypeBreakdown;
  requestedActionBreakdown: ClaimTypeBreakdown;
  outcomeBreakdown: OutcomeBreakdown;
  sourcesCoverage: SourcesCoverage;
  range: string;
};

export function OverviewTab({
  connectionState,
  liveCta,
  claims,
  claimMetrics,
  priorMetrics,
  recoveryMetrics,
  claimTypeBreakdown,
  requestedActionBreakdown,
  outcomeBreakdown,
  sourcesCoverage,
  range,
}: OverviewTabProps) {
  const rangeLabel = range === 'all' ? 'all time' : `last ${range.replace('d', ' days')}`;
  // Only claim "Live source" when a real integration is connected; otherwise the
  // data is existing/sample data and must not be badged as live.
  const sourceMode: 'live' | 'sample' =
    connectionState.orderSourceConnected || connectionState.helpdesk ? 'live' : 'sample';
  const hasCases = claims.length > 0 || connectionState.helpdesk;
  const sourceCoverage = (connectionState.shopify ? 50 : 0) + (connectionState.helpdesk ? 50 : 0);
  const followThroughPct = claimMetrics.recommendationFollowThroughRate * 100;

  return (
    <div className="p-4 space-y-4">
      {liveCta && (
        <div
          className="rounded-md border px-4 py-3"
          style={{
            background: 'color-mix(in srgb, var(--warning) 8%, var(--surface))',
            borderColor: 'color-mix(in srgb, var(--warning) 28%, var(--border))',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{liveCta.title}</p>
              <p className="t-caption mt-0.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>{liveCta.body}</p>
            </div>
            <Link href="/settings/integrations" className="btn-accent shrink-0 inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-caption font-semibold">
              {liveCta.label} <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AnalyticsKpiCard
          label="Payout exposure reviewed"
          value={claimMetrics.valueAtRisk ? formatCurrencyCompact(claimMetrics.valueAtRisk) : '—'}
          hint={metricHintCurrency(rangeLabel, claimMetrics.valueAtRisk, priorMetrics)}
        />
        <AnalyticsKpiCard
          label="Refunds approved"
          value={claimMetrics.amountRefunded ? formatCurrencyCompact(claimMetrics.amountRefunded) : '—'}
          hint={metricHint('Recorded outcomes', claimMetrics.approvedClaims, priorMetrics, 'approvedClaims')}
        />
        <AnalyticsKpiCard
          label="Payouts denied under policy"
          value={claimMetrics.deniedClaims}
          hint={metricHint('Agent decisions', claimMetrics.deniedClaims, priorMetrics, 'deniedClaims')}
        />
        <AnalyticsKpiCard
          label="Evidence requested"
          value={claimMetrics.evidenceRequestedClaims}
          hint={metricHint('Cases waiting on proof', claimMetrics.evidenceRequestedClaims, priorMetrics, 'evidenceRequestedClaims')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AnalyticsKpiCard
          label="Manual reviews"
          value={claimMetrics.inReviewOrPendingClaims}
          hint={metricHint('Pending or escalated cases', claimMetrics.inReviewOrPendingClaims, priorMetrics, 'inReviewOrPendingClaims')}
          compact
        />
        <AnalyticsKpiCard
          label="Recovered amount"
          value={recoveryMetrics.recoveredAmount ? formatCurrencyCompact(recoveryMetrics.recoveredAmount) : '—'}
          hint="Recovery outcomes"
          compact
        />
        <AnalyticsKpiCard
          label="Open recovery value"
          value={recoveryMetrics.openRecoveryValue ? formatCurrencyCompact(recoveryMetrics.openRecoveryValue) : '—'}
          hint={`${recoveryMetrics.openCases.toLocaleString()} open recovery cases`}
          compact
        />
        <AnalyticsKpiCard
          label="Rule follow-through"
          value={claimMetrics.recommendationCount > 0 ? `${Math.round(followThroughPct)}%` : '—'}
          hint={`${claimMetrics.followedRecommendations.toLocaleString()} of ${claimMetrics.recommendationCount.toLocaleString()} recorded`}
          compact
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <AnalyticsGaugeCard
          label="Decision completion"
          value={claimMetrics.resolutionRate * 100}
          hint={`${claimMetrics.resolvedClaims.toLocaleString()} of ${claimMetrics.totalClaims.toLocaleString()} payout cases`}
          color="var(--neutral)"
        />
        <AnalyticsGaugeCard
          label="Recovery win rate"
          value={recoveryMetrics.winRate * 100}
          hint="Approved, partially approved, or paid recoveries"
          color="var(--accent)"
        />
        <AnalyticsGaugeCard
          label="Source coverage"
          value={sourceCoverage}
          hint="Shopify + helpdesk connection health"
          color="var(--lime)"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Requested payout actions" description={`Case intake mix · ${rangeLabel}`} actions={<SourceTag source={sourceMode} />}>
          <AnalyticsHBarChart
            data={requestedActionBreakdown.slice(0, 7).map((item) => ({
              label: item.label,
              value: item.count,
              color: 'var(--accent)',
            }))}
            yAxisWidth={150}
            emptyLabel="No payout action data"
          />
        </SectionCard>

        <SectionCard title="Evidence gap trends" description={`Cases waiting on evidence · ${rangeLabel}`} actions={<SourceTag source={sourceMode} />}>
          <AnalyticsHBarChart
            data={[
              { label: 'Evidence requested', value: claimMetrics.evidenceRequestedClaims, color: 'var(--warning)' },
              { label: 'Manual review', value: claimMetrics.inReviewOrPendingClaims, color: 'var(--accent)' },
              { label: 'Ageing cases', value: claimMetrics.overdueClaims, color: 'var(--text-tertiary)' },
              { label: 'Recovery evidence needed', value: recoveryMetrics.evidenceNeeded, color: 'var(--neutral)' },
            ]}
            yAxisWidth={160}
            emptyLabel="No evidence gaps"
          />
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Case reasons by exposure" description={`Support payout case mix · ${rangeLabel}`} actions={<SourceTag source={sourceMode} />}>
          <AnalyticsHBarChart
            data={claimTypeBreakdown.slice(0, 7).map((item) => ({
              label: item.label,
              value: item.value || item.count,
              color: 'var(--accent)',
            }))}
            yAxisWidth={150}
            valueFormatter={(value) => itemValueLabel(value)}
            emptyLabel="No case reason data"
          />
        </SectionCard>

        <SectionCard title="Final outcome trends" description={`Agent decision outcomes · ${rangeLabel}`} actions={<SourceTag source={sourceMode} />}>
          <AnalyticsHBarChart
            data={outcomeBreakdown.slice(0, 7).map((item) => ({
              label: item.label,
              value: item.count,
              color: 'var(--neutral)',
            }))}
            yAxisWidth={150}
            emptyLabel="No recorded outcomes yet"
          />
        </SectionCard>
      </div>

      <SectionCard title="Source coverage" description="Records available for payout-control reporting">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Payout cases', value: sourcesCoverage.merchantClaims },
            { label: 'Support records', value: sourcesCoverage.supportCases },
            { label: 'Evidence files', value: sourcesCoverage.evidencePackages },
            { label: 'Recovery cases', value: sourcesCoverage.recoveryCases },
            { label: 'Partners', value: sourcesCoverage.partners },
            { label: 'Partner rules', value: sourcesCoverage.partnerRules },
            { label: 'Order records', value: sourcesCoverage.auditTransactions },
            { label: 'Customer context', value: sourcesCoverage.customerProfiles },
          ].map(({ label, value }) => (
            <AnalyticsKpiCard key={label} label={label} value={value} compact />
          ))}
        </div>
      </SectionCard>

      {!hasCases && (
        <SectionCard title="No payout cases yet" description="Connect Shopify and your helpdesk, or ingest support cases, to populate payout-control reporting.">
          <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
            Payout exposure, decisions, evidence gaps, and recovery outcomes appear here once cases are created.
          </p>
        </SectionCard>
      )}
    </div>
  );
}

function itemValueLabel(value: number): string {
  return value >= 1000 ? formatCurrencyCompact(value) : String(value);
}
