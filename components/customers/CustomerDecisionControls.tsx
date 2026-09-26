'use client';

import { useState } from 'react';
import Link from '@/components/navigation/AppNavLink';

const sans = "'Inter',sans-serif";
const mono = "'IBM Plex Mono',monospace";

export function CustomerDecisionControls({
  customerId,
  canRequestEvidence,
  initialStatus,
}: {
  customerId: string;
  canRequestEvidence: boolean;
  initialStatus: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(initialStatus ?? 'under_review');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function saveDecision() {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`/api/customers/${customerId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        setMessage(payload.error ?? 'The decision could not be recorded.');
        return;
      }
      setMessage('Decision recorded.');
      setTimeout(() => setOpen(false), 450);
    } finally {
      setSaving(false);
    }
  }

  const secondary = { padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', color: '#40454a', background: '#fff', border: 0, font: `400 12.5px/1 ${sans}`, textDecoration: 'none', cursor: 'pointer' } as const;

  return <>
    {canRequestEvidence ? <Link href={`/customers/${customerId}/evidence/new`} style={secondary}>Request evidence</Link> : <span title="No recorded case currently supports an evidence package" style={{ ...secondary, color: '#64686d', cursor: 'not-allowed' }}>Request evidence</span>}
    <Link href={`/controls/rules?customer=${encodeURIComponent(customerId)}`} style={secondary}>Block auto-refund</Link>
    <button type="button" onClick={() => setOpen(true)} style={{ padding: '6px 11px', border: 0, borderRadius: 9, background: '#1c1f23', color: '#fff', font: `500 12.5px/1 ${sans}`, cursor: 'pointer' }}>Record a decision</button>
    {open ? <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setOpen(false); }} style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(28,27,25,.24)' }}>
      <section role="dialog" aria-modal="true" aria-labelledby="customer-decision-title" data-overlay-id="customer-decision" style={{ width: 430, maxWidth: '100%', borderRadius: 12, background: '#fff', boxShadow: '0 18px 50px rgba(28,22,14,.2),0 0 0 1px rgba(28,27,25,.08)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #eae8e5' }}><h2 id="customer-decision-title" style={{ margin: 0, color: '#1c1f23', font: `500 14px/1.3 ${sans}` }}>Record a decision</h2><p style={{ margin: '6px 0 0', color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>This records the team’s review status. It does not block a payout rule or make a provider decision.</p></div>
        <div style={{ padding: 18 }}><label style={{ display: 'grid', gap: 7, color: '#40454a', font: `500 12px/1.3 ${sans}` }}>Decision status<select value={status} onChange={(event) => setStatus(event.target.value)} style={{ height: 36, border: '1px solid #d8d4cf', borderRadius: 8, padding: '0 10px', background: '#fff', color: '#1c1f23', font: `400 12px/1 ${sans}` }}><option value="under_review">Marked under review</option><option value="contacted">Customer contacted</option><option value="resolved">Resolved</option><option value="cleared">Cleared</option></select></label>{message ? <p role="status" style={{ margin: '10px 0 0', color: message === 'Decision recorded.' ? '#1a6b43' : '#b0431a', font: `400 10.5px/1.4 ${mono}` }}>{message}</p> : null}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 18px', borderTop: '1px solid #eae8e5' }}><button type="button" disabled={saving} onClick={() => setOpen(false)} style={secondary}>Cancel</button><button type="button" disabled={saving} onClick={() => void saveDecision()} style={{ padding: '7px 11px', border: 0, borderRadius: 8, background: '#1c1f23', color: '#fff', font: `500 12px/1 ${sans}`, cursor: saving ? 'wait' : 'pointer' }}>{saving ? 'Recording…' : 'Record decision'}</button></div>
      </section>
    </div> : null}
  </>;
}
