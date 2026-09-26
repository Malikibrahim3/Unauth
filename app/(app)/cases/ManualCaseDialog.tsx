'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type ManualCaseDialogProps = { open: boolean };

const fieldStyle = {
  width: '100%',
  minHeight: 36,
  padding: '0 10px',
  border: '1px solid #e4e3e0',
  borderRadius: 8,
  background: '#fff',
  color: '#1c1f23',
  font: "400 12px/1.4 'Inter',sans-serif",
  outline: 'none',
} as const;
const labelStyle = { display: 'grid', gap: 5, color: '#64686d', font: "500 10.5px/1.4 'Inter',sans-serif" } as const;

function CloseGlyph() { return <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7"/></svg>; }

export function ManualCaseDialog({ open }: ManualCaseDialogProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (!busy) router.replace('/cases');
  }

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) router.replace('/cases'); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [busy, open, router]);

  async function submit(form: HTMLFormElement) {
    setBusy(true);
    setError(null);
    const data = new FormData(form);
    const amount = String(data.get('amount') ?? '').trim();
    const payload: Record<string, unknown> = {
      customerName: String(data.get('customerName') ?? '').trim() || undefined,
      customerEmail: String(data.get('customerEmail') ?? '').trim() || undefined,
      orderReference: String(data.get('orderReference') ?? '').trim() || undefined,
      issueType: String(data.get('issueType') ?? 'other'),
      requestedAction: String(data.get('requestedAction') ?? 'unknown'),
      currency: String(data.get('currency') ?? 'GBP').trim().toUpperCase() || undefined,
      note: String(data.get('note') ?? '').trim() || undefined,
      ...(amount ? { amountMinor: Math.round(Number(amount) * 100) } : {}),
    };
    try {
      const response = await fetch('/api/claims/manual', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': `manual-case:${crypto.randomUUID()}` },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body.caseId !== 'string') {
        throw new Error(typeof body.error === 'string' ? body.error : 'The manual case could not be created.');
      }
      router.replace(`/cases?selected=${encodeURIComponent(body.caseId)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The manual case could not be created.');
      setBusy(false);
    }
  }

  if (!open) return null;
  return (
    <div role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) close(); }} style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(28,27,25,.25)' }}>
      <section role="dialog" aria-modal="true" aria-labelledby="manual-case-title" data-overlay-id="new-manual-case" style={{ width: '100%', maxWidth: 560, maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', borderRadius: 12, background: '#fff', boxShadow: '0 24px 60px rgba(28,27,25,.22),0 0 0 1px rgba(28,27,25,.08)' }}>
        <header style={{ padding: '17px 18px 14px', display: 'flex', alignItems: 'flex-start', gap: 12, borderBottom: '1px solid #eae8e5' }}>
          <div style={{ flex: 1 }}><div style={{ color: '#64686d', font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.06em' }}>MANUAL INTAKE</div><h2 id="manual-case-title" style={{ margin: '6px 0 0', color: '#1c1f23', font: "500 15px/1.3 'Inter',sans-serif" }}>New case</h2><p style={{ margin: '4px 0 0', color: '#64686d', font: "400 11px/1.45 'Inter',sans-serif" }}>Create a review record. An unmatched order remains explicitly unmatched.</p></div>
          <button type="button" onClick={close} disabled={busy} aria-label="Close new case" style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', border: 0, borderRadius: 7, background: '#f4f3f1', cursor: busy ? 'not-allowed' : 'pointer' }}><CloseGlyph/></button>
        </header>
        <form onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }} style={{ padding: '16px 18px 18px', display: 'grid', gap: 13 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={labelStyle}>Customer name<input name="customerName" style={fieldStyle} autoComplete="name"/></label>
            <label style={labelStyle}>Customer email<input name="customerEmail" type="email" style={fieldStyle} autoComplete="email"/></label>
          </div>
          <label style={labelStyle}>Order reference · optional<input name="orderReference" style={{ ...fieldStyle, fontFamily: "'IBM Plex Mono',monospace" }} placeholder="ALG-10482"/></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={labelStyle}>Issue type<select name="issueType" defaultValue="other" style={fieldStyle}><option value="item_not_received">Item not received</option><option value="damaged">Damaged</option><option value="wrong_item">Wrong item</option><option value="not_as_described">Not as described</option><option value="refund_request">Refund request</option><option value="chargeback">Chargeback</option><option value="return_abuse">Return abuse</option><option value="other">Other</option></select></label>
            <label style={labelStyle}>Requested action<select name="requestedAction" defaultValue="unknown" style={fieldStyle}><option value="refund">Refund</option><option value="reship">Reship</option><option value="replacement">Replacement</option><option value="discount">Discount</option><option value="store_credit">Store credit</option><option value="investigation">Investigation</option><option value="unknown">Unknown</option></select></label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 96px', gap: 10 }}>
            <label style={labelStyle}>Value at issue · optional<input name="amount" type="number" min="0" step="0.01" inputMode="decimal" style={{ ...fieldStyle, fontFamily: "'IBM Plex Mono',monospace" }}/></label>
            <label style={labelStyle}>Currency<input name="currency" defaultValue="GBP" maxLength={3} style={{ ...fieldStyle, fontFamily: "'IBM Plex Mono',monospace", textTransform: 'uppercase' }}/></label>
          </div>
          <label style={labelStyle}>Review note<textarea name="note" rows={3} style={{ ...fieldStyle, minHeight: 70, padding: '8px 10px', resize: 'vertical' }} placeholder="What prompted this manual review?"/></label>
          {error ? <p role="alert" style={{ margin: 0, color: '#b0431a', font: "400 11px/1.45 'Inter',sans-serif" }}>{error}</p> : null}
          {busy ? <p role="status" style={{ margin: 0, color: '#64686d', font: "400 10.5px/1.45 'IBM Plex Mono',monospace" }}>Creating the case and recording its source boundary…</p> : null}
          <footer style={{ margin: '2px -18px -18px', padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #eae8e5' }}><button type="button" onClick={close} disabled={busy} style={{ padding: '8px 12px', border: 0, borderRadius: 8, background: '#f4f3f1', color: '#40454a', font: "500 11.5px/1 'Inter',sans-serif", cursor: busy ? 'not-allowed' : 'pointer' }}>Cancel</button><button type="submit" disabled={busy} style={{ padding: '8px 12px', border: 0, borderRadius: 8, background: '#1c1f23', color: '#fff', font: "500 11.5px/1 'Inter',sans-serif", cursor: busy ? 'not-allowed' : 'pointer' }}>{busy ? 'Creating…' : 'Create case'}</button></footer>
        </form>
      </section>
    </div>
  );
}
