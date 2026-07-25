'use client';

import Link from 'next/link';
import { Card } from '@/components/ui';
import {
  aggregateMoneyBridges,
  FINANCIAL_REPORT_METRICS,
  financialMetricIsKnown,
  financialMetricValue,
  type FinancialReportMetric,
} from '@/lib/reporting/intelligence';
import { formatDateTime, formatMinorCurrencyNullable } from '@/lib/utils/format';

export type CaseFinancialSummary = {
  [key: string]: unknown;
  support_payout_case_id: string;
  currency: string;
  requested_minor: number;
  exposed_minor: number;
  approved_minor: number;
  paid_minor: number;
  estimated_loss_minor: number;
  confirmed_loss_minor: number;
  recoverable_minor: number;
  recovered_minor: number;
  prevented_minor: number;
  written_off_minor: number;
  known_states: string[];
  updated_at: string;
};

const LABELS: Record<FinancialReportMetric, string> = {
  requested: 'Requested',
  exposed: 'Exposed',
  approved: 'Approved',
  paid: 'Paid',
  estimated_loss: 'Estimated loss',
  prevented: 'Prevented',
  confirmed_loss: 'Confirmed loss',
  recoverable: 'Recoverable',
  recovered: 'Recovered',
  outstanding: 'Outstanding recovery',
  written_off: 'Written off',
  final_net_loss: 'Final net loss',
};

export function CaseFinancialHistoryCard({
  summaries,
}: {
  summaries: CaseFinancialSummary[];
}) {
  const bridges = aggregateMoneyBridges(summaries);
  const updatedAt = summaries
    .map((summary) => summary.updated_at)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <Card unstyled as="section" variant="panel" className="p-4" aria-labelledby="case-financial-history-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="case-financial-history-title" className="text-sm font-semibold">Financial history</h2>
          <p className="mt-1 text-xs text-[var(--ua-text-secondary)]">
            Canonical append-only totals. Customer concessions, economic loss, and provider recovery remain distinct; approval is not recovered cash.
          </p>
        </div>
        <Link href="/reports?range=all" className="text-xs font-semibold text-[var(--ua-action-primary)]">
          View reconciled reports
        </Link>
      </div>

      {bridges.length ? (
        <div className="mt-3 space-y-4">
          {bridges.map((bridge) => (
            <div key={bridge.currency}>
              <h3 className="text-xs font-semibold">{bridge.currency}</h3>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                {FINANCIAL_REPORT_METRICS.map((metric) => {
                  const known = financialMetricIsKnown(bridge, metric);
                  const value = financialMetricValue(bridge, metric);
                  return (
                    <div key={metric}>
                      <dt className="text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-secondary)]">{LABELS[metric]}</dt>
                      <dd className="text-xs font-semibold tabular-nums">
                        {known && value != null
                          ? formatMinorCurrencyNullable(value, bridge.currency)
                          : 'Unavailable'}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
          {updatedAt ? (
            <p className="text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">Projection updated {formatDateTime(updatedAt)}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-[var(--ua-text-secondary)]">
          No canonical financial entries are available for this case. Missing values are not reported as zero.
        </p>
      )}
    </Card>
  );
}
