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
        borderRadius: '14px',
        fontSize: 13,
        fontWeight: 500,
        boxShadow: '0 12px 30px rgba(28,27,25,.12)',
        color: messageTone === 'success' ? '#1a6b43' : messageTone === 'error' ? '#1a6b43' : '#64686d',
        border: `1px solid ${messageTone === 'success' ? '#bfdecf' : messageTone === 'error' ? '#edc6b5' : '#eae8e5'}`,
        background: messageTone === 'success' ? '#eaf5ef' : messageTone === 'error' ? '#fdf0e6' : '#fff',
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
