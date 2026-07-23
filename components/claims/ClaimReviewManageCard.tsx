'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RailSection, ClaimLifecycleStatusBar, FieldLabel } from '@/components/claims/claimReviewPrimitives';
import { btnStyle, inputStyle } from '@/components/claims/claimReviewStyles';
import { EVIDENCE_TYPE_LABELS, EVIDENCE_SOURCE_LABELS } from '@/components/claims/claimReviewLabels';
import type { Decision, Outcome, EvidenceType, EvidenceSource, ClaimStatus } from '@/components/claims/claimReviewTypes';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';
import { Modal } from '@/components/ui/Modal';
import { decisionRequiresRationale, merchantDecisionSchema, type MerchantDecision } from '@/lib/claims/decision/merchantDecision';
import { formatClaimMoney } from '@/components/claims/claimReviewStyles';

// Merchant-selectable decisions/outcomes are an explicit neutral allowlist —
// accusation vocabulary is deliberately excluded (see docs/PRODUCT.md).
const DECISION_OPTIONS: Decision[] = [
  'approved', 'denied', 'escalated', 'partial_refund', 'full_refund', 'chargeback_disputed', 'internal_watch', 'no_action',
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

export function ClaimReviewManageCard({ wb, canManage }: { wb: ClaimReviewWorkbench; canManage: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [confirmingReversal, setConfirmingReversal] = useState(false);
  // B5: a pristine form shows no red. Validation surfaces only once the operator
  // has interacted with the decision fields (changed a select or touched notes).
  const [decisionTouched, setDecisionTouched] = useState(false);
  const {
    claimId, state, patch, busy, dispatch, claimIsClosed,
    onOutcome, onEvidence, onAssignment, onSnooze, onClearSnooze, onReverse,
    onStatusChange, onReopen, latestOutcome, decisionData,
  } = wb;

  if (!canManage) {
    return (
      <RailSection id="manage" title="Decision" open={state.railOpen.manage ?? false} onToggle={(id) => dispatch({ type: 'toggleRail', id })}>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          You have read-only access. Recording decisions, evidence, and transitions requires the payout-decision permission.
        </p>
      </RailSection>
    );
  }

  const recoveryCase = (decisionData?.recoveryCase as { id?: string } | null | undefined) ?? null;
  const hasOutcome = Boolean(latestOutcome);
  const disabled = busy || !claimId;
  const validation = merchantDecisionSchema.safeParse({ decision: state.decision, outcome: 'pending', notes: state.notes });
  const validationMessage = validation.success ? null : validation.error.issues[0]?.message ?? 'Check the decision details.';
  const currency = wb.selectedClaim?.currency ?? null;
  const amount = Number(state.decisionAmount);
  const monetaryDecision = ['approved', 'partial_refund', 'full_refund', 'denied', 'no_action'].includes(state.decision);
  const amountValid = !monetaryDecision || (Number.isFinite(amount) && amount >= 0 && Boolean(currency));

  return (
    <RailSection id="manage" title="Decision" open={state.railOpen.manage ?? true} onToggle={(id) => dispatch({ type: 'toggleRail', id })}>
      <div className="flex flex-col gap-4">
        {/* Ownership */}
        <div className="order-2 space-y-1.5">
          <FieldLabel>Ownership</FieldLabel>
          <div className="flex gap-1.5">
            <button type="button" disabled={disabled} onClick={() => void onAssignment('assign_to_me')}
              className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60" style={btnStyle('secondary')}>
              Assign to me
            </button>
            {wb.selectedClaim?.assigned_to ? (
              <button type="button" disabled={disabled} onClick={() => void onAssignment('unassign')}
                className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60" style={btnStyle('secondary')}>
                Unassign
              </button>
            ) : null}
          </div>
        </div>

        {/* Record decision + outcome */}
        <div className="order-1 space-y-1.5">
          <FieldLabel htmlFor="manage-decision">Merchant decision</FieldLabel>
          <select id="manage-decision" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()}
            value={state.decision} onChange={(e) => {
              setDecisionTouched(true);
              const decision = e.target.value as Decision;
              patch({ decision, outcome: 'pending' as Outcome });
            }} aria-label="Decision">
            {DECISION_OPTIONS.map((d) => <option key={d} value={d}>{DECISION_VERB[d] ?? d}</option>)}
          </select>
          {monetaryDecision ? (
            <div className="grid grid-cols-[1fr_auto] gap-1.5">
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full rounded-md px-2 py-1.5 text-xs"
                style={inputStyle()}
                value={state.decisionAmount}
                onChange={(event) => patch({ decisionAmount: event.target.value })}
                onBlur={() => setDecisionTouched(true)}
                aria-label="Decision amount"
                placeholder="Amount"
              />
              <span className="flex min-w-12 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] px-2 text-xs font-semibold">
                {currency ?? '—'}
              </span>
            </div>
          ) : null}
          <textarea className="min-h-20 w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()}
            placeholder={decisionRequiresRationale(state.decision as MerchantDecision) ? 'Rationale (required)' : 'Decision rationale (optional)'} value={state.notes}
            onChange={(e) => patch({ notes: e.target.value })} onBlur={() => setDecisionTouched(true)} aria-label="Decision rationale" />
          {decisionTouched && validationMessage ? <p role="alert" className="text-xs text-[var(--danger)]">{validationMessage}</p> : null}
          {decisionTouched && !amountValid ? <p role="alert" className="text-xs text-[var(--danger)]">Enter a non-negative amount and known ISO currency.</p> : null}
          <button type="button" disabled={disabled || !validation.success || !amountValid}
            onClick={() => setConfirming(true)}
            className="w-full px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60" style={btnStyle('primary')}>
            Record decision
          </button>
        </div>

        <details className="order-3 rounded-md border border-[var(--border-muted)] p-3">
          <summary className="cursor-pointer text-xs font-semibold text-[var(--text-secondary)]">Manage evidence and lifecycle</summary>
          <div className="mt-3 space-y-4">
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
            Open recovery case
          </Link>
        ) : null}
          </div>
        </details>
        <a href="#source-case-details" className="order-4 text-xs font-semibold text-[var(--accent)]">View source data</a>
      </div>
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Record merchant decision"
        description="This records your authorization and its value. It does not send a refund, replacement, credit, or external claim."
        actions={[{
          label: busy ? 'Recording…' : 'Confirm & record',
          onClick: () => {
            setConfirming(false);
            void onOutcome();
          },
        }]}
      >
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4"><dt>Decision</dt><dd className="font-medium">{DECISION_VERB[state.decision] ?? state.decision}</dd></div>
          <div className="flex justify-between gap-4"><dt>Authorized value</dt><dd className="font-mono font-medium">{monetaryDecision && amountValid ? formatClaimMoney(amount, currency) : 'Not applicable'}</dd></div>
          <div className="flex justify-between gap-4"><dt>External action</dt><dd className="font-medium">None</dd></div>
        </dl>
        <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] p-3 text-xs text-[var(--text-secondary)]">
          The approval stage is recorded in the append-only ledger. Paid value, realised loss, prevented value, and recovery are recorded only after their separate source or observation evidence arrives.
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
