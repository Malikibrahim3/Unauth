'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMinorCurrencyNullable } from '@/lib/utils/format';

const textButton = {
  border: 0,
  background: 'transparent',
  font: "400 12.5px/1 'Inter',sans-serif",
  color: '#40454a',
  cursor: 'pointer',
} as const;

export function LossActions({
  lossId,
  reference,
  canManage,
  writeOffAmountMinor,
  grossExposureMinor,
  recoveredMinor,
  currency,
  recoverySummary,
  writeOffState,
  compact = false,
}: {
  lossId: string;
  reference?: string;
  canManage: boolean;
  writeOffAmountMinor: number | null;
  grossExposureMinor?: number | null;
  recoveredMinor?: number | null;
  currency: string | null;
  recoverySummary?: string | null;
  writeOffState: 'available' | 'already_written_off' | 'unavailable' | 'no_outstanding' | 'mixed_currency';
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rationale, setRationale] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const displayReference = reference ?? lossId;
  const writeOffValue = writeOffAmountMinor == null || !currency
    ? 'amount unavailable'
    : formatMinorCurrencyNullable(writeOffAmountMinor, currency);
  const grossValue = grossExposureMinor == null || !currency
    ? 'Unavailable'
    : formatMinorCurrencyNullable(grossExposureMinor, currency);
  const recoveredValue = recoveredMinor == null || !currency
    ? 'Unavailable'
    : formatMinorCurrencyNullable(recoveredMinor, currency);

  function compactState(message: string) {
    return <span style={{ font: "400 10.5px/1.45 'IBM Plex Mono',monospace", color: '#64686d' }} title={message}>{message}</span>;
  }

  if (!canManage) {
    return compact ? compactState('Read-only access') : <p style={{ margin: 0, font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>You have read-only access to this loss.</p>;
  }
  if (writeOffState === 'already_written_off') {
    return compact ? compactState('Write-off recorded') : <p style={{ margin: 0, font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>Write-off already recorded for this loss.</p>;
  }
  if (writeOffState === 'no_outstanding') {
    return compact ? compactState('Nothing to write off') : <p style={{ margin: 0, font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>No outstanding recovery remains to write off.</p>;
  }
  if (writeOffState === 'unavailable') {
    return compact ? compactState('Write-off basis unavailable') : <p style={{ margin: 0, font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>Write-off is unavailable until an outstanding recovery amount is reconciled.</p>;
  }
  if (writeOffState === 'mixed_currency') {
    return compact ? compactState('Mixed-currency write-off unavailable') : <p style={{ margin: 0, font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>Write-off is unavailable for a mixed-currency loss.</p>;
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/losses/${lossId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'write_off',
          rationale,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) {
        setError(body.error ?? 'Write-off failed');
        return;
      }
      setOpen(false);
      setReceipt('Write-off entry recorded. The original loss and recovery history remain unchanged.');
      router.refresh();
    } catch {
      setError('Write-off could not be recorded. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => { setError(null); setOpen(true); }}
          style={{
            padding: compact ? '6px 11px' : '7px 13px',
            border: 0,
            borderRadius: 9,
            background: '#fff',
            boxShadow: 'inset 0 0 0 1px rgba(176,67,26,.35)',
            font: "500 12.5px/1 'Inter',sans-serif",
            color: '#b0431a',
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          {compact ? 'Write off' : 'Write off outstanding'}
        </button>
        {receipt ? <span role="status" style={{ maxWidth: 270, font: "400 10.5px/1.4 'Inter',sans-serif", color: '#1a6b43' }}>{receipt}</span> : null}
      </div>

      {open ? (
        <div
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: 'rgba(34,29,23,.30)' }}
        >
          <section
            id="write-off-outstanding-recovery-modal"
            data-overlay-id="write-off-outstanding-recovery-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="write-off-title"
            style={{ width: 620, maxWidth: 'calc(100vw - 40px)', maxHeight: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 14, background: '#fff', boxShadow: '0 30px 70px rgba(28,22,14,.34),0 2px 8px rgba(28,22,14,.18)' }}
          >
            <header style={{ padding: '17px 18px 15px', borderBottom: '1px solid #eae8e5', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div id="write-off-title" style={{ font: "500 15px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>Write off {displayReference}</div>
                <div style={{ marginTop: 4, font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>
                  This records that your workspace absorbed {writeOffValue}. It does not close an open partner claim, and it cannot be undone — only corrected by a later entry.
                </div>
              </div>
              <button type="button" aria-label="Close write-off dialog" disabled={busy} onClick={() => setOpen(false)} style={{ ...textButton, width: 18, height: 18, padding: 0, display: 'grid', placeItems: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4"/></svg>
              </button>
            </header>

            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
              {error ? <div role="alert" style={{ padding: '10px 12px', borderRadius: 10, background: '#fdf0e6', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#b0431a' }}>{error}</div> : null}
              <section style={{ padding: 11, borderRadius: 12, background: '#f4f3f1', display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div style={{ padding: '1px 3px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1, font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>WHAT IS STILL OUTSTANDING</span>
                  <span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>as it stands right now</span>
                </div>
                <div style={{ padding: '12px 13px', borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    ['Gross exposure', grossValue, '#1c1f23'],
                    ['Recovered so far', recoveredValue, '#64686d'],
                    ['Open recovery route', recoverySummary ?? 'No open recovery route recorded', '#7a5310'],
                    ['Amount to be written off', writeOffValue, '#b0431a'],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ flex: 1, font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>{label}</span>
                      <span style={{ maxWidth: '62%', textAlign: 'right', font: "400 12px/1.5 'IBM Plex Mono',monospace", color }}>{value}</span>
                    </div>
                  ))}
                </div>
              </section>

              <div style={{ padding: '12px 13px', borderRadius: 12, background: '#fff3e9', display: 'flex', gap: 10 }}>
                <span style={{ width: 6, height: 6, flex: 'none', marginTop: 6, borderRadius: '50%', background: '#c98a1a' }}/>
                <div style={{ flex: 1, font: "400 11.5px/1.55 'Inter',sans-serif", color: '#7a5310' }}>An open recovery can settle after this write-off. That later recovery remains a separate ledger event; it does not edit this entry or the original loss.</div>
              </div>

              <label style={{ padding: 11, borderRadius: 12, background: '#f4f3f1', display: 'flex', flexDirection: 'column', gap: 9 }}>
                <span style={{ padding: '1px 3px 0', font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>REASON · RECORDED ON THE ENTRY</span>
                <textarea
                  required
                  value={rationale}
                  onChange={(event) => setRationale(event.target.value)}
                  placeholder="Explain why this amount is being absorbed now."
                  style={{ minHeight: 54, resize: 'vertical', padding: '9px 11px', border: 0, outline: 0, borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', font: "400 12px/1.5 'Inter',sans-serif", color: '#1c1f23' }}
                />
              </label>
            </div>

            <footer style={{ padding: '13px 18px', borderTop: '1px solid #eae8e5', background: '#ffffff', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ flex: 1, font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d' }}>Adds one ledger entry against your name. The original {grossValue} exposure stays visible.</span>
              <button type="button" disabled={busy} onClick={() => setOpen(false)} style={{ padding: '7px 12px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', font: "400 12.5px/1 'Inter',sans-serif", color: '#40454a', cursor: busy ? 'wait' : 'pointer' }}>Cancel</button>
              <button type="button" disabled={busy || !rationale.trim()} onClick={() => void submit()} style={{ padding: '7px 13px', border: 0, borderRadius: 9, background: busy || !rationale.trim() ? '#a7abad' : '#b0431a', font: "500 12.5px/1 'Inter',sans-serif", color: '#fff', cursor: busy || !rationale.trim() ? 'not-allowed' : 'pointer' }}>
                {busy ? 'Writing off…' : `Write off ${writeOffValue}`}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
