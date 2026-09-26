import ExportMenu from '@/components/reports/ExportMenu';
import { ButtonLink, UnavailableValue } from '@/components/ui';
import { financialMetricCaseCount, financialMetricIsKnown, type IntelligenceReport, type MoneyBridge } from '@/lib/reporting/intelligence';
import { buildPilotValueReport } from '@/lib/reporting/pilotValue';
import { formatDateTime, formatDayMonthInTimeZone, formatMinorCurrencyNullable, formatNumber } from '@/lib/utils/format';

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: string }) {
  return <div className="named-financial-metric"><span>{label}</span><strong data-tone={tone}>{value}</strong><small>{detail}</small></div>;
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
  return <section className="relative" aria-label={`Confirmed loss and received and matched credit by week, ${bridge.currency}`}>
    <header><h2>Confirmed loss and received and matched credit by week</h2><p>{bridge.currency} · {report.timezone} · recorded date, not decision date</p></header>
    {buckets.length ? <div className="named-week-bars">{buckets.map((bucket) => <div key={bucket.start} className="named-week-bucket"><div><i data-tone="loss" style={{ height: `${Math.max(bucket.loss ? 2 : 0, bucket.loss / maximum * 100)}%` }} /><i data-tone="recovered" style={{ height: `${Math.max(bucket.recovered ? 2 : 0, bucket.recovered / maximum * 100)}%` }} /></div><small>{formatDayMonthInTimeZone(bucket.start, report.timezone)} – {formatDayMonthInTimeZone(bucket.end, report.timezone)}</small></div>)}</div> : <div className="p-4"><UnavailableValue reason="No dated ledger facts are available for this scope" /></div>}
    <footer><span><i data-tone="loss" />Confirmed loss</span><span><i data-tone="recovered" />Received and matched</span></footer>
  </section>;
}

export function NamedFinancialReport({ report, recordsHref, selectedCurrency }: { report: IntelligenceReport; recordsHref: string; selectedCurrency: string | null }) {
  return <div className="named-financial-report">{report.bridges.map((bridge) => {
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
    return <div key={bridge.currency} className="named-financial-currency">
      <section className="named-financial-card">
        <div className="named-financial-head"><div><h2>How did requested value become final net loss?</h2><p>Requested value is every payout a customer asked for in range. Each following stage is a separately recorded fact — a decision, a ledger entry, or an external recovery event — so a stage can be unavailable without invalidating the others.</p></div><span>Amount</span></div>
        <div className="named-financial-metrics">
          <Metric label="Requested value" value={formatMinorCurrencyNullable(bridge.requestedMinor, bridge.currency)} detail={`${formatNumber(financialMetricCaseCount(bridge, 'requested'))} records · ${bridge.currency}`} />
          <Metric label="Confirmed loss" value={formatMinorCurrencyNullable(bridge.realisedLossMinor, bridge.currency)} detail={`${formatNumber(financialMetricCaseCount(bridge, 'confirmed_loss'))} ledger records`} tone="loss" />
          <Metric label="Received and matched" value={formatMinorCurrencyNullable(bridge.recoveredMinor, bridge.currency)} detail={`${formatNumber(financialMetricCaseCount(bridge, 'recovered'))} matched credit records`} tone="recovered" />
          <Metric label="Final net loss" value={finalKnown ? formatMinorCurrencyNullable(bridge.finalNetLossMinor, bridge.currency) : '— Unavailable'} detail={finalKnown ? 'Recorded final stage; period reconciliation is separate' : `${report.reconciliation.confidence.unreconciledExcludedRecordCount} records excluded from this equation`} tone={finalKnown ? 'loss' : 'unavailable'} />
        </div>
      </section>
      <WeeklyChart bridge={bridge} report={report} />
      <section className="named-financial-card" aria-labelledby={`pilot-value-${bridge.currency}`}>
        <div className="named-financial-head"><div><h2 id={`pilot-value-${bridge.currency}`}>Pilot value report</h2><p>{pilotValue.formula}. Only cited terms are included; missing cost terms are not assumed to be zero.</p></div><span>{bridge.currency}</span></div>
        <div className="named-financial-metrics">
          {pilotValue.terms.map((term) => <Metric key={term.key} label={term.label} value={term.known ? formatMinorCurrencyNullable(term.amountMinor, term.currency) : '— Unavailable'} detail={term.evidence ?? 'No evidence source is recorded for this term'} tone={term.known ? undefined : 'unavailable'} />)}
          <Metric label="Net pilot value" value={pilotValue.netValueMinor == null ? '— Unavailable' : formatMinorCurrencyNullable(pilotValue.netValueMinor, pilotValue.currency)} detail={pilotValue.limitation ?? 'All terms are evidence-backed'} tone={pilotValue.complete ? 'recovered' : 'unavailable'} />
        </div>
      </section>
    </div>;
  })}
  <div className="text-[11px] leading-[1.45] text-[#64686d]">
    <section><h2>How this report was run</h2><dl><div><dt>Run mode</dt><dd>On demand, at open</dd></div><div><dt>Generated</dt><dd>{formatDateTime(report.generatedAt)} · {report.timezone}</dd></div><div><dt>Scope</dt><dd>{report.range} · {selectedCurrency ?? 'currencies separated'}</dd></div><div><dt>Measure</dt><dd>Exact amount, calculated without rounding error, formatted per currency</dd></div><div><dt>Excluded</dt><dd>{report.reconciliation.confidence.excludedRecordCount} records failed report contracts</dd></div></dl></section>
    <section><h2>Saving, owner and delivery</h2><div className="rounded-xl border border-[#e4e3e0] bg-white p-6 text-center text-[#64686d]"><strong>Unavailable</strong><p>A persisted report owner, schedule and email delivery need a saved-report backend, which is not connected. Nothing is queued and no recipient will receive this report.</p></div><div className="flex flex-wrap gap-2"><ExportMenu range={report.range} timezone={report.timezone} currency={selectedCurrency} triggerLabel="Export CSV" /></div></section>
  </div>
  <section className="named-supporting"><div><h2>Supporting records</h2><p>{formatNumber(report.recordCount)} immutable records produced these figures, exportable at this exact scope.</p></div><ButtonLink href={recordsHref} variant="primary" size="sm">Open supporting records</ButtonLink></section>
  <style>{`
    .named-financial-report,.named-financial-currency{display:flex;flex-direction:column;gap:12px}.named-financial-card,.named-financial-report>section{overflow:hidden;border:1px solid #e4e3e0;border-radius:12px;background:#fff}.named-financial-head,.named-financial-report>section>header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:13px 15px;border-bottom:1px solid #eae8e5}.named-financial-head h2,.named-financial-report section h2{margin:0;font-size:12.5px;font-weight:600}.named-financial-head p,.named-financial-report section header p{margin:3px 0 0;color:#64686d;font-size:10.5px;line-height:1.45}.named-financial-head>span{color:#6f6a63;font:400 10px/1.4 'IBM Plex Mono',monospace}.named-financial-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:#e4e3e0;gap:1px}.named-financial-metric{min-width:0;padding:13px 15px;background:#fff}.named-financial-metric span,.named-financial-metric small{display:block;color:#64686d;font-size:10.5px}.named-financial-metric strong{display:block;margin:7px 0 5px;font:400 18px/1 'IBM Plex Mono',monospace}.named-financial-metric strong[data-tone="loss"]{color:#b0431a}.named-financial-metric strong[data-tone="recovered"]{color:#1a6b43}.named-financial-metric strong[data-tone="unavailable"]{color:#6f6a63;font-size:14px}.named-week-bars{height:170px;display:flex;align-items:stretch;gap:10px;padding:16px 18px 10px}.named-week-bucket{flex:1;min-width:0;display:grid;grid-template-rows:1fr auto;gap:7px}.named-week-bucket>div{display:flex;align-items:flex-end;justify-content:center;gap:3px;border-bottom:1px solid #d8d4cf}.named-week-bucket i{width:13px;border-radius:3px 3px 0 0}.named-week-bucket i[data-tone="loss"]{background:#b0431a}.named-week-bucket i[data-tone="recovered"]{background:#315e8a}.named-week-bucket small{text-align:center;color:#6f6a63;font-size:8.5px}.named-financial-report section>footer{display:flex;gap:14px;padding:0 16px 12px;color:#64686d;font-size:10px}.named-financial-report section>footer i{display:inline-block;width:7px;height:7px;margin-right:5px;border-radius:2px}.named-financial-report section>footer i[data-tone="loss"]{background:#b0431a}.named-financial-report section>footer i[data-tone="recovered"]{background:#315e8a}.named-financial-report>.text-\\[11px\\]{display:grid;grid-template-columns:1fr 1fr;gap:12px}.named-financial-report>.text-\\[11px\\]>section{padding:14px}.named-financial-report dl{margin:10px 0 0}.named-financial-report dl>div{display:grid;grid-template-columns:90px 1fr;padding:6px 0;border-top:1px solid #eae8e5}.named-financial-report dt{color:#6f6a63}.named-financial-report dd{margin:0;color:#40454a}.named-supporting{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:13px 15px}.named-supporting h2{margin:0;font-size:12.5px}.named-supporting p{margin:3px 0 0;color:#64686d;font-size:10.5px}@media(max-width:1100px){.named-financial-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `}</style>
  </div>;
}
