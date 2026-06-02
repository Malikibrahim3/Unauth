'use client';

import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';

export function ClaimReviewToast({ wb }: { wb: ClaimReviewWorkbench }) {
  if (!wb.state.message) return null;
  const { messageTone } = wb.state;
  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full px-4">
      <p
        className="text-sm px-4 py-2.5 rounded-lg border shadow-md flex items-center gap-2"
        style={{
          color: messageTone === 'success' ? 'var(--success)' : messageTone === 'error' ? 'var(--sev-definite)' : 'var(--text-muted)',
          borderColor: messageTone === 'success' ? 'var(--success-bd)' : messageTone === 'error' ? 'var(--risk-critical-bd)' : 'var(--border-subtle)',
          background: messageTone === 'success' ? 'var(--success-bg)' : messageTone === 'error' ? 'var(--risk-critical-bg)' : 'var(--bg-surface)',
        }}
      >
        <span className="flex-1">{wb.state.message}</span>
        <button type="button" onClick={() => wb.patch({ message: '' })} className="text-xs opacity-60 hover:opacity-100">
          ✕
        </button>
      </p>
    </div>
  );
}
