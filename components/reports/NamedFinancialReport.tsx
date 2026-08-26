import ExportMenu from '@/components/reports/ExportMenu';
import { ButtonLink, UnavailableValue } from '@/components/ui';
import { financialMetricCaseCount, financialMetricIsKnown, type IntelligenceReport, type MoneyBridge } from '@/lib/reporting/intelligence';
import { buildPilotValueReport } from '@/lib/reporting/pilotValue';
import { formatDateTime, formatDayMonthInTimeZone, formatMinorCurrencyNullable, formatNumber } from '@/lib/utils/format';

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: string }) {
  return <div className="ua-named-financial__metric"><span>{label}</span><strong data-tone={tone}>{value}</strong><small>{detail}</small></div>;
}

function WeeklyChart({ bridge, report }: { bridge: MoneyBridge; report: IntelligenceReport }) {
  const points = report.trend.filter((point) => point.currency === bridge.currency).toSorted((a, b) => a.date.localeCompare(b.date));
  const buckets: Array<{ start: string; end: string; loss: number; recovered: number }> = [];
  points.forEach((point, index) => {
    const bucketIndex = Math.floor(index / 7);
    const bucket = buckets[bucketIndex] ?? { start: point.date, end: point.date, loss: 0, recovered: 0 };
    bucket.end = point.date; bucket.loss += point.realisedLossMinor; bucket.recovered += point.recoveredMinor; buckets[bucketIndex] = bucket;
  });
  const maximum = Math.max(1, ...buckets.flatMap((bucket) => [bucket.loss, bucket.recovered]));
  return <section className="ua-named-financial__chart" aria-label={`Confirmed loss and recovered cash by week, ${bridge.currency}`}>
    <header><h2>Confirmed loss and recovered cash by week</h2><p>{bridge.currency} · {report.timezone} · recorded date, not decision date</p></header>
    {buckets.length ? <div className="ua-named-financial__plot">{buckets.map((bucket) => <div key={bucket.start} className="ua-named-financial__week"><div><i data-tone="loss" style={{ height: `${Math.max(bucket.loss ? 2 : 0, bucket.loss / maximum * 100)}%` }} /><i data-tone="recovered" style={{ height: `${Math.max(bucket.recovered ? 2 : 0, bucket.recovered / maximum * 100)}%` }} /></div><small>{formatDayMonthInTimeZone(bucket.start, report.timezone)} – {formatDayMonthInTimeZone(bucket.end, report.timezone)}</small></div>)}</div> : <div className="p-4"><UnavailableValue reason="No dated ledger facts are available for this scope" /></div>}
    <footer><span><i data-tone="loss" />Confirmed loss</span><span><i data-tone="recovered" />Recovered cash</span></footer>
  </section>;
}

export function NamedFinancialReport({ report, recordsHref, selectedCurrency }: { report: IntelligenceReport; recordsHref: string; selectedCurrency: string | null }) {
  return <div className="ua-reports-content">{report.bridges.map((bridge) => {
    const finalKnown = financialMetricIsKnown(bridge, 'final_net_loss') && report.reconciliation.ok;
    const pilotValue = buildPilotValueReport({
      currency: bridge.currency,
      preventedMinor: financialMetricIsKnown(bridge, 'prevented') ? bridge.preventedMinor : null,
      receivedRecoveryMinor: financialMetricIsKnown(bridge, 'recovered') ? bridge.recoveredMinor : null,
      evidence: {
        prevented: financialMetricIsKnown(bridge, 'prevented') ? `${report.financialScope?.definitionVersion ?? 'financial-ledger'}:prevented` : null,
        received_recovery: financialMetricIsKnown(bridge, 'recovered') ? `${report.financialScope?.definitionVersion ?? 'financial-ledger'}:recovered` : null,
      },
    });
    return <div key={bridge.currency} className="ua-reports-content">
      <section className="ua-named-financial__summary">
        <div className="ua-named-financial__question"><div><h2>How did requested value become final net loss?</h2><p>Requested value is every payout a customer asked for in range. Each following stage is a separately recorded fact — a decision, a ledger entry, or an external recovery event — so a stage can be unavailable without invalidating the others.</p></div><span>Amount</span></div>
        <div className="ua-named-financial__metrics">
          <Metric label="Requested value" value={formatMinorCurrencyNullable(bridge.requestedMinor, bridge.currency)} detail={`${formatNumber(financialMetricCaseCount(bridge, 'requested'))} records · ${bridge.currency}`} />
          <Metric label="Confirmed loss" value={formatMinorCurrencyNullable(bridge.realisedLossMinor, bridge.currency)} detail={`${formatNumber(financialMetricCaseCount(bridge, 'confirmed_loss'))} ledger records`} tone="loss" />
          <Metric label="Recovered cash" value={formatMinorCurrencyNullable(bridge.recoveredMinor, bridge.currency)} detail={`${formatNumber(financialMetricCaseCount(bridge, 'recovered'))} matched credit records`} tone="recovered" />
          <Metric label="Final net loss" value={finalKnown ? formatMinorCurrencyNullable(bridge.finalNetLossMinor, bridge.currency) : '— Unavailable'} detail={finalKnown ? 'Reconciled outcome' : `${report.reconciliation.confidence.unreconciledExcludedRecordCount} records unreconciled`} tone={finalKnown ? 'loss' : 'unavailable'} />
        </div>
      </section>
      <WeeklyChart bridge={bridge} report={report} />
      <section className="ua-named-financial__summary" aria-labelledby={`pilot-value-${bridge.currency}`}>
        <div className="ua-named-financial__question"><div><h2 id={`pilot-value-${bridge.currency}`}>Pilot value report</h2><p>{pilotValue.formula}. Only cited terms are included; missing cost terms are not assumed to be zero.</p></div><span>{bridge.currency}</span></div>
        <div className="ua-named-financial__metrics">
          {pilotValue.terms.map((term) => <Metric key={term.key} label={term.label} value={term.known ? formatMinorCurrencyNullable(term.amountMinor, term.currency) : '— Unavailable'} detail={term.evidence ?? 'No evidence source is recorded for this term'} tone={term.known ? undefined : 'unavailable'} />)}
          <Metric label="Net pilot value" value={pilotValue.netValueMinor == null ? '— Unavailable' : formatMinorCurrencyNullable(pilotValue.netValueMinor, pilotValue.currency)} detail={pilotValue.limitation ?? 'All terms are evidence-backed'} tone={pilotValue.complete ? 'recovered' : 'unavailable'} />
        </div>
      </section>
    </div>;
  })}
  <div className="ua-named-financial__details">
    <section><h2>How this report was run</h2><dl><div><dt>Run mode</dt><dd>On demand, at open</dd></div><div><dt>Generated</dt><dd>{formatDateTime(report.generatedAt)} · {report.timezone}</dd></div><div><dt>Scope</dt><dd>{report.range} · {selectedCurrency ?? 'currencies separated'}</dd></div><div><dt>Measure</dt><dd>Exact amount, calculated without rounding error, formatted per currency</dd></div><div><dt>Excluded</dt><dd>{report.reconciliation.confidence.excludedRecordCount} records failed report contracts</dd></div></dl></section>
    <section><h2>Saving, owner and delivery</h2><div className="ua-named-financial__unavailable"><strong>Unavailable</strong><p>A persisted report owner, schedule and email delivery need a saved-report backend, which is not connected. Nothing is queued and no recipient will receive this report.</p></div><div className="flex flex-wrap gap-2"><ExportMenu range={report.range} timezone={report.timezone} currency={selectedCurrency} triggerLabel="Export CSV" /></div></section>
  </div>
  <section className="ua-named-financial__records"><div><h2>Supporting records</h2><p>{formatNumber(report.recordCount)} immutable records produced these figures, exportable at this exact scope.</p></div><ButtonLink href={recordsHref} variant="primary" size="sm">Open supporting records</ButtonLink></section>
  </div>;
}
