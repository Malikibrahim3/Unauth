import Link from '@/components/navigation/AppNavLink';
import type { FinancialReportMetric, IntelligenceReport, MoneyBridge } from '@/lib/reporting/intelligence';
import { financialMetricCaseCount, financialMetricIsKnown, financialMetricValue, financialReportRecordsHref } from '@/lib/reporting/intelligence';
import { formatMinorCurrencyNullable, formatNumber } from '@/lib/utils/format';

type Stage = { metric: FinancialReportMetric; label: string; group: string; tone: string };
const STAGES: Stage[] = [
  { metric: 'requested', label: 'Requested value', group: 'Observed exposure · source-backed', tone: 'blue' },
  { metric: 'exposed', label: 'Maximum exposure', group: 'Observed exposure · source-backed', tone: 'blue' },
  { metric: 'approved', label: 'Payout approved', group: 'Merchant decision · recorded by a person', tone: 'neutral' },
  { metric: 'paid', label: 'Observed payout', group: 'Merchant decision · recorded by a person', tone: 'neutral' },
  { metric: 'prevented', label: 'Prevented', group: 'Merchant decision · recorded by a person', tone: 'prevented' },
  { metric: 'estimated_loss', label: 'Estimated loss', group: 'Recorded loss · append-only ledger', tone: 'amber' },
  { metric: 'confirmed_loss', label: 'Confirmed loss', group: 'Recorded loss · append-only ledger', tone: 'red' },
  { metric: 'recoverable', label: 'Eligible recovery', group: 'Recovery · bounded by confirmed loss', tone: 'recovered' },
  { metric: 'recovered', label: 'Recovered cash', group: 'Recovery · bounded by confirmed loss', tone: 'recovered' },
  { metric: 'outstanding', label: 'Outstanding recovery', group: 'Recovery · bounded by confirmed loss', tone: 'recovered' },
  { metric: 'written_off', label: 'Written off', group: 'Recovery · bounded by confirmed loss', tone: 'neutral' },
  { metric: 'final_net_loss', label: 'Final net loss', group: 'Recovery · bounded by confirmed loss', tone: 'red' },
];

function basis(metric: FinancialReportMetric, value: number, requested: number, loss: number, recoverable: number, known: boolean) {
  if (!known) return 'Unavailable';
  if (metric === 'requested') return '100% basis';
  if (metric === 'approved') return 'Recorded decisions';
  if (metric === 'paid') return 'Payment source';
  if (metric === 'estimated_loss') return 'Not confirmed';
  if (metric === 'recoverable') return loss > 0 ? `${Math.round(value / loss * 100)}% of loss` : 'Verified zero';
  if (metric === 'recovered') return recoverable > 0 ? `${Math.round(value / recoverable * 100)}% of eligible` : 'Verified zero';
  if (metric === 'outstanding' || metric === 'written_off') return value === 0 ? 'Verified zero' : 'Recorded value';
  return requested > 0 ? `${(value / requested * 100).toFixed(1)}%` : 'Verified zero';
}

function CurrencyLadder({ bridge, report }: { bridge: MoneyBridge; report: IntelligenceReport }) {
  const requested = bridge.requestedMinor;
  const loss = bridge.realisedLossMinor;
  const recoverable = bridge.recoverableMinor;
  return (
    <section className="ua-stage-ladder" aria-label={`${bridge.currency} financial stages`}>
      <header className="ua-stage-ladder__header">
        <div><h2>How did requested value become final net loss?</h2><p>Every stage is a separate recorded fact. Nothing is inferred from the stage above it.</p></div>
        <div><span className="ua-stage-ladder__currency">{bridge.currency}</span><Link href={financialReportRecordsHref({ range: report.range, currency: bridge.currency, metric: 'requested', timezone: report.timezone })}>{formatNumber(bridge.caseIds.length)} supporting cases</Link></div>
      </header>
      <div className="ua-stage-ladder__table" role="table" aria-label={`${bridge.currency} stage ladder`}>
        <div className="ua-stage-ladder__columns" role="row"><span role="columnheader">Stage</span><span role="columnheader">Share of requested value</span><span role="columnheader">Amount {bridge.currency}</span><span role="columnheader">Basis</span><span role="columnheader">Records</span></div>
        {STAGES.map((stage, index) => {
          const groupChanged = index === 0 || stage.group !== STAGES[index - 1].group;
          const finalUnreconciled = stage.metric === 'final_net_loss' && !report.reconciliation.ok;
          const reconciledFinal = !finalUnreconciled;
          const noWrittenOffRecords = stage.metric === 'written_off' && financialMetricCaseCount(bridge, 'written_off') === 0;
          const known = (financialMetricIsKnown(bridge, stage.metric) || noWrittenOffRecords) && reconciledFinal;
          const value = known ? financialMetricValue(bridge, stage.metric) ?? 0 : 0;
          const width = known && requested > 0 ? Math.min(100, Math.max(value > 0 ? 0.7 : 0, value / requested * 100)) : 0;
          const href = financialReportRecordsHref({ range: report.range, currency: bridge.currency, metric: stage.metric, timezone: report.timezone });
          return <div key={stage.metric} role="rowgroup">
            {groupChanged ? <div className="ua-stage-ladder__group">{stage.group}</div> : null}
            <div className={`ua-stage-ladder__row ua-stage-ladder__row--${stage.tone}${stage.metric === 'final_net_loss' ? ' ua-stage-ladder__row--final' : ''}`} role="row">
              <span className="ua-stage-ladder__label" role="cell">{stage.label}</span>
              {finalUnreconciled ? (
                <span className="ua-stage-ladder__track-message" role="cell">Cannot be computed — one or more stages fail the source-to-ledger reconciliation contract</span>
              ) : (
                <span className={`ua-stage-ladder__track${known ? '' : ' ua-stage-ladder__track--unknown'}`} role="cell"><i style={{ width: `${width}%` }} /></span>
              )}
              <strong role="cell">{noWrittenOffRecords ? '— No records' : known ? formatMinorCurrencyNullable(value, bridge.currency) : '— Unavailable'}</strong>
              <span role="cell">{finalUnreconciled ? 'Unreconciled' : noWrittenOffRecords ? 'None in range' : basis(stage.metric, value, requested, loss, recoverable, known)}</span>
              <span role="cell">{finalUnreconciled ? <Link href="/financials/reconciliation">Resolve</Link> : noWrittenOffRecords ? '0' : known && financialMetricCaseCount(bridge, stage.metric) > 0 ? <Link href={href}>{formatNumber(financialMetricCaseCount(bridge, stage.metric))}</Link> : '—'}</span>
            </div>
          </div>;
        })}
      </div>
    </section>
  );
}

export function FinancialStageLadder({ report }: { report: IntelligenceReport }) {
  if (!report.bridges.length) return <section className="ua-stage-ladder ua-stage-ladder--empty"><h2>Financial stages are unavailable</h2><p>No verified financial history exists for this scope. Unavailable values have not been replaced with zero.</p></section>;
  return <div className="ua-stage-ladders">{report.bridges.map((bridge) => <CurrencyLadder key={bridge.currency} bridge={bridge} report={report} />)}</div>;
}
