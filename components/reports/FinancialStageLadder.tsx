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
  { metric: 'recovered', label: 'Received and matched', group: 'Recovery · receipt-backed; period reconciliation is separate', tone: 'recovered' },
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
    <section aria-label={`${bridge.currency} financial stages`} style={{ overflow: 'hidden', border: '1px solid #e4e3e0', borderRadius: 11, background: '#fff' }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, padding: '12px 15px', borderBottom: '1px solid #eae8e5' }}>
        <div><h2 style={{ margin: 0, fontSize: 12.5, lineHeight: 1.35, fontWeight: 500 }}>How did requested value become final net loss?</h2><p style={{ margin: '4px 0 0', color: '#6f6a63', fontSize: 10.5, lineHeight: 1.45 }}>Every stage is a separate recorded fact. Nothing is inferred from the stage above it.</p></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ padding: '4px 7px', borderRadius: 6, background: '#f4f3f1', font: "500 10px/1 'IBM Plex Mono',monospace" }}>{bridge.currency}</span><Link style={{ color: '#9f4f08', fontSize: 10.5, textDecoration: 'none', whiteSpace: 'nowrap' }} href={financialReportRecordsHref({ range: report.range, currency: bridge.currency, metric: 'requested', timezone: report.timezone, from: report.financialScope?.from ?? undefined, to: report.financialScope?.to })}>{formatNumber(bridge.caseIds.length)} supporting cases</Link></div>
      </header>
      <div role="table" aria-label={`${bridge.currency} stage ladder`} style={{ width: '100%', fontSize: 10.5 }}>
        <div role="row" style={stageHeadStyle}><span role="columnheader">Stage</span><span role="columnheader">Share of requested value</span><span role="columnheader">Amount {bridge.currency}</span><span role="columnheader">Basis</span><span role="columnheader">Records</span></div>
        {STAGES.map((stage, index) => {
          const groupChanged = index === 0 || stage.group !== STAGES[index - 1].group;
          const finalUnreconciled = stage.metric === 'final_net_loss' && !report.reconciliation.ok;
          const reconciledFinal = !finalUnreconciled;
          const noWrittenOffRecords = stage.metric === 'written_off' && financialMetricCaseCount(bridge, 'written_off') === 0;
          const known = (financialMetricIsKnown(bridge, stage.metric) || noWrittenOffRecords) && reconciledFinal;
          const value = known ? financialMetricValue(bridge, stage.metric) ?? 0 : 0;
          const width = known && requested > 0 ? Math.min(100, Math.max(value > 0 ? 0.7 : 0, value / requested * 100)) : 0;
          const href = financialReportRecordsHref({ range: report.range, currency: bridge.currency, metric: stage.metric, timezone: report.timezone, from: report.financialScope?.from ?? undefined, to: report.financialScope?.to });
          return <div key={stage.metric} role="rowgroup">
            {groupChanged ? <div style={{ padding: '7px 14px', borderTop: '1px solid #eae8e5', background: '#ffffff', color: '#6f6a63', font: "600 9px/1.2 'Inter',sans-serif", letterSpacing: '.07em', textTransform: 'uppercase' }}>{stage.group}</div> : null}
            <div role="row" style={{ ...stageRowStyle, background: stage.metric === 'final_net_loss' ? '#fff3e9' : '#fff' }}>
              <span role="cell" style={{ color: '#40454a', fontWeight: stage.metric === 'final_net_loss' ? 500 : 400 }}>{stage.label}</span>
              {finalUnreconciled ? (
                <span role="cell" style={{ color: '#b0431a', fontSize: 9.5 }}>Cannot be computed — unreconciled</span>
              ) : (
                <span role="cell" style={{ position: 'relative', height: 5, overflow: 'hidden', borderRadius: 3, background: '#e4e3e0' }}><i style={{ display: 'block', width: `${width}%`, height: '100%', borderRadius: 3, background: stage.tone === 'red' ? '#b0431a' : stage.tone === 'recovered' || stage.tone === 'prevented' ? '#1a6b43' : stage.tone === 'amber' ? '#7a5310' : '#40454a' }} /></span>
              )}
              <strong role="cell" style={{ font: "500 10.5px/1 'IBM Plex Mono',monospace", color: known ? '#1c1f23' : '#6f6a63' }}>{noWrittenOffRecords ? '— No records' : known ? formatMinorCurrencyNullable(value, bridge.currency) : '— Unavailable'}</strong>
              <span role="cell" style={{ color: '#6f6a63' }}>{finalUnreconciled ? 'Unreconciled' : noWrittenOffRecords ? 'None in range' : basis(stage.metric, value, requested, loss, recoverable, known)}</span>
              <span role="cell" style={{ textAlign: 'right', color: '#6f6a63' }}>{finalUnreconciled ? <Link style={stageLinkStyle} href="/financials/reconciliation">Resolve</Link> : noWrittenOffRecords ? '0' : known && financialMetricCaseCount(bridge, stage.metric) > 0 ? <Link style={stageLinkStyle} href={href}>{formatNumber(financialMetricCaseCount(bridge, stage.metric))}</Link> : '—'}</span>
            </div>
          </div>;
        })}
      </div>
    </section>
  );
}

export function FinancialStageLadder({ report }: { report: IntelligenceReport }) {
  if (!report.bridges.length) return <section className="rounded-xl border border-[#e4e3e0] bg-white p-6 text-center text-[#64686d]"><h2>Financial stages are unavailable</h2><p>No verified financial history exists for this scope. Unavailable values have not been replaced with zero.</p></section>;
  return <div style={{ display: 'grid', gap: 12 }}>{report.bridges.map((bridge) => <CurrencyLadder key={bridge.currency} bridge={bridge} report={report} />)}</div>;
}

const stageHeadStyle = { display: 'grid', gridTemplateColumns: 'minmax(130px,1fr) minmax(150px,1.4fr) 110px 110px 50px', gap: 12, alignItems: 'center', minWidth: 650, padding: '8px 14px', color: '#6f6a63', font: "500 9px/1.2 'IBM Plex Mono',monospace", textTransform: 'uppercase' } as const;
const stageRowStyle = { display: 'grid', gridTemplateColumns: 'minmax(130px,1fr) minmax(150px,1.4fr) 110px 110px 50px', gap: 12, alignItems: 'center', minWidth: 650, minHeight: 34, padding: '7px 14px', borderTop: '1px solid #f4f2ef' } as const;
const stageLinkStyle = { color: '#9f4f08', textDecoration: 'none' } as const;
