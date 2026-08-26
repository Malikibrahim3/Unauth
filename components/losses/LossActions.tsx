'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BeforeYouConfirm, Button, Modal, MoneyValue, Textarea } from '@/components/ui';

export function LossActions({
  lossId,
  canManage,
  writeOffAmountMinor,
  currency,
  writeOffState,
  compact = false,
}: {
  lossId: string;
  canManage: boolean;
  writeOffAmountMinor: number | null;
  currency: string | null;
  writeOffState: 'available' | 'already_written_off' | 'unavailable' | 'no_outstanding' | 'mixed_currency';
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rationale, setRationale] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);

  function compactState(message: string) {
    return <span className="ua-text-caption-role text-[var(--uo-route-text-secondary)]" title={message}>{message}</span>;
  }

  if (!canManage) {
    return compact ? compactState('Read-only access') : <p className="ua-text-body text-[var(--uo-route-text-secondary)]">You have read-only access to this loss.</p>;
  }
  if (writeOffState === 'already_written_off') {
    return compact ? compactState('Write-off recorded') : <p className="ua-text-body text-[var(--uo-route-text-secondary)]">Write-off already recorded for this loss.</p>;
  }
  if (writeOffState === 'no_outstanding') {
    return compact ? compactState('Nothing to write off') : <p className="ua-text-body text-[var(--uo-route-text-secondary)]">No outstanding recovery remains to write off.</p>;
  }
  if (writeOffState === 'unavailable') {
    return compact ? compactState('Write-off basis unavailable') : <p className="ua-text-body text-[var(--uo-route-text-secondary)]">Write-off is unavailable until an outstanding recovery amount is reconciled.</p>;
  }
  if (writeOffState === 'mixed_currency') {
    return compact ? compactState('Mixed-currency write-off unavailable') : <p className="ua-text-body text-[var(--uo-route-text-secondary)]">Write-off is unavailable for a mixed-currency loss.</p>;
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
      <div>
        <Button
          variant="secondary"
          size="sm"
          loading={busy}
          onClick={() => { setError(null); setOpen(true); }}
          style={{ color: 'var(--uo-route-critical)', borderColor: 'var(--uo-route-critical)' }}
        >
          {compact ? 'Write off' : 'Write off outstanding'}
        </Button>
        {receipt ? <p role="status" className="ua-text-caption-role mt-2 max-w-sm text-[var(--uo-route-success)]">{receipt}</p> : null}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Write off outstanding recovery"
        description={`Loss ${lossId}. This creates a new append-only financial entry and closes only the outstanding recovery as unrecoverable.`}
        overlayId="write-off-outstanding-recovery-modal"
        actions={[
          {
            label: busy ? 'Writing off…' : 'Confirm write-off',
            variant: 'danger',
            disabled: busy || !rationale.trim(),
            onClick: () => void submit(),
          },
        ]}
      >
        {error ? <p role="alert" className="ua-text-body mb-4 rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-critical-bg)] p-3 text-[var(--uo-route-critical)]">{error}</p> : null}
        <BeforeYouConfirm
          objectSummary={lossId}
          valueSummary={<MoneyValue minorUnits={writeOffAmountMinor} currency={currency} reason="Outstanding recovery has not been reconciled" />}
          externalAction="No — this records a local ledger outcome"
          reversible="No — the write-off remains visible as a new financial event"
          appendOnly="Yes — the write-off and audit event are appended; original evidence remains"
        />
        <dl className="ua-text-dense grid gap-3 rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-surface-muted)] p-3 sm:grid-cols-2">
          <div><dt className="ua-text-metadata">Loss</dt><dd className="mt-1 font-mono">{lossId}</dd></div>
          <div><dt className="ua-text-metadata">Currency</dt><dd className="mt-1">{currency ?? 'Unavailable'}</dd></div>
        </dl>
        <label className="ua-text-body mt-4 block font-medium">
          Reason <span aria-hidden="true">*</span>
          <Textarea
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
            className="mt-1 min-h-24"
            required
          />
        </label>
        {!rationale.trim() ? <p className="ua-text-caption-role mt-1">A reason is required and is retained in activity history.</p> : null}
        <p className="ua-text-caption-role mt-4">Confirmation appends a write-off entry and audit event. It does not edit or remove the original loss, evidence, recovery events, or prior ledger entries.</p>
      </Modal>
    </>
  );
}
