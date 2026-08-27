'use client';

import { useEffect, useRef, useState } from 'react';
import { BeforeYouConfirm, Input, Modal, MoneyValue, Textarea } from '@/components/ui';
import type { RecoveryCase } from '@/lib/recoveries/types';
import { formatMajorUnitInput, parseMajorUnitInput } from '@/lib/ui/merchantCopy';
import { hashId } from '@/lib/ui/displayRef';
import {
  recoveryActionConsequence,
  type RecoveryActionOption,
} from '@/components/recoveries/recoveryActionOptions';

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

  return (
    <Modal
      open={open && item != null && option != null}
      onClose={() => { if (!busy) onClose(); }}
      title={option?.label ?? 'Confirm recovery action'}
      description={option ? recoveryActionConsequence(option.action) : undefined}
      overlayId={overlayId}
      actions={item && option ? [{
        label: busy ? 'Recording…' : option.label,
        variant: option.action === 'closed_unrecoverable' ? 'danger' : 'commit',
        disabled: busy || note.trim().length < 3 || (Boolean(option.amountKind) && (amountMinor == null || amountMinor < 0)),
        onClick: () => void submit(),
      }] : []}
    >
      {item && option ? (
        <div className="space-y-4">
          {error ? <p role="alert" className="ua-text-body rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-critical-bg)] p-3 text-[var(--uo-route-critical)]">{error}</p> : null}
          <BeforeYouConfirm
            objectSummary={hashId(item.id)}
            valueSummary={option.amountKind ? `${amount || 'Not entered'} ${item.currency}` : 'No monetary value changed'}
            externalAction={option.action === 'submitted' ? 'No — record the external submission; Unauth does not send it' : 'No — this records an internal recovery event'}
            reversible="No — the prior event remains; the next state follows policy"
            appendOnly="Yes — the note and outcome are retained in the recovery event ledger"
          />
          <dl className="ua-text-dense grid gap-3 rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-surface-muted)] p-3 sm:grid-cols-3">
            <div><dt className="ua-text-metadata">Recovery</dt><dd className="mt-1 font-mono">{hashId(item.id)}</dd></div>
            <div><dt className="ua-text-metadata">Amount sought</dt><dd className="mt-1"><MoneyValue minorUnits={item.amount_sought_minor} currency={item.currency} /></dd></div>
            <div><dt className="ua-text-metadata">Recovered</dt><dd className="mt-1"><MoneyValue minorUnits={item.amount_recovered_minor} currency={item.currency} /></dd></div>
          </dl>
          {option.amountKind ? (
            <label className="ua-text-label block">
              Approved amount
              <div className="mt-1 grid grid-cols-[1fr_auto] gap-2"><Input type="number" min={0} step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /><span className="ua-text-label flex items-center rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-border-default)] bg-[var(--uo-route-surface-muted)] px-3">{item.currency}</span></div>
              <span className="ua-text-metadata mt-1 block font-normal">Enter the amount in normal currency format — Unauth stores it precisely for {item.currency}.</span>
            </label>
          ) : null}
          <label className="ua-text-label block">
            Source note <span aria-hidden="true">*</span>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-24" placeholder="Record the source reference, message or reason" required />
            <span className="ua-text-metadata mt-1 block font-normal">Required. The note is retained with the append-only recovery event.</span>
          </label>
        </div>
      ) : null}
    </Modal>
  );
}
