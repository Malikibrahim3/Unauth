'use client';

import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';

export function ClaimReviewToast({ wb }: { wb: ClaimReviewWorkbench }) {
  if (!wb.state.message) return null;
  const { messageTone } = wb.state;
  return (
    <div
      className="fixed z-50 flex items-center gap-3"
      style={{
        top: 16,
        right: 16,
        height: 40,
        padding: '0 16px',
        borderRadius: 'var(--radius-md)',
        fontSize: 13,
        fontWeight: 500,
        boxShadow: 'var(--shadow-md)',
        color: messageTone === 'success' ? 'var(--success)' : messageTone === 'error' ? 'var(--success)' : 'var(--text-secondary)',
        border: `1px solid ${messageTone === 'success' ? 'var(--success-bd)' : messageTone === 'error' ? 'var(--risk-critical-bd)' : 'var(--border-muted)'}`,
        background: messageTone === 'success' ? 'var(--success-bg)' : messageTone === 'error' ? 'var(--risk-critical-bg)' : 'var(--surface)',
      }}
    >
      <span>{wb.state.message}</span>
      <button
        type="button"
        onClick={() => wb.patch({ message: '' })}
        className="flex h-5 w-5 items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
        style={{ fontSize: 11 }}
      >
        ✕
      </button>
    </div>
  );
}
