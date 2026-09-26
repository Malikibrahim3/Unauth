import type { CasesFlowSnapshot } from './casesFlow';

export function casesFlowWindow(flow: CasesFlowSnapshot | null): string {
  const days = flow?.daily ?? [];
  return days.length ? `${days[0].label} – ${days.at(-1)!.label} · UTC` : 'Daily window unavailable';
}

/** Both Cases render paths consume the same recorded daily series. */
export function CasesFlowChart({ flow }: { flow: CasesFlowSnapshot | null }) {
  if (!flow?.daily.length) return <p style={{ flex: 1, color: '#64686d', fontSize: 11 }}>Daily case history unavailable.</p>;
  const maximum = Math.max(1, ...flow.daily.flatMap(day => [day.opened, day.closed]));
  return <details style={{ flex: 1, minWidth: 0, color: '#64686d', font: "400 10px/1.4 'Inter',sans-serif" }}>
    <summary style={{ cursor: 'pointer' }} aria-label="Daily case counts">
      <span aria-hidden="true" style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 30 }}>
        {flow.daily.map(day => <span key={day.date} data-case-flow-day={day.date} style={{ flex: 1, height: '100%', position: 'relative' }}>
          <span style={{ position: 'absolute', bottom: 0, width: '100%', height: `${day.opened / maximum * 100}%`, borderRadius: 1.5, background: '#e8802a' }} />
          <span style={{ position: 'absolute', bottom: 0, width: '100%', height: `${day.closed / maximum * 100}%`, borderRadius: 1.5, background: 'rgba(28,27,25,.22)' }} />
        </span>)}
      </span>
      <span>Daily case counts</span>
    </summary>
    <div tabIndex={0} role="region" aria-label="Daily case count table" style={{ maxHeight: 200, overflow: 'auto', marginTop: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <caption>{casesFlowWindow(flow)} · same series as the chart</caption>
        <thead><tr><th scope="col">Date (UTC)</th><th scope="col">Opened</th><th scope="col">Closed</th></tr></thead>
        <tbody>{flow.daily.map(day => <tr key={day.date}><th scope="row">{day.date}</th><td>{day.opened}</td><td>{day.closed}</td></tr>)}</tbody>
      </table>
    </div>
  </details>;
}
