'use client';

import { isFinalClaimStatus } from '@/lib/claims/sla';
import { btnStyle, inputStyle } from '@/components/claims/claimReviewStyles';
import { ClaimLifecycleStatusBar, RailSection } from '@/components/claims/claimReviewPrimitives';
import { ClaimReviewEvidenceRail } from '@/components/claims/ClaimReviewEvidenceRail';
import { ClaimReviewNextStepCard } from '@/components/claims/ClaimReviewNextStepCard';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';

function formatSnoozeDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US');
}

export function ClaimReviewActionRail({ wb }: { wb: ClaimReviewWorkbench }) {
  const {
    selectedClaim,
    claimId,
    claimIsClosed,
    busy,
    primaryAction,
    state,
    patch,
    dispatch,
    onAssignment,
    onStatusChange,
    onReopen,
    onSnooze,
    onClearSnooze,
  } = wb;

  return (
    <aside
      className="space-y-2 min-w-0 w-full order-2 min-[1100px]:col-start-2 min-[1100px]:row-start-1 min-[1100px]:row-span-2 min-[1100px]:sticky min-[1100px]:top-[4.25rem] min-[1100px]:max-h-[calc(100vh-4.5rem)] min-[1100px]:overflow-y-auto min-[1100px]:self-start pb-6"
      aria-label="Case actions"
    >
      <ClaimReviewNextStepCard wb={wb} />

      <RailSection
        id="ownership"
        title="Ownership"
        open={state.railOpen.ownership}
        onToggle={(id) => dispatch({ type: 'toggleRail', id })}
        highlighted={primaryAction.railSection === 'ownership'}
      >
        {selectedClaim ? (
          <>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              {selectedClaim.assigned_to ? 'Owner assigned' : 'No owner assigned'}
              {' · '}
              {selectedClaim.first_viewed_at
                ? `First viewed ${new Date(selectedClaim.first_viewed_at).toLocaleDateString('en-US')}`
                : 'Not yet viewed'}
            </p>
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={() => onAssignment('assign_to_me')} className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
                Assign to me
              </button>
              <button type="button" disabled={busy} onClick={() => onAssignment('unassign')} className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50" style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                Unassign
              </button>
            </div>
          </>
        ) : (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Save a claim to assign ownership.</p>
        )}
      </RailSection>

      {selectedClaim && (
        <RailSection id="status" title="Workflow status" open={state.railOpen.status} onToggle={(id) => dispatch({ type: 'toggleRail', id })} highlighted={primaryAction.railSection === 'status'}>
          <ClaimLifecycleStatusBar
            claimId={claimId}
            busy={busy}
            claimIsClosed={claimIsClosed}
            statusToSet={state.statusToSet}
            setStatusToSet={(status) => patch({ statusToSet: status })}
            statusNote={state.statusNote}
            setStatusNote={(statusNote) => patch({ statusNote })}
            onStatusChange={onStatusChange}
            reopenNote={state.reopenNote}
            setReopenNote={(reopenNote) => patch({ reopenNote })}
            onReopen={onReopen}
            canReopen={!!selectedClaim && isFinalClaimStatus(selectedClaim.status)}
            submitIsPrimary={primaryAction.key === 'status' || primaryAction.key === 'reopen'}
          />
        </RailSection>
      )}

      {selectedClaim && !claimIsClosed && (
        <RailSection
          id="snooze"
          title="Follow-up / snooze"
          open={state.railOpen.snooze}
          onToggle={(id) => dispatch({ type: 'toggleRail', id })}
          highlighted={primaryAction.railSection === 'snooze'}
          badge={selectedClaim.snoozed_until ? (
            <span className="text-xs rounded-full px-1.5 py-0.5 font-semibold" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
              {formatSnoozeDate(selectedClaim.snoozed_until)}
            </span>
          ) : undefined}
        >
          <div className="flex flex-wrap items-end gap-2 mb-3">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Days
              <input id="claim-snooze-days" aria-label="Snooze days" className="mt-1 block w-16 rounded-md px-2 py-1 text-sm" style={inputStyle()} value={state.snoozeDays} onChange={(e) => patch({ snoozeDays: e.target.value })} inputMode="numeric" />
            </label>
            <label className="flex-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Note
              <input id="claim-snooze-reason" aria-label="Snooze note" className="mt-1 block w-full rounded-md px-2 py-1 text-sm" style={inputStyle()} value={state.snoozeReason} onChange={(e) => patch({ snoozeReason: e.target.value })} />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={onSnooze} className="flex-1 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={btnStyle('secondary')}>
              Snooze
            </button>
            {selectedClaim.snoozed_until && (
              <button type="button" disabled={busy} onClick={() => void onClearSnooze()} className="flex-1 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
                Clear snooze
              </button>
            )}
          </div>
        </RailSection>
      )}

      <ClaimReviewEvidenceRail wb={wb} />
    </aside>
  );
}
