import Link from 'next/link';
import { Headphones, ShoppingBag } from 'lucide-react';
import { MetricCard, SectionCard } from '@/components/ui';
import { formatCurrencyNullable } from '@/lib/utils/format';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { ClaimOpsMetrics } from '@/lib/claims/reporting';
import {
  delta,
  metricHint,
  metricHintCurrency,
} from '@/app/(app)/reports/reportsPageUtils';
import { ReportsSourceTag as SourceTag } from '@/app/(app)/reports/ReportsSourceTag';

type LiveSetupCta = { title: string; body: string; label: string };
export type LiveTabProps = {
  connectionState: ConnectionState;
  liveCta: LiveSetupCta | null;
  range: string;
  claimMetrics: ClaimOpsMetrics;
  priorMetrics: ClaimOpsMetrics | null;
  exposureAtRisk: number | null;
};

export function LiveTab({
  connectionState,
  liveCta,
  range,
  claimMetrics,
  priorMetrics,
  exposureAtRisk,
}: LiveTabProps) {
  return (
    <div className="p-4 space-y-4">
      {/* State-aware completeness banner - never an empty gate. Existing context
          (any metrics below) always renders; this nudges the missing source. */}
      {liveCta && (
        <div
          className="rounded border px-4 py-3 flex flex-wrap items-center justify-between gap-3"
          style={{
            background: 'color-mix(in srgb, var(--warning) 8%, var(--surface-raised))',
            borderColor: 'color-mix(in srgb, var(--warning) 28%, var(--surface-border))',
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
              <p className="t-body-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>{liveCta.title}</p>
              <p className="t-caption mt-0.5 leading-snug" style={{ color: 'var(--ink-secondary)' }}>{liveCta.body}</p>
            </div>
          </div>
          <Link href="/settings/integrations" className="btn-accent shrink-0 inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-caption font-semibold">
            {liveCta.label} →
          </Link>
        </div>
      )}

      <SectionCard
        title="Live report — claims operations"
        description={`Claim metrics for ${range === 'all' ? 'all time' : `last ${range.replace('d', ' days')}`}`}
        actions={<SourceTag source="live" />}
      >
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

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Resolution funnel" description="Claim volume by current status" actions={<SourceTag source="live" />}>
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

        <SectionCard title="Loss vs recovery" description="Financial impact for selected date range" actions={<SourceTag source="live" />}>
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
      </div>

      <SectionCard title="Order value in review queue" description="Matched orders with open claim exposure · source: Shopify" actions={<SourceTag source="live" />}>
        <MetricCard
          label="Order value linked"
          value={exposureAtRisk === null ? 'Unavailable' : formatCurrencyNullable(exposureAtRisk)}
          hint="Matched orders in review queue · source: Shopify"
        />
      </SectionCard>
    </div>
  );
}
