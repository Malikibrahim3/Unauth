'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Modal } from '@/components/ui';

export function LossActions({
  lossId,
  canManage,
  writeOffAmount,
  writeOffState,
}: {
  lossId: string;
  canManage: boolean;
  writeOffAmount: string;
  writeOffState: 'available' | 'already_written_off' | 'unavailable' | 'no_outstanding' | 'mixed_currency';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rationale, setRationale] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!canManage) {
    return <p className="ua-text-body text-[var(--ua-text-secondary)]">You have read-only access to this loss.</p>;
  }
  if (writeOffState === 'already_written_off') {
    return <p className="ua-text-body text-[var(--ua-text-secondary)]">Write-off already recorded for this loss.</p>;
  }
  if (writeOffState === 'no_outstanding') {
    return <p className="ua-text-body text-[var(--ua-text-secondary)]">No outstanding recovery remains to write off.</p>;
  }
  if (writeOffState === 'unavailable') {
    return <p className="ua-text-body text-[var(--ua-text-secondary)]">Write-off is unavailable until an outstanding recovery amount is reconciled.</p>;
  }
  if (writeOffState === 'mixed_currency') {
    return <p className="ua-text-body text-[var(--ua-text-secondary)]">Write-off is unavailable for a mixed-currency loss.</p>;
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
      router.refresh();
    } catch {
      setError('Write-off could not be recorded. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        loading={busy}
        onClick={() => setOpen(true)}
        style={{ color: 'var(--ua-critical)', borderColor: 'var(--ua-critical)' }}
      >
        Write off loss
      </Button>
      {error ? <p role="alert" className="ua-text-body mt-2 text-[var(--ua-critical)]">{error}</p> : null}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Write off outstanding recovery"
        description="This creates an append-only financial entry and closes the loss as unrecoverable."
        actions={[
          {
            label: busy ? 'Writing off…' : 'Confirm write-off',
            variant: 'danger',
            disabled: busy || !rationale.trim(),
            onClick: () => void submit(),
          },
        ]}
      >
        <p className="ua-text-body">
          Amount to write off: <strong className="tabular-nums">{writeOffAmount}</strong>
        </p>
        <label className="ua-text-body mt-4 block font-medium">
          Reason <span aria-hidden="true">*</span>
          <textarea
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
            className="mt-1 min-h-24 w-full rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] p-2"
            required
          />
        </label>
        {!rationale.trim() ? <p className="ua-text-caption-role mt-1">A reason is required and is retained in activity history.</p> : null}
      </Modal>
    </>
  );
}
