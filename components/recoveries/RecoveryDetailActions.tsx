'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Modal } from '@/components/ui';
import type { RecoveryCase } from '@/lib/recoveries/types';
import { RecoveryActionDialog } from '@/components/recoveries/RecoveryActionDialog';
import {
  RECOVERY_ACTIONS,
  recoveryActionAvailable,
  type RecoveryActionOption,
} from '@/components/recoveries/recoveryActionOptions';

export function RecoveryDetailActions({ recovery, canManage }: { recovery: RecoveryCase; canManage: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<RecoveryActionOption | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const options = RECOVERY_ACTIONS.filter((option) => recoveryActionAvailable(recovery, option));
  const writeOff = options.find((option) => option.action === 'closed_unrecoverable') ?? null;
  const recordable = options.filter((option) => option.action !== 'closed_unrecoverable');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={!canManage || !writeOff}
        title={!canManage ? 'You have read-only access' : !writeOff ? 'Nothing is available to write off in this state' : undefined}
        onClick={() => writeOff && setPending(writeOff)}
      >
        Write off outstanding
      </Button>
      <Button
        variant="primary"
        size="sm"
        disabled={!canManage || recordable.length === 0}
        title={!canManage ? 'You have read-only access' : !recordable.length ? 'No recovery action is available in this state' : undefined}
        onClick={() => setChooserOpen(true)}
      >
        Record recovery action
      </Button>
      {receipt ? <p role="status" className="ua-text-caption-role basis-full text-[var(--uo-route-success-text)]">{receipt}</p> : null}
      <Modal
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
        title="Record a recovery action"
        description={`REC-${recovery.id.replace(/[^0-9a-z]/gi, '').slice(-5).toUpperCase()} · ${recovery.partner?.name ?? 'External owner'} · ${recovery.currency} recovery`}
        overlayId="recovery-detail-action-modal"
      >
        <div className="grid gap-2">
          <p className="ua-text-label text-[var(--uo-route-text-secondary)]">What has the partner actually done?</p>
          {recordable.map((option) => (
            <button
              key={option.action}
              type="button"
              className="rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-border-default)] bg-[var(--uo-route-surface-primary)] px-3 py-2 text-left transition-colors hover:border-[var(--uo-route-border-emphasis)] hover:bg-[var(--uo-route-surface-hover)]"
              onClick={() => { setChooserOpen(false); setPending(option); }}
            >
              <span className="ua-text-dense block font-medium text-[var(--uo-route-text-primary)]">{option.label}</span>
              <span className="ua-text-metadata mt-0.5 block text-[var(--uo-route-text-secondary)]">
                {option.action === 'chased' ? 'No response yet; records a follow-up only.' : option.action === 'rejected' ? 'The partner declined; an appeal may still be available.' : 'Records the external fact without editing earlier events.'}
              </span>
            </button>
          ))}
        </div>
      </Modal>
      <RecoveryActionDialog
        item={recovery}
        option={pending}
        open={pending != null}
        overlayId="recovery-detail-action-modal"
        onClose={() => setPending(null)}
        onRecorded={(_updated, message) => { setPending(null); setReceipt(message); router.refresh(); }}
      />
    </div>
  );
}
