'use client';

import { useEffect, useRef, useState } from 'react';
import type { RecoveryCase } from '@/lib/recoveries/types';
import { formatMinorCurrencyNullable } from '@/lib/utils/format';
import { formatMajorUnitInput, parseMajorUnitInput } from '@/lib/ui/merchantCopy';
import { hashId } from '@/lib/ui/displayRef';
import {
  recoveryActionConsequence,
  type RecoveryActionOption,
} from '@/components/recoveries/recoveryActionOptions';

const sans = "'Inter',sans-serif";
const mono = "'IBM Plex Mono',monospace";

export function RecoveryActionDialog({
  item,
  option,
  open,
  overlayId,
  onClose,
  onRecorded,
}: {
  item: RecoveryCase | null;
  option: RecoveryActionOption | null;
  open: boolean;
  overlayId: 'confirm-recovery-action-modal' | 'recovery-detail-action-modal';
  onClose: () => void;
  onRecorded: (item: RecoveryCase, message: string) => void;
}) {
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryKeysRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!open || !item || !option) return;
    setNote('');
    setError(null);
    setAmount(option.amountKind === 'approved'
      ? formatMajorUnitInput(item.amount_sought_minor, item.currency)
      : '');
  }, [item, open, option]);

  const amountMinor = item && option?.amountKind ? parseMajorUnitInput(amount, item.currency) : null;

  async function submit() {
    if (!item || !option) return;
    const retryScope = `${item.id}:${option.action}`;
    const idempotencyKey = retryKeysRef.current[retryScope] ?? `${retryScope}:${crypto.randomUUID()}`;
    retryKeysRef.current[retryScope] = idempotencyKey;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/recoveries/${item.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: option.action,
          note: note.trim(),
          amountMinor: option.amountKind && amountMinor != null && amountMinor >= 0 ? amountMinor : undefined,
          idempotencyKey,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Recovery action failed');
      delete retryKeysRef.current[retryScope];
      onRecorded(body.recoveryCase as RecoveryCase, `${option.label} recorded. The append-only event is now part of recovery ${hashId(item.id)}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Recovery action failed');
    } finally {
      setBusy(false);
    }
  }

  if (!open || !item || !option) return null;
  const recoveryReference = `REC-${hashId(item.id).slice(1)}`;
  const sought = formatMinorCurrencyNullable(item.amount_sought_minor, item.currency);
  const recovered = formatMinorCurrencyNullable(item.amount_recovered_minor, item.currency);
  const commitDisabled = busy || note.trim().length < 3 || (Boolean(option.amountKind) && (amountMinor == null || amountMinor < 0));
  const danger = option.action === 'closed_unrecoverable';

  return (
    <div
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 92, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: 'rgba(34,29,23,.30)' }}
    >
      <section data-overlay-id={overlayId} role="dialog" aria-modal="true" aria-labelledby={`${overlayId}-title`} style={{ width: 620, maxWidth: 'calc(100vw - 40px)', maxHeight: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 14, background: '#fff', boxShadow: '0 30px 70px rgba(28,22,14,.34),0 2px 8px rgba(28,22,14,.18)' }}>
        <header style={{ padding: '17px 18px 15px', borderBottom: '1px solid #eae8e5', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id={`${overlayId}-title`} style={{ font: `500 15px/1.3 ${sans}`, color: '#1c1f23' }}>{option.label} · {recoveryReference}</div>
            <div style={{ marginTop: 4, font: `400 12px/1.5 ${sans}`, color: '#64686d' }}>{recoveryActionConsequence(option.action)}</div>
          </div>
          <button type="button" aria-label="Close recovery action" disabled={busy} onClick={onClose} style={{ width: 18, height: 18, padding: 0, border: 0, background: 'transparent', display: 'grid', placeItems: 'center', cursor: busy ? 'wait' : 'pointer' }}><svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4"/></svg></button>
        </header>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
          {error ? <div role="alert" style={{ padding: '10px 12px', borderRadius: 10, background: '#fdf0e6', font: `400 11.5px/1.5 ${sans}`, color: '#b0431a' }}>{error}</div> : null}
          <section style={{ padding: 11, borderRadius: 12, background: '#f4f3f1', display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ padding: '1px 3px 0', font: `600 10px/1 ${sans}`, letterSpacing: '.09em', color: '#64686d' }}>WHAT WILL BE RECORDED</div>
            <div style={{ padding: '12px 13px', borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Recovery', recoveryReference],
                ['Amount sought', sought],
                ['Recovered so far', recovered],
                ['External action', option.action === 'submitted' ? 'Record only · Unauth does not send it' : 'No external action is performed'],
              ].map(([label, value]) => <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}><span style={{ flex: 1, font: `400 12px/1.5 ${sans}`, color: '#64686d' }}>{label}</span><span style={{ maxWidth: '64%', textAlign: 'right', font: `400 12px/1.5 ${mono}`, color: '#1c1f23' }}>{value}</span></div>)}
            </div>
          </section>

          <div style={{ padding: '12px 13px', borderRadius: 12, background: danger ? '#fdf0e6' : '#fff3e9', display: 'flex', gap: 10 }}><span style={{ width: 6, height: 6, flex: 'none', marginTop: 6, borderRadius: '50%', background: danger ? '#b0431a' : '#c98a1a' }}/><span style={{ font: `400 11.5px/1.55 ${sans}`, color: danger ? '#b0431a' : '#7a5310' }}>The note and resulting state are appended to the recovery history. Earlier provider, credit, match and reconciliation facts remain unchanged.</span></div>

          {option.amountKind ? (
            <label style={{ padding: 11, borderRadius: 12, background: '#f4f3f1', display: 'flex', flexDirection: 'column', gap: 9 }}>
              <span style={{ padding: '1px 3px 0', font: `600 10px/1 ${sans}`, letterSpacing: '.09em', color: '#64686d' }}>APPROVED AMOUNT</span>
              <span style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}><input type="number" min={0} step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} style={{ minWidth: 0, padding: '9px 11px', border: 0, outline: 0, borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', font: `400 12px/1.5 ${mono}`, color: '#1c1f23' }}/><span style={{ padding: '9px 11px', borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', font: `400 12px/1.5 ${mono}`, color: '#64686d' }}>{item.currency}</span></span>
            </label>
          ) : null}

          <label style={{ padding: 11, borderRadius: 12, background: '#f4f3f1', display: 'flex', flexDirection: 'column', gap: 9 }}>
            <span style={{ padding: '1px 3px 0', font: `600 10px/1 ${sans}`, letterSpacing: '.09em', color: '#64686d' }}>SOURCE NOTE · RECORDED ON THE EVENT</span>
            <textarea required value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record the source reference, message or reason" style={{ minHeight: 72, resize: 'vertical', padding: '9px 11px', border: 0, outline: 0, borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', font: `400 12px/1.5 ${sans}`, color: '#1c1f23' }}/>
          </label>
        </div>

        <footer style={{ padding: '13px 18px', borderTop: '1px solid #eae8e5', background: '#ffffff', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1, font: `400 11px/1.5 ${sans}`, color: '#64686d' }}>Records one append-only event. It does not move or reconcile money.</span>
          <button type="button" disabled={busy} onClick={onClose} style={{ padding: '7px 12px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', font: `400 12.5px/1 ${sans}`, color: '#40454a', cursor: busy ? 'wait' : 'pointer' }}>Cancel</button>
          <button type="button" disabled={commitDisabled} onClick={() => void submit()} style={{ padding: '7px 13px', border: 0, borderRadius: 9, background: commitDisabled ? '#a7abad' : danger ? '#b0431a' : '#1c1f23', font: `500 12.5px/1 ${sans}`, color: '#fff', cursor: commitDisabled ? 'not-allowed' : 'pointer' }}>{busy ? 'Recording…' : option.label}</button>
        </footer>
      </section>
    </div>
  );
}
