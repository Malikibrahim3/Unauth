'use client';

import { useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { formatMoneyOrDash } from '@/lib/utils/format';

type Blocker = {
  id: string;
  title: string;
  detail: string;
  amountMinor: number | null;
};

function money(value: number | null, currency: string | null) {
  return value == null || !currency ? 'Unavailable' : formatMoneyOrDash(value, currency);
}

export function PeriodCloseOverlay({
  period,
  label,
  currency,
  settlementCount,
  recordedLossMinor,
  recoveredMinor,
  varianceMinor,
  blockers,
  canClose,
  window,
  closeBlockedReasons,
}: {
  period: string;
  label: string;
  currency: string | null;
  settlementCount: number | null;
  recordedLossMinor: number | null;
  recoveredMinor: number | null;
  varianceMinor: number | null;
  blockers: Blocker[];
  canClose: boolean;
  window: { from: string; to: string; timezone: string };
  closeBlockedReasons: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [carry, setCarry] = useState(true);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const key = useRef(`period-close:${period}:${globalThis.crypto?.randomUUID?.() ?? Date.now()}`);
  const confirmationWord = useMemo(() => label.split(' ')[0]?.toUpperCase() ?? period, [label, period]);
  const complete = carry && confirmation.trim().toUpperCase() === confirmationWord;
  const closeAvailable = canClose && closeBlockedReasons.length === 0;

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('action');
    router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
  }

  async function submit() {
    if (!closeAvailable) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/financial-periods/${encodeURIComponent(period)}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key.current },
        body: JSON.stringify({
          acknowledgedBlockerIds: blockers.map((blocker) => blocker.id),
          note: `Carry open reconciliation variance into the next period; confirmed by typing ${confirmationWord}.`,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Period close failed before commit.');
      setReceipt(`Period ${period} closed. The append-only sign-off receipt is recorded.`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Period close failed before commit.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-screen-label="Close period" data-overlay-id="period-close" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) close(); }} style={{ position: 'fixed', inset: 0, zIndex: 94, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: 'rgba(34,29,23,.30)' }}>
      <section role="dialog" aria-modal="true" aria-labelledby="period-close-title" style={{ width: 660, maxWidth: 'calc(100vw - 40px)', maxHeight: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 14, background: '#fff', boxShadow: '0 30px 70px rgba(28,22,14,.34),0 2px 8px rgba(28,22,14,.18)' }}>
        <header style={{ padding: '17px 18px 15px', borderBottom: '1px solid #eae8e5', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}><div id="period-close-title" style={{ font: "500 15px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>Close {label}</div><div style={{ marginTop: 4, font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>Closing records an append-only period sign-off. Reopening a closed period requires an authorised correction, not an edit to this receipt.</div><div style={{ marginTop: 4, font: "400 9.5px/1.45 'IBM Plex Mono',monospace", color: '#64686d' }}>{window.from} inclusive → {window.to} exclusive · {window.timezone}</div></div>
          <button type="button" aria-label="Close period dialog" disabled={busy} onClick={close} style={{ width: 18, height: 18, padding: 0, border: 0, background: 'transparent', cursor: busy ? 'wait' : 'pointer' }}><svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4"/></svg></button>
        </header>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
          <section style={{ padding: 11, borderRadius: 12, background: '#f4f3f1', display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '1px 3px 0' }}><span style={{ flex: 1, font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>WHAT YOU ARE SIGNING OFF</span><span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>as it stands right now</span></div>
            <div style={{ padding: '12px 13px', borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Settlements', settlementCount == null ? 'Unavailable' : String(settlementCount), '#1c1f23'],
                ['Recorded loss', money(recordedLossMinor, currency), '#1c1f23'],
                ['Received and matched', money(recoveredMinor, currency), '#1a6b43'],
                ['Unexplained variance', varianceMinor == null ? 'Unavailable' : `−${money(Math.abs(varianceMinor), currency)}`, '#b0431a'],
                ['Adjustments posted', 'Unavailable', '#7a5310'],
              ].map(([factLabel, value, color]) => <div key={factLabel} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}><span style={{ flex: 1, font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>{factLabel}</span><span style={{ textAlign: 'right', font: "400 12px/1.5 'IBM Plex Mono',monospace", color }}>{value}</span></div>)}
            </div>
          </section>

          {closeBlockedReasons.length ? <section role="alert" style={{ padding: 11, borderRadius: 12, background: '#fdf0e6', display: 'flex', flexDirection: 'column', gap: 6 }}><strong style={{ font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#b0431a' }}>CLOSE BLOCKED</strong>{closeBlockedReasons.map((reason) => <span key={reason} style={{ font: "400 11.5px/1.45 'Inter',sans-serif", color: '#7a5310' }}>{reason}</span>)}</section> : null}

          <section style={{ padding: 11, borderRadius: 12, background: '#f4f3f1', display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '1px 3px 0' }}><span style={{ flex: 1, font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>{blockers.length ? `${blockers.length} ${blockers.length === 1 ? 'THING IS' : 'THINGS ARE'} STILL OPEN` : 'NO OPEN BLOCKERS'}</span><span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>closing does not resolve them</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {blockers.length ? blockers.slice(0, 3).map((blocker) => <div key={blocker.id} style={{ padding: '11px 12px', borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', display: 'flex', alignItems: 'flex-start', gap: 10 }}><span style={{ width: 6, height: 6, flex: 'none', marginTop: 5, borderRadius: '50%', background: '#b0431a' }}/><div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ flex: 1, font: "500 12.5px/1.4 'Inter',sans-serif", color: '#1c1f23' }}>{blocker.title}</span><span style={{ padding: '2px 7px', borderRadius: 5, background: '#fdf0e6', font: "500 10px/1.5 'Inter',sans-serif", color: '#b0431a' }}>{money(blocker.amountMinor, currency)}</span></div><div style={{ marginTop: 3, font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>{blocker.detail}</div></div></div>) : <div style={{ padding: '11px 12px', borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#1a6b43' }}>The current scoped query has no open reconciliation exceptions.</div>}
            </div>
          </section>

          <section style={{ padding: 11, borderRadius: 12, background: '#f4f3f1', display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '1px 3px 0' }}><span style={{ flex: 1, font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>CONFIRM THE CARRY-OVER</span><span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>required to close with an open variance</span></div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer' }}><input type="checkbox" checked={carry} onChange={(event) => setCarry(event.target.checked)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}/><span style={{ width: 14, height: 14, flex: 'none', marginTop: 1, borderRadius: 4, background: carry ? '#1c1f23' : '#fff', boxShadow: carry ? undefined : 'inset 0 0 0 1.3px rgba(28,27,25,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{carry ? <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 5.2 4.1 7.3 8 3.2"/></svg> : null}</span><span style={{ flex: 1 }}><span style={{ display: 'block', font: "400 12px/1.45 'Inter',sans-serif", color: '#1c1f23' }}>Carry {varianceMinor == null ? 'the unresolved variance' : `−${money(Math.abs(varianceMinor), currency)}`} into the next period as unexplained variance</span><span style={{ display: 'block', marginTop: 2, font: "400 11px/1.45 'Inter',sans-serif", color: '#64686d' }}>It stays visible with its original period and is not silently resolved.</span></span></label>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}><label style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}><span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.05em', color: '#64686d' }}>TYPE {confirmationWord} TO CONFIRM</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} style={{ padding: '7px 9px', border: 0, outline: 0, borderRadius: 8, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', font: "400 12px/1.3 'Inter',sans-serif", color: '#1c1f23' }}/></label></div>
          </section>
          {receipt ? <div role="status" style={{ padding: '10px 12px', borderRadius: 10, background: '#eef6f1', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#1a6b43' }}>{receipt}</div> : null}
          {error ? <div role="alert" style={{ padding: '10px 12px', borderRadius: 10, background: '#fdf0e6', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#b0431a' }}>{error}</div> : null}
        </div>

        <footer style={{ padding: '13px 18px', borderTop: '1px solid #eae8e5', background: '#ffffff', display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ flex: 1, minWidth: 0, font: "400 10.5px/1.45 'IBM Plex Mono',monospace", color: '#64686d' }}>{!canClose ? 'your role cannot close financial periods' : closeBlockedReasons.length ? 'complete the blocked checks before closing' : 'Closing is logged against the authorised operator'}</span><button type="button" disabled={busy} onClick={close} style={{ padding: '7px 12px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', font: "400 12.5px/1 'Inter',sans-serif", color: '#40454a', cursor: busy ? 'wait' : 'pointer' }}>Cancel</button><button type="button" disabled={!closeAvailable || !complete || busy || Boolean(receipt)} onClick={() => void submit()} style={{ padding: '7px 13px', border: 0, borderRadius: 9, background: closeAvailable && complete && !busy && !receipt ? '#1c1f23' : '#f2f0ed', boxShadow: closeAvailable && complete && !busy && !receipt ? undefined : 'inset 0 0 0 1px rgba(28,27,25,.06)', color: closeAvailable && complete && !busy && !receipt ? '#fff' : '#64686d', font: "500 12.5px/1 'Inter',sans-serif", cursor: closeAvailable && complete && !busy && !receipt ? 'pointer' : 'not-allowed' }}>{busy ? 'Closing…' : 'Close period'}</button></footer>
      </section>
    </div>
  );
}
