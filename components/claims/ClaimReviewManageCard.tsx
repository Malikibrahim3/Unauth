'use client';

import { RailSection, ClaimLifecycleStatusBar, FieldLabel } from '@/components/claims/claimReviewPrimitives';
import { btnStyle, inputStyle } from '@/components/claims/claimReviewStyles';
import { DECISION_LABELS, OUTCOME_LABELS, EVIDENCE_TYPE_LABELS, EVIDENCE_SOURCE_LABELS } from '@/components/claims/claimReviewLabels';
import type { Decision, Outcome, EvidenceType, EvidenceSource, ClaimStatus } from '@/components/claims/claimReviewTypes';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';

// Merchant-selectable decisions/outcomes are an explicit neutral allowlist —
// accusation vocabulary is deliberately excluded (see docs/product/TERMINOLOGY.md).
const DECISION_OPTIONS: Decision[] = [
  'approved', 'denied', 'escalated', 'partial_refund', 'full_refund', 'chargeback_disputed', 'internal_watch', 'no_action',
];
const OUTCOME_OPTIONS: Outcome[] = [
  'loss', 'recovered', 'pending', 'chargeback_won', 'chargeback_lost', 'customer_verified', 'legitimate',
];
const EVIDENCE_TYPE_OPTIONS = Object.keys(EVIDENCE_TYPE_LABELS) as EvidenceType[];
const EVIDENCE_SOURCE_OPTIONS = Object.keys(EVIDENCE_SOURCE_LABELS) as EvidenceSource[];

// Readable decision/outcome verbs for the operator (the neutral audit copy in
// claimReviewLabels is intentionally uniform, so it can't label a picker).
const DECISION_VERB: Record<string, string> = {
  approved: 'Approve payout', denied: 'Deny under policy', escalated: 'Escalate for review',
  partial_refund: 'Partial refund', full_refund: 'Full refund', chargeback_disputed: 'Dispute chargeback',
  internal_watch: 'Internal watch', no_action: 'No action',
};
const OUTCOME_VERB: Record<string, string> = {
  loss: 'Loss', recovered: 'Recovered', pending: 'Pending', chargeback_won: 'Chargeback won',
  chargeback_lost: 'Chargeback lost', customer_verified: 'Customer verified', legitimate: 'Legitimate',
};

export function ClaimReviewManageCard({ wb, canManage }: { wb: ClaimReviewWorkbench; canManage: boolean }) {
  const {
    claimId, state, patch, busy, dispatch, claimIsClosed,
    onOutcome, onEvidence, onAssignment, onSnooze, onClearSnooze, onReverse,
    onStatusChange, onReopen, latestOutcome, decisionData,
  } = wb;

  if (!canManage) {
    return (
      <RailSection id="manage" title="Manage case" open={state.railOpen.manage ?? false} onToggle={(id) => dispatch({ type: 'toggleRail', id })}>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          You have read-only access. Recording decisions, evidence, and transitions requires the payout-decision permission.
        </p>
      </RailSection>
    );
  }

  const recoveryCase = (decisionData?.recoveryCase as { id?: string } | null | undefined) ?? null;
  const hasOutcome = Boolean(latestOutcome);
  const disabled = busy || !claimId;

  return (
    <RailSection id="manage" title="Manage case" open={state.railOpen.manage ?? true} onToggle={(id) => dispatch({ type: 'toggleRail', id })}>
      <div className="space-y-4">
        {/* Ownership */}
        <div className="space-y-1.5">
          <FieldLabel>Ownership</FieldLabel>
          <div className="flex gap-1.5">
            <button type="button" disabled={disabled} onClick={() => void onAssignment('assign_to_me')}
              className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60" style={btnStyle('secondary')}>
              Assign to me
            </button>
            <button type="button" disabled={disabled} onClick={() => void onAssignment('unassign')}
              className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60" style={btnStyle('secondary')}>
              Unassign
            </button>
          </div>
        </div>

        {/* Record decision + outcome */}
        <div className="space-y-1.5">
          <FieldLabel htmlFor="manage-decision">Record decision &amp; outcome</FieldLabel>
          <select id="manage-decision" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()}
            value={state.decision} onChange={(e) => patch({ decision: e.target.value as Decision })} aria-label="Decision">
            {DECISION_OPTIONS.map((d) => <option key={d} value={d}>{DECISION_VERB[d] ?? d}</option>)}
          </select>
          <select className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()}
            value={state.outcome} onChange={(e) => patch({ outcome: e.target.value as Outcome })} aria-label="Outcome">
            {OUTCOME_OPTIONS.map((o) => <option key={o} value={o}>{OUTCOME_VERB[o] ?? o}</option>)}
          </select>
          <input type="text" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()}
            placeholder="Decision note (optional)" value={state.notes} onChange={(e) => patch({ notes: e.target.value })} aria-label="Decision note" />
          <button type="button" disabled={disabled}
            onClick={() => { if (window.confirm('Record this decision and outcome? This updates the case financial state and is auditable.')) void onOutcome(); }}
            className="w-full px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60" style={btnStyle('primary')}>
            Record decision
          </button>
        </div>

        {/* Add evidence */}
        <div className="space-y-1.5">
          <FieldLabel htmlFor="manage-evidence-type">Add evidence</FieldLabel>
          <select id="manage-evidence-type" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()}
            value={state.evidenceType} onChange={(e) => patch({ evidenceType: e.target.value as EvidenceType })} aria-label="Evidence type">
            {EVIDENCE_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{EVIDENCE_TYPE_LABELS[t]}</option>)}
          </select>
          <select className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()}
            value={state.source} onChange={(e) => patch({ source: e.target.value as EvidenceSource })} aria-label="Evidence source">
            {EVIDENCE_SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{EVIDENCE_SOURCE_LABELS[s]}</option>)}
          </select>
          <input type="text" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()}
            placeholder="Evidence URL (optional)" value={state.evidenceUrl} onChange={(e) => patch({ evidenceUrl: e.target.value })} aria-label="Evidence URL" />
          <button type="button" disabled={disabled} onClick={() => void onEvidence()}
            className="w-full px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60" style={btnStyle('secondary')}>
            Add evidence
          </button>
        </div>

        {/* Lifecycle: transition / reopen */}
        <div className="space-y-1.5">
          <FieldLabel>Lifecycle</FieldLabel>
          <ClaimLifecycleStatusBar
            claimId={claimId || ''}
            busy={busy}
            claimIsClosed={claimIsClosed}
            statusToSet={state.statusToSet}
            setStatusToSet={(status: ClaimStatus) => patch({ statusToSet: status })}
            statusNote={state.statusNote}
            setStatusNote={(note: string) => patch({ statusNote: note })}
            onStatusChange={() => void onStatusChange()}
            reopenNote={state.reopenNote}
            setReopenNote={(note: string) => patch({ reopenNote: note })}
            onReopen={() => void onReopen()}
            canReopen={canManage}
          />
        </div>

        {/* Snooze */}
        <div className="space-y-1.5">
          <FieldLabel htmlFor="manage-snooze-days">Snooze follow-up</FieldLabel>
          <div className="flex gap-1.5">
            <input id="manage-snooze-days" type="number" min={1} max={30} className="w-16 px-2 py-1.5 rounded-md text-xs" style={inputStyle()}
              value={state.snoozeDays} onChange={(e) => patch({ snoozeDays: e.target.value })} aria-label="Snooze days" />
            <input type="text" className="flex-1 px-2 py-1.5 rounded-md text-xs" style={inputStyle()}
              placeholder="Reason (optional)" value={state.snoozeReason} onChange={(e) => patch({ snoozeReason: e.target.value })} aria-label="Snooze reason" />
          </div>
          <div className="flex gap-1.5">
            <button type="button" disabled={disabled} onClick={() => void onSnooze()}
              className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60" style={btnStyle('secondary')}>Snooze</button>
            <button type="button" disabled={disabled} onClick={() => void onClearSnooze()}
              className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60" style={btnStyle('secondary')}>Clear</button>
          </div>
        </div>

        {/* Reverse a recorded decision */}
        {hasOutcome ? (
          <div className="space-y-1.5">
            <FieldLabel htmlFor="manage-reverse-note">Reverse decision</FieldLabel>
            <select id="manage-reverse-note" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()}
              value={state.reverseDecision} onChange={(e) => patch({ reverseDecision: e.target.value as Decision })} aria-label="Reversal decision">
              {DECISION_OPTIONS.map((d) => <option key={d} value={d}>{DECISION_VERB[d] ?? d}</option>)}
            </select>
            <input type="text" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()}
              placeholder="Reason for reversal (required)" value={state.reverseNote} onChange={(e) => patch({ reverseNote: e.target.value })} aria-label="Reversal reason" />
            <button type="button" disabled={disabled}
              onClick={() => { if (window.confirm('Reverse the recorded decision? The prior decision is preserved in history.')) void onReverse(); }}
              className="w-full px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60" style={btnStyle('secondary')}>
              Reverse decision
            </button>
          </div>
        ) : null}

        {/* Recovery */}
        {recoveryCase?.id ? (
          <a href="/recoveries" className="block w-full text-center px-3 py-1.5 rounded-md text-xs font-semibold no-underline" style={btnStyle('secondary')}>
            Open recovery case →
          </a>
        ) : null}
      </div>
    </RailSection>
  );
}
