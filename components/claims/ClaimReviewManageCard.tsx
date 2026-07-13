'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RailSection, ClaimLifecycleStatusBar, FieldLabel } from '@/components/claims/claimReviewPrimitives';
import { btnStyle, inputStyle } from '@/components/claims/claimReviewStyles';
import { EVIDENCE_TYPE_LABELS, EVIDENCE_SOURCE_LABELS } from '@/components/claims/claimReviewLabels';
import type { Decision, Outcome, EvidenceType, EvidenceSource, ClaimStatus } from '@/components/claims/claimReviewTypes';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';
import { Modal } from '@/components/ui/Modal';
import { allowedOutcomes, decisionRequiresRationale, merchantDecisionSchema, type MerchantDecision } from '@/lib/claims/decision/merchantDecision';
import { formatClaimMoney } from '@/components/claims/claimReviewStyles';

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
  const [confirming, setConfirming] = useState(false);
  const [confirmingReversal, setConfirmingReversal] = useState(false);
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
  const validOutcomes = allowedOutcomes(state.decision as MerchantDecision);
  const validation = merchantDecisionSchema.safeParse({ decision: state.decision, outcome: state.outcome, notes: state.notes });
  const validationMessage = validation.success ? null : validation.error.issues[0]?.message ?? 'Check the decision details.';
  const amount = wb.selectedClaim?.amount_at_risk ?? null;
  const currency = wb.selectedClaim?.currency ?? null;

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
            value={state.decision} onChange={(e) => {
              const decision = e.target.value as Decision;
              const outcomes = allowedOutcomes(decision as MerchantDecision);
              patch({ decision, outcome: outcomes.includes(state.outcome as never) ? state.outcome : outcomes[0] as Outcome });
            }} aria-label="Decision">
            {DECISION_OPTIONS.map((d) => <option key={d} value={d}>{DECISION_VERB[d] ?? d}</option>)}
          </select>
          <select className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()}
            value={state.outcome} onChange={(e) => patch({ outcome: e.target.value as Outcome })} aria-label="Outcome">
            {OUTCOME_OPTIONS.filter((outcome) => validOutcomes.includes(outcome as never)).map((o) => <option key={o} value={o}>{OUTCOME_VERB[o] ?? o}</option>)}
          </select>
          <textarea className="min-h-20 w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()}
            placeholder={decisionRequiresRationale(state.decision as MerchantDecision) ? 'Rationale (required)' : 'Decision rationale (optional)'} value={state.notes} onChange={(e) => patch({ notes: e.target.value })} aria-label="Decision rationale" />
          {validationMessage ? <p role="alert" className="text-xs text-[var(--danger)]">{validationMessage}</p> : null}
          <button type="button" disabled={disabled || !validation.success}
            onClick={() => setConfirming(true)}
            className="w-full px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60" style={btnStyle('primary')}>
            Review decision
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
            currentStatus={wb.selectedClaim?.status ?? null}
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
            <button type="button" disabled={disabled || !state.reverseNote.trim()}
              onClick={() => setConfirmingReversal(true)}
              className="w-full px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60" style={btnStyle('secondary')}>
              Reverse decision
            </button>
          </div>
        ) : null}

        {/* Recovery */}
        {recoveryCase?.id ? (
          <Link href={`/recoveries/${recoveryCase.id}`} className="block w-full text-center px-3 py-1.5 rounded-md text-xs font-semibold no-underline" style={btnStyle('secondary')}>
            Open recovery case →
          </Link>
        ) : null}
      </div>
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Record merchant decision"
        description="This action is append-only and will be attributed to your account."
        actions={[{
          label: busy ? 'Recording…' : 'Record decision',
          onClick: () => {
            setConfirming(false);
            void onOutcome();
          },
        }]}
      >
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4"><dt>Decision</dt><dd className="font-medium">{DECISION_VERB[state.decision] ?? state.decision}</dd></div>
          <div className="flex justify-between gap-4"><dt>Recorded outcome</dt><dd className="font-medium">{OUTCOME_VERB[state.outcome] ?? state.outcome}</dd></div>
          <div className="flex justify-between gap-4"><dt>Amount at risk</dt><dd className="font-mono font-medium">{amount == null ? 'Not available' : formatClaimMoney(amount, currency)}</dd></div>
        </dl>
        <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] p-3 text-xs text-[var(--text-secondary)]">
          Financial ledger entries, and any resulting loss or recovery records, are created by the audited projection workflow. The source request itself is not modified automatically.
        </div>
      </Modal>
      <Modal
        open={confirmingReversal}
        onClose={() => setConfirmingReversal(false)}
        title="Reverse recorded decision"
        description="The original decision remains in the immutable activity history."
        actions={[{
          label: 'Record reversal',
          variant: 'danger',
          onClick: () => {
            setConfirmingReversal(false);
            void onReverse();
          },
        }]}
      >
        <p className="text-sm text-[var(--text-secondary)]">
          New decision: <strong className="text-[var(--text-primary)]">{DECISION_VERB[state.reverseDecision] ?? state.reverseDecision}</strong>
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Rationale: {state.reverseNote.trim() || 'A rationale is required before recording a reversal.'}
        </p>
      </Modal>
    </RailSection>
  );
}
