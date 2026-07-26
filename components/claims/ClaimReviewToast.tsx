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
        borderRadius: 'var(--ua-radius-overlay)',
        fontSize: 13,
        fontWeight: 500,
        boxShadow: 'var(--ua-shadow-menu)',
        color: messageTone === 'success' ? 'var(--ua-success)' : messageTone === 'error' ? 'var(--ua-success)' : 'var(--ua-text-secondary)',
        border: `1px solid ${messageTone === 'success' ? 'var(--ua-success-border)' : messageTone === 'error' ? 'var(--ua-risk-critical-border)' : 'var(--ua-border-subtle)'}`,
        background: messageTone === 'success' ? 'var(--ua-success-bg)' : messageTone === 'error' ? 'var(--ua-risk-critical-bg)' : 'var(--ua-surface-primary)',
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
