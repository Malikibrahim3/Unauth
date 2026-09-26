'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import type { RecoveryCase } from '@/lib/recoveries/types';
import { RecoveryActionDialog } from '@/components/recoveries/RecoveryActionDialog';
import {
  RECOVERY_ACTIONS,
  recoveryActionAvailable,
  type RecoveryActionOption,
} from '@/components/recoveries/recoveryActionOptions';

export function RecoveryBoardAction({ recovery, canManage }: { recovery: RecoveryCase; canManage: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<RecoveryActionOption | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const option = RECOVERY_ACTIONS.find((candidate) => (
    candidate.action !== 'closed_unrecoverable' && recoveryActionAvailable(recovery, candidate)
  )) ?? null;

  if (!canManage || !option) return null;

  if (option.action === 'submitted') {
    return (
      <button
        type="button"
        onClick={() => router.push(`/financials/recovery/new?case=${encodeURIComponent(recovery.support_payout_case_id)}`)}
        style={{ height: 28, padding: '0 10px', border: 0, borderRadius: 8, background: '#1c1f23', color: '#fff', font: "500 11.5px/1 'Inter',sans-serif", cursor: 'pointer' }}
      >
        File claim
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1 lg:items-end">
      <Button size="sm" variant="secondary" onClick={() => { setReceipt(null); setPending(option); }}>
        {option.label}
      </Button>
      {receipt ? <span role="status" className="text-[10.5px] leading-4 text-[#6f6a63] max-w-56 text-[#1a6b43]">{receipt}</span> : null}
      <RecoveryActionDialog
        item={recovery}
        option={pending}
        open={pending != null}
        overlayId="confirm-recovery-action-modal"
        onClose={() => setPending(null)}
        onRecorded={(_updated, message) => {
          setPending(null);
          setReceipt(message);
          router.refresh();
        }}
      />
    </div>
  );
}
