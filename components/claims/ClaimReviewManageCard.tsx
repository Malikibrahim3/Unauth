'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RailSection, ClaimLifecycleStatusBar, FieldLabel } from '@/components/claims/claimReviewPrimitives';
import { btnStyle, inputStyle } from '@/components/claims/claimReviewStyles';
import { EVIDENCE_TYPE_LABELS, EVIDENCE_SOURCE_LABELS } from '@/components/claims/claimReviewLabels';
import type { Decision, Outcome, EvidenceType, EvidenceSource, ClaimStatus } from '@/components/claims/claimReviewTypes';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';
import { Modal } from '@/components/ui/Modal';
import { ActionDock } from '@/components/authenticated/ActionDock';
import { Button } from '@/components/ui/Button';
import { Disclosure, Select, Textarea } from '@/components/ui';
import { decisionRequiresRationale, merchantDecisionSchema, type MerchantDecision } from '@/lib/claims/decision/merchantDecision';
import { formatMinorCurrencyNullable } from '@/lib/utils/format';
import { parseMajorUnitInput } from '@/lib/ui/merchantCopy';

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
  partial_refund: 'Partial refund', full_refund: 'Full refund', chargeback_disputed: 'Record chargeback dispute',
  internal_watch: 'Internal watch', no_action: 'No action',
};

export function ClaimReviewManageCard({
  wb,
  canManage,
  contextStatus = 'ready',
}: {
  wb: ClaimReviewWorkbench;
  canManage: boolean;
  contextStatus?: 'loading' | 'unavailable' | 'ready';
}) {
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
        <p className="ua-text-caption-role">
          You have read-only access. Recording decisions, evidence, and transitions requires the decision permission.
        </p>
      </RailSection>
    );
  }

  if (contextStatus !== 'ready') {
    return (
      <RailSection id="manage" title="Decision" open={state.railOpen.manage ?? true} onToggle={(id) => dispatch({ type: 'toggleRail', id })}>
        <p role="status" className="ua-text-caption-role">
          {contextStatus === 'loading'
            ? 'Decision controls will be available after the required evidence context loads.'
            : 'Decision controls are unavailable while the required evidence context cannot be loaded. Retry from Evidence & recommendations. This load failure did not change the recorded decision or recovery state.'}
        </p>
      </RailSection>
    );
  }

  const recoveryCase = (decisionData?.recoveryCase as { id?: string } | null | undefined) ?? null;
  const hasOutcome = Boolean(latestOutcome);
  const disabled = busy || !claimId;
  const hasDecision = DECISION_OPTIONS.includes(state.decision);
  const validation = merchantDecisionSchema.safeParse({ decision: state.decision, outcome: 'pending', notes: state.notes });
  const validationMessage = validation.success ? null : validation.error.issues[0]?.message ?? 'Check the decision details.';
  const currency = wb.selectedClaim?.currency ?? null;
  const monetaryDecision = ['approved', 'partial_refund', 'full_refund', 'denied', 'no_action'].includes(state.decision);
  const amountMinor = monetaryDecision ? parseMajorUnitInput(state.decisionAmount, currency) : null;
  const amountValid = !monetaryDecision || (amountMinor != null && amountMinor >= 0 && Boolean(currency));
  const decisionReady = !disabled && hasDecision && validation.success && amountValid;

  return (
    <RailSection id="manage" title="Decision" open={state.railOpen.manage ?? true} onToggle={(id) => dispatch({ type: 'toggleRail', id })}>
      <div className="flex flex-col gap-4">
        {/* Ownership */}
        <div className="order-2 space-y-1.5">
          <FieldLabel>Ownership</FieldLabel>
          <div className="flex gap-1.5">
            <button type="button" disabled={disabled} onClick={() => void onAssignment('assign_to_me')}
              className="ua-text-label flex-1 px-3 py-1.5 rounded-md" style={btnStyle(disabled ? 'disabled' : 'secondary')}>
              Assign to me
            </button>
            {wb.selectedClaim?.assigned_to ? (
              <button type="button" disabled={disabled} onClick={() => void onAssignment('unassign')}
                className="ua-text-label flex-1 px-3 py-1.5 rounded-md" style={btnStyle(disabled ? 'disabled' : 'secondary')}>
                Unassign
              </button>
            ) : null}
          </div>
        </div>

        {/* Record decision + outcome */}
        <div className="order-1 space-y-1.5">
          <FieldLabel htmlFor="manage-decision">Merchant decision</FieldLabel>
            <Select id="manage-decision" style={inputStyle()}
            value={state.decision} onChange={(e) => {
              setDecisionTouched(true);
              const decision = e.target.value as Decision;
              patch({ decision, outcome: 'pending' as Outcome });
            }} aria-label="Decision" aria-describedby="manage-decision-requirement">
            <option value="">Choose a decision…</option>
            {DECISION_OPTIONS.map((d) => <option key={d} value={d}>{DECISION_VERB[d] ?? d}</option>)}
          </Select>
          {monetaryDecision ? (
            <>
              <div className="grid grid-cols-[1fr_auto] gap-1.5">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  className="ua-text-dense w-full rounded-md px-2 py-1.5"
                  style={inputStyle()}
                  value={state.decisionAmount}
                  onChange={(event) => patch({ decisionAmount: event.target.value })}
                  onBlur={() => setDecisionTouched(true)}
                  aria-label="Decision amount"
                  placeholder="Amount"
                />
                <span className="ua-text-label flex min-w-12 items-center justify-center rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] px-2">
                  {currency ?? '—'}
                </span>
              </div>
              <p className="text-[length:var(--ua-text-metadata-size)] font-normal text-[var(--ua-text-tertiary)]">
                Enter {currency ?? 'the case currency'} in major units.
              </p>
            </>
          ) : null}
          <Textarea style={inputStyle()}
            placeholder={decisionRequiresRationale(state.decision as MerchantDecision) ? 'Rationale (required)' : 'Decision rationale (optional)'} value={state.notes}
            onChange={(e) => patch({ notes: e.target.value })} onBlur={() => setDecisionTouched(true)} aria-label="Decision rationale" />
          <span id="manage-decision-requirement" className="sr-only">
            {!claimId
              ? 'Select or save a case before recording a decision.'
              : !hasDecision
                ? 'Choose a decision before recording it.'
                : !amountValid
                  ? 'Enter a non-negative amount and known ISO currency.'
                  : !validation.success
                    ? validationMessage ?? 'Add a rationale before recording it.'
                  : 'This records the merchant decision; it does not send an external refund or replacement.'}
          </span>
          {decisionTouched && validationMessage && hasDecision ? <p role="alert" className="ua-text-dense text-[var(--ua-critical)]">{validationMessage}</p> : null}
          {decisionTouched && !amountValid ? <p role="alert" className="ua-text-dense text-[var(--ua-critical)]">Enter a non-negative amount and known ISO currency.</p> : null}
          <ActionDock
            copy={decisionReady
              ? 'Records an internal authorization only. No external payout is sent.'
              : 'Complete the decision, value, and required rationale.'}
            actions={(
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={!decisionReady}
                aria-describedby="manage-decision-requirement"
                onClick={() => setConfirming(true)}
              >
                {decisionReady ? 'Review decision' : 'Decision not ready'}
              </Button>
            )}
          />
        </div>

        <Disclosure
          className="order-3 rounded-md border border-[var(--ua-border-subtle)] p-3"
          summaryClassName="ua-text-label"
          summary="Manage evidence and lifecycle"
        >
          <div className="mt-3 space-y-4">
        {/* Add evidence */}
        <div className="space-y-1.5">
          <FieldLabel htmlFor="manage-evidence-type">Add evidence</FieldLabel>
          <Select id="manage-evidence-type" style={inputStyle()}
            value={state.evidenceType} onChange={(e) => patch({ evidenceType: e.target.value as EvidenceType })} aria-label="Evidence type">
            {EVIDENCE_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{EVIDENCE_TYPE_LABELS[t]}</option>)}
          </Select>
          <Select style={inputStyle()}
            value={state.source} onChange={(e) => patch({ source: e.target.value as EvidenceSource })} aria-label="Evidence source">
            {EVIDENCE_SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{EVIDENCE_SOURCE_LABELS[s]}</option>)}
          </Select>
          <input type="text" className="ua-text-dense w-full px-2 py-1.5 rounded-md" style={inputStyle()}
            placeholder="Evidence URL (optional)" value={state.evidenceUrl} onChange={(e) => patch({ evidenceUrl: e.target.value })} aria-label="Evidence URL" />
          <button type="button" disabled={disabled} onClick={() => void onEvidence()}
            className="ua-text-label w-full px-3 py-1.5 rounded-md" style={btnStyle(disabled ? 'disabled' : 'secondary')}>
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
            <input id="manage-snooze-days" type="number" min={1} max={30} className="ua-text-dense w-16 px-2 py-1.5 rounded-md" style={inputStyle()}
              value={state.snoozeDays} onChange={(e) => patch({ snoozeDays: e.target.value })} aria-label="Snooze days" />
            <input type="text" className="ua-text-dense flex-1 px-2 py-1.5 rounded-md" style={inputStyle()}
              placeholder="Reason (optional)" value={state.snoozeReason} onChange={(e) => patch({ snoozeReason: e.target.value })} aria-label="Snooze reason" />
          </div>
          <div className="flex gap-1.5">
            <button type="button" disabled={disabled} onClick={() => void onSnooze()}
              className="ua-text-label flex-1 px-3 py-1.5 rounded-md" style={btnStyle(disabled ? 'disabled' : 'secondary')}>Snooze</button>
            <button type="button" disabled={disabled} onClick={() => void onClearSnooze()}
              className="ua-text-label flex-1 px-3 py-1.5 rounded-md" style={btnStyle(disabled ? 'disabled' : 'secondary')}>Clear</button>
          </div>
        </div>

        {/* Reverse a recorded decision */}
        {hasOutcome ? (
          <div className="space-y-1.5">
            <FieldLabel htmlFor="manage-reverse-note">Reverse decision</FieldLabel>
            <Select id="manage-reverse-note" style={inputStyle()}
              value={state.reverseDecision} onChange={(e) => patch({ reverseDecision: e.target.value as Decision })} aria-label="Reversal decision">
              {DECISION_OPTIONS.map((d) => <option key={d} value={d}>{DECISION_VERB[d] ?? d}</option>)}
            </Select>
            <input type="text" className="ua-text-dense w-full px-2 py-1.5 rounded-md" style={inputStyle()}
              placeholder="Reason for reversal (required)" value={state.reverseNote} onChange={(e) => patch({ reverseNote: e.target.value })} aria-label="Reversal reason" />
            <button type="button" disabled={disabled || !state.reverseNote.trim()}
              onClick={() => setConfirmingReversal(true)}
              className="ua-text-label w-full px-3 py-1.5 rounded-md" style={btnStyle((disabled || !state.reverseNote.trim()) ? 'disabled' : 'secondary')}>
              Reverse decision
            </button>
          </div>
        ) : null}

        {/* Recovery */}
        {recoveryCase?.id ? (
          <Link href={`/recoveries/${recoveryCase.id}`} className="ua-text-label block w-full text-center px-3 py-1.5 rounded-md no-underline" style={btnStyle('secondary')}>
            Open recovery case
          </Link>
        ) : null}
          </div>
        </Disclosure>
        <a href="#source-case-details" className="ua-text-working-title order-4 text-[var(--ua-action-primary)]">View source data</a>
      </div>
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Record merchant decision"
        description="This records your authorization and its value. It does not send a refund, replacement, credit, or external claim."
        actions={[{
          label: busy ? 'Recording…' : 'Confirm & record',
          // §3.2 — authorizing a monetary decision into the append-only ledger is
          // the canonical commit action, not an ordinary accent forward action.
          variant: 'commit',
          onClick: () => {
            setConfirming(false);
            void onOutcome();
          },
        }]}
      >
        <dl className="ua-text-body space-y-3">
          <div className="flex justify-between gap-4"><dt>Decision</dt><dd className="font-medium">{DECISION_VERB[state.decision] ?? state.decision}</dd></div>
          <div className="flex justify-between gap-4"><dt>Authorized value</dt><dd className="font-sans tabular-nums font-medium">{monetaryDecision && amountValid ? formatMinorCurrencyNullable(amountMinor, currency) : 'Not applicable'}</dd></div>
          <div className="flex justify-between gap-4"><dt>External action</dt><dd className="font-medium">None</dd></div>
        </dl>
        <div className="ua-text-caption-role mt-4 rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] p-3">
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
        <p className="ua-text-body text-[var(--ua-text-secondary)]">
          New decision: <strong className="text-[var(--ua-text-primary)]">{DECISION_VERB[state.reverseDecision] ?? state.reverseDecision}</strong>
        </p>
        <p className="ua-text-body mt-2 text-[var(--ua-text-secondary)]">
          Rationale: {state.reverseNote.trim() || 'A rationale is required before recording a reversal.'}
        </p>
      </Modal>
    </RailSection>
  );
}
