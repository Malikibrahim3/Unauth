'use client';

import Link from 'next/link';
import { Card } from '@/components/ui';
import {
  aggregateMoneyBridges,
  enforceFinancialTruth,
  FINANCIAL_REPORT_METRICS,
  financialMetricIsKnown,
  financialMetricValue,
  type FinancialReportMetric,
} from '@/lib/reporting/intelligence';
import { formatDateTime, formatMinorCurrencyNullable } from '@/lib/utils/format';
import { financialStageLabel } from '@/lib/ui/labels';

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
  requested: financialStageLabel('requested'),
  exposed: financialStageLabel('maximum_exposure'),
  approved: financialStageLabel('merchant_decision'),
  paid: financialStageLabel('observed_payout'),
  estimated_loss: financialStageLabel('estimated_loss'),
  prevented: financialStageLabel('prevented'),
  confirmed_loss: financialStageLabel('confirmed_loss'),
  recoverable: financialStageLabel('eligible_recovery'),
  recovered: financialStageLabel('recovered_cash'),
  outstanding: financialStageLabel('outstanding_recovery'),
  written_off: financialStageLabel('written_off'),
  final_net_loss: financialStageLabel('final_net_loss'),
};

export function CaseFinancialHistoryCard({
  summaries,
}: {
  summaries: CaseFinancialSummary[];
}) {
  const bridges = aggregateMoneyBridges(enforceFinancialTruth(summaries).rows);
  const updatedAt = summaries
    .map((summary) => summary.updated_at)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <Card unstyled as="section" variant="panel" className="p-4" aria-labelledby="case-financial-history-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="case-financial-history-title" className="font-medium text-[13px] leading-5 text-[#1c1f23]">Financial history</h2>
          <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-1">
            Recorded merchant and provider stages stay separate; approval is not recovered cash.
          </p>
        </div>
        <Link href="/financials/reports?range=all" className="text-[11px] font-medium leading-4 text-[#64686d] text-[#9f4f08]">
          View reconciled reports
        </Link>
      </div>

      {bridges.length ? (
        <div className="mt-3 space-y-4">
          {bridges.map((bridge) => (
            <div key={bridge.currency}>
              <h3 className="text-[11px] font-medium leading-4 text-[#64686d]">{bridge.currency}</h3>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                {FINANCIAL_REPORT_METRICS.map((metric) => {
                  const known = financialMetricIsKnown(bridge, metric);
                  const value = financialMetricValue(bridge, metric);
                  return (
                    <div key={metric}>
                      <dt className="text-[length:10.5px] text-[#64686d]">{LABELS[metric]}</dt>
                      <dd className="text-[11px] font-medium leading-4 text-[#64686d] tabular-nums">
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
            <p className="text-[length:10.5px] text-[#6f6a63]">Projection updated {formatDateTime(updatedAt)}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-[13px] leading-5 text-[#40454a] mt-3 text-[#64686d]">
          No financial stages have been recorded for this case yet. Missing values remain unavailable rather than showing as zero.
        </p>
      )}
    </Card>
  );
}
