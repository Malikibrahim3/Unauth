'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RecoveryCase } from '@/lib/recoveries/types';
import { RecoveryActionDialog } from '@/components/recoveries/RecoveryActionDialog';
import {
  RECOVERY_ACTIONS,
  recoveryActionAvailable,
  type RecoveryActionOption,
} from '@/components/recoveries/recoveryActionOptions';
import { hashId } from '@/lib/ui/displayRef';

export function RecoveryDetailActions({ recovery, canManage }: { recovery: RecoveryCase; canManage: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<RecoveryActionOption | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const options = RECOVERY_ACTIONS.filter((option) => recoveryActionAvailable(recovery, option));
  const chase = options.find((option) => option.action === 'chased') ?? null;
  const outcomes = options.filter((option) => option.action !== 'chased');
  const disabledColor = '#64686d';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        disabled={!canManage || !chase}
        title={!canManage ? 'You have read-only access' : !chase ? 'A carrier chase is not available in this state' : undefined}
        onClick={() => chase && setPending(chase)}
        style={{ padding: '6px 10px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', font: "400 12.5px/1 'Inter',sans-serif", color: !canManage || !chase ? disabledColor : '#40454a', cursor: !canManage || !chase ? 'not-allowed' : 'pointer' }}
      >
        Chase the carrier
      </button>
      <button
        type="button"
        disabled={!canManage || outcomes.length === 0}
        title={!canManage ? 'You have read-only access' : !outcomes.length ? 'No recovery outcome is available in this state' : undefined}
        onClick={() => setChooserOpen(true)}
        style={{ padding: '6px 11px', border: 0, borderRadius: 9, background: !canManage || !outcomes.length ? '#a7abad' : '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", cursor: !canManage || !outcomes.length ? 'not-allowed' : 'pointer' }}
      >
        Record an outcome
      </button>
      {receipt ? <span role="status" style={{ position: 'absolute', right: 22, top: 57, maxWidth: 340, padding: '7px 10px', borderRadius: 8, background: '#eef6f1', font: "400 10.5px/1.4 'Inter',sans-serif", color: '#1a6b43' }}>{receipt}</span> : null}

      {chooserOpen ? (
        <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setChooserOpen(false); }} style={{ position: 'fixed', inset: 0, zIndex: 91, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: 'rgba(34,29,23,.30)' }}>
          <section role="dialog" aria-modal="true" aria-labelledby="recovery-outcome-title" style={{ width: 520, maxWidth: 'calc(100vw - 40px)', overflow: 'hidden', borderRadius: 14, background: '#fff', boxShadow: '0 30px 70px rgba(28,22,14,.34),0 2px 8px rgba(28,22,14,.18)' }}>
            <header style={{ padding: '17px 18px 15px', borderBottom: '1px solid #eae8e5', display: 'flex', alignItems: 'flex-start', gap: 12 }}><div style={{ flex: 1 }}><div id="recovery-outcome-title" style={{ font: "500 15px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>Record an outcome</div><div style={{ marginTop: 4, font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>REC-{hashId(recovery.id).slice(1)} · {recovery.partner?.name ?? 'External owner'} · {recovery.currency} recovery</div></div><button type="button" aria-label="Close outcome options" onClick={() => setChooserOpen(false)} style={{ width: 18, height: 18, padding: 0, border: 0, background: 'transparent', cursor: 'pointer' }}><svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4"/></svg></button></header>
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ marginBottom: 2, font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>WHAT HAS THE PARTNER ACTUALLY DONE?</div>
              {outcomes.map((option) => (
                <button key={option.action} type="button" onClick={() => { setChooserOpen(false); setPending(option); }} style={{ padding: '10px 12px', border: 0, borderRadius: 9, background: option.action === 'closed_unrecoverable' ? '#fdf0e6' : '#f4f3f1', textAlign: 'left', cursor: 'pointer' }}>
                  <span style={{ display: 'block', font: "500 12px/1.4 'Inter',sans-serif", color: option.action === 'closed_unrecoverable' ? '#b0431a' : '#1c1f23' }}>{option.label}</span>
                  <span style={{ display: 'block', marginTop: 2, font: "400 10.5px/1.45 'Inter',sans-serif", color: '#64686d' }}>{option.action === 'submitted' ? 'Record the external submission; Unauth does not send it.' : option.action === 'rejected' ? 'The partner declined; an appeal may still be available.' : option.action === 'closed_unrecoverable' ? 'Write off only the outstanding amount; prior facts stay visible.' : 'Record the external fact without editing earlier events.'}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <RecoveryActionDialog
        item={recovery}
        option={pending}
        open={pending != null}
        overlayId={pending?.action === 'submitted' ? 'confirm-recovery-action-modal' : 'recovery-detail-action-modal'}
        onClose={() => setPending(null)}
        onRecorded={(_updated, message) => { setPending(null); setReceipt(message); router.refresh(); }}
      />
    </div>
  );
}
