'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import type { RuleImpact, ImpactDays } from '@/lib/rules/impact';
import { formatMoney, formatDateAbsolute, formatTimeInTimeZone } from '@/lib/utils/format';

export type ImpactResponse = RuleImpact & { window: { startAt: string; endAt: string; timezone: string }; impactToken: string; notice: string };
const button = { padding: '8px 12px', border: '1px solid #e4e3e0', borderRadius: 9, background: '#fff', color: '#1c1f23', cursor: 'pointer' } as const;
export function RuleImpactPreview({ endpoint = '/api/rules/preview', proposal, disabled = false, onPreview }: {
  endpoint?: string; proposal: Record<string, unknown>; disabled?: boolean; onPreview?: (result: ImpactResponse | null) => void;
}) {
  const [days, setDays] = useState<ImpactDays>(30);
  const [result, setResult] = useState<{ key: string; body: ImpactResponse } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const key = JSON.stringify({ proposal, days });
  const currentKey = useRef(key);
  currentKey.current = key;
  const previousKey = useRef(key);
  const hasPreview = useRef(false);
  const callback = useRef(onPreview);
  callback.current = onPreview;
  const [invalidated, setInvalidated] = useState(false);
  useEffect(() => {
    if (previousKey.current === key) return;
    previousKey.current = key;
    if (hasPreview.current) { setResult(null); setInvalidated(true); callback.current?.(null); }
  }, [key]);
  const body = result?.key === key ? result.body : null;
  async function preview() {
    const requestKey = key;
    setBusy(true); setError(null); onPreview?.(null);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...proposal, days }) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error ?? 'Preview unavailable. Try again.');
      if (currentKey.current === requestKey) { hasPreview.current = true; setInvalidated(false); setResult({ key: requestKey, body: value }); setPage(0); onPreview?.(value); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Preview unavailable.'); }
    finally { setBusy(false); }
  }
  return <section aria-label="Current-evidence policy preview" style={{ padding: 12, borderRadius: 10, background: '#f4f3f1', color: '#40454a', font: "400 12px/1.5 'Inter',sans-serif" }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      <label>Cases submitted in the last <select aria-label="Preview period" value={days} onChange={event => { setDays(Number(event.target.value) as ImpactDays); onPreview?.(null); }} style={button}>{[7, 30, 90].map(value => <option key={value} value={value}>{value} days</option>)}</select></label>
      <button type="button" style={button} disabled={busy || disabled} onClick={() => void preview()}>{busy ? 'Evaluating…' : 'Preview impact'}</button>
    </div>
    <p>Compare the complete published policy with this proposal using current evidence. Recommendations remain separate from merchant decisions.</p>
    {error ? <p role="alert">{error}</p> : null}
    {invalidated || (result && !body) ? <p role="status">The proposal changed. Run Preview impact again.</p> : null}
    {body ? <div aria-live="polite">
      <p>Cases submitted from <time dateTime={body.window.startAt}>{`${formatDateAbsolute(body.window.startAt)} ${formatTimeInTimeZone(body.window.startAt, body.window.timezone)}`}</time> to before <time dateTime={body.window.endAt}>{`${formatDateAbsolute(body.window.endAt)} ${formatTimeInTimeZone(body.window.endAt, body.window.timezone)}`}</time> · {body.window.timezone}</p>
      <p>{body.evaluatedCount} evaluated · {body.changedCount} changed · {body.unchangedCount} unchanged · {body.insufficientEvidenceCount} insufficient evidence</p>
      {body.evaluatedCount === 0 ? <p>No cases in this scope. An initial policy without cases needs a separate acknowledgement at publication.</p> : null}
      <p>Affected exposure: {Object.entries(body.affectedExposureMinor).map(([currency, amount]) => `${formatMoney(amount, currency)} ${currency}`).join(' · ') || 'No valued definite changes'}. {body.unvaluedChangedCases} changed cases have unavailable exposure. This is not savings.</p>
      <p>Recommendation counts below exclude uncertain comparisons.</p>
      <table style={{ width: '100%', textAlign: 'left' }}><caption>Before and after recommendations</caption><thead><tr><th>Recommendation</th><th>Before</th><th>After</th></tr></thead><tbody>{Object.entries(body.before).map(([action, count]) => <tr key={action}><th scope="row">{action.replaceAll('_', ' ')}</th><td>{count}</td><td>{body.after[action as keyof typeof body.after]}</td></tr>)}</tbody></table>
      <div style={{ overflowX: 'auto', marginTop: 12 }}><table style={{ width: '100%', textAlign: 'left' }}><caption>Case evidence and recommendation changes</caption><thead><tr><th>Case</th><th>Result</th><th>Before</th><th>After</th></tr></thead><tbody>{body.rows.slice(page * 50, (page + 1) * 50).map(row => <tr key={row.id} style={{ verticalAlign: 'top' }}><td><Link href={row.href} prefetch={false}>{row.id.slice(0, 8)}</Link></td><td>{row.state.replaceAll('_', ' ')}{row.missingInputs.length ? <p>Missing: {row.missingInputs.join(', ')}</p> : null}</td><td>{row.before.recommendation.replaceAll('_', ' ')}<p>{row.before.justification}</p></td><td>{row.after.recommendation.replaceAll('_', ' ')}<p>{row.after.justification}</p></td></tr>)}</tbody></table></div>
      {body.rows.length > 50 ? <nav aria-label="Preview pages" style={{ display: 'flex', gap: 12, alignItems: 'center' }}><button type="button" style={button} disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1} of {Math.ceil(body.rows.length / 50)}</span><button type="button" style={button} disabled={(page + 1) * 50 >= body.rows.length} onClick={() => setPage(page + 1)}>Next</button></nav> : null}
      <p>{body.notice}</p>
    </div> : null}
  </section>;
}
