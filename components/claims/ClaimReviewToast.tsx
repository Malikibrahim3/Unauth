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
        borderRadius: 'var(--uo-route-radius-overlay)',
        fontSize: 13,
        fontWeight: 500,
        boxShadow: 'var(--uo-route-shadow-menu)',
        color: messageTone === 'success' ? 'var(--uo-route-success)' : messageTone === 'error' ? 'var(--uo-route-success)' : 'var(--uo-route-text-secondary)',
        border: `1px solid ${messageTone === 'success' ? 'var(--uo-route-success-border)' : messageTone === 'error' ? 'var(--uo-route-risk-critical-border)' : 'var(--uo-route-border-subtle)'}`,
        background: messageTone === 'success' ? 'var(--uo-route-success-bg)' : messageTone === 'error' ? 'var(--uo-route-risk-critical-bg)' : 'var(--uo-route-surface-primary)',
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
