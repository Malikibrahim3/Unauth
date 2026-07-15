'use client';

import { Button, ButtonLink, Card } from '@/components/ui';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';

export function ClaimReviewNextStepCard({ wb }: { wb: ClaimReviewWorkbench }) {
  const { selectedClaim, busy, primaryAction, latestOutcome, evidenceRecorded, responseRecorded, claimIsClosed, state, handlePrimaryCta, nextClaimAction } = wb;

  if (!selectedClaim) return null;

  return (
    <>
      <Card variant="flat" density="default" className="overflow-hidden">
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Evidence status</p>
        <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text)' }}>{primaryAction.label}</p>
        <p className="text-xs mt-1 mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{primaryAction.reason}</p>
        {primaryAction.key === 'close' && state.nextClaimHref ? (
          <ButtonLink href={state.nextClaimHref} className="w-full">
            {primaryAction.cta}
          </ButtonLink>
        ) : (
          <Button
            type="button"
            variant={primaryAction.key === 'none' ? 'secondary' : 'primary'}
            size="md"
            disabled={busy || primaryAction.key === 'none'}
            onClick={() => void handlePrimaryCta()}
            className="w-full"
          >
            {primaryAction.cta}
          </Button>
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
      </Card>

      {(state.nextClaimHref || state.noMoreClaims) && primaryAction.key !== 'close' && (
        <div className="rounded-md px-3 py-2 border text-xs" style={{ borderColor: 'var(--success-bd)', background: 'var(--success-bg)', color: 'var(--success)' }}>
          {state.noMoreClaims ? 'All claim reviews complete.' : 'Outcome recorded. Continue to the next review.'}
        </div>
      )}
    </>
  );
}
