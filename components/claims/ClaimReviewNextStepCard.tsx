'use client';

import Link from 'next/link';
import { btnStyle } from '@/components/claims/claimReviewStyles';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';

export function ClaimReviewNextStepCard({ wb }: { wb: ClaimReviewWorkbench }) {
  const { selectedClaim, busy, primaryAction, latestOutcome, evidenceRecorded, responseRecorded, claimIsClosed, state, handlePrimaryCta, nextClaimAction } = wb;

  if (!selectedClaim) return null;

  return (
    <>
      <div className="rounded-md px-4 py-3 border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Evidence status</p>
        <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text)' }}>{primaryAction.label}</p>
        <p className="text-xs mt-1 mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{primaryAction.reason}</p>
        {primaryAction.key === 'close' && state.nextClaimHref ? (
          <Link href={state.nextClaimHref} className="block w-full text-center px-3 py-2 rounded-md text-sm font-semibold" style={btnStyle('primary')}>
            {primaryAction.cta}
          </Link>
        ) : (
          <button
            type="button"
            disabled={busy || primaryAction.key === 'none'}
            onClick={() => void handlePrimaryCta()}
            className="w-full px-3 py-2 rounded-md text-sm font-semibold disabled:opacity-60"
            style={btnStyle(primaryAction.key === 'none' ? 'disabled' : 'primary')}
          >
            {primaryAction.cta}
          </button>
        )}
        <div className="mt-3 pt-3 border-t flex items-center gap-1 flex-wrap" style={{ borderColor: 'var(--border-muted)' }}>
          {([
            ['Active', true],
            ['Evidence', evidenceRecorded],
            ['Outcome', !!latestOutcome],
            ['Response', responseRecorded],
            ['Recorded', claimIsClosed],
          ] as Array<[string, boolean]>).map(([label, done], i) => (
            <div key={label} className="flex items-center gap-1">
              {i > 0 && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>›</span>}
              <span className="text-xs font-semibold" style={{ color: done ? 'var(--success)' : 'var(--text-secondary)' }}>
                {done ? '✓ ' : ''}{label}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>Review hint: {nextClaimAction}</p>
      </div>

      {(state.nextClaimHref || state.noMoreClaims) && primaryAction.key !== 'close' && (
        <div className="rounded-md px-3 py-2 border text-xs" style={{ borderColor: 'var(--success-bd)', background: 'var(--success-bg)', color: 'var(--success)' }}>
          {state.noMoreClaims ? 'All claim reviews complete.' : 'Outcome recorded. Continue to the next review.'}
        </div>
      )}
    </>
  );
}
