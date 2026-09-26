'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RailSection, ClaimLifecycleStatusBar, FieldLabel } from '@/components/claims/claimReviewPrimitives';
import { btnStyle, inputStyle } from '@/components/claims/claimReviewStyles';
import { EVIDENCE_TYPE_LABELS, EVIDENCE_SOURCE_LABELS } from '@/components/claims/claimReviewLabels';
import type { Decision, Outcome, EvidenceType, EvidenceSource, ClaimStatus, ResolutionAction } from '@/components/claims/claimReviewTypes';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';
import { Modal } from '@/components/ui/Modal';
import { ActionDock } from '@/components/authenticated/ActionDock';
import { Button } from '@/components/ui/Button';
import { BeforeYouConfirm } from '@/components/ui/BeforeYouConfirm';
import { Disclosure, Select, Textarea } from '@/components/ui';
import { decisionRequiresRationale, merchantDecisionSchema, type MerchantDecision } from '@/lib/claims/decision/merchantDecision';
import { formatMinorCurrencyNullable } from '@/lib/utils/format';
import { parseMajorUnitInput } from '@/lib/ui/merchantCopy';

// Merchant-selectable decisions/outcomes are an explicit neutral allowlist —
// Accusation vocabulary is deliberately excluded from merchant decisions.
const DECISION_OPTIONS: Decision[] = [
  'approved', 'denied', 'escalated', 'partial_refund', 'full_refund', 'chargeback_disputed', 'internal_watch', 'no_action',
];
const EVIDENCE_TYPE_OPTIONS = Object.keys(EVIDENCE_TYPE_LABELS) as EvidenceType[];
const EVIDENCE_SOURCE_OPTIONS = Object.keys(EVIDENCE_SOURCE_LABELS) as EvidenceSource[];

// Readable decision/outcome verbs for the operator (the neutral audit copy in
// claimReviewLabels is intentionally uniform, so it can't label a picker).
const DECISION_VERB: Record<string, string> = {
  approved: 'Record payout authorisation', denied: 'Record denial under policy', escalated: 'Record escalation',
  partial_refund: 'Record partial refund authorisation', full_refund: 'Record full refund authorisation', chargeback_disputed: 'Record chargeback dispute',
  internal_watch: 'Record internal watch', no_action: 'Record no-action decision',
};

type ComparisonCost = {
  id: string;
  label: string;
  state: 'known' | 'verified_zero' | 'estimated' | 'unavailable';
  amountMinor: number | null;
  currency: string | null;
  provenance: string;
};
type ComparisonOption = {
  action: ResolutionAction;
  label: string;
  customerResolution: string;
  confirmable: boolean;
  unavailableReason: string | null;
  financial: boolean;
  costs: ComparisonCost[];
  missingComponents: string[];
  policyRestrictions: string[];
  contradictions: string[];
  preparedNextAction: string;
};
type ResolutionComparisonPayload = {
  version: string;
  token: string;
  caseVersion: number;
  evidenceVersion: string;
  policyVersion: string;
  currency: string | null;
  recommendation: string;
  recommendationUncertainty: string;
  priorConcession?: { count?: number };
  recovery: { recoverability: string; likelyOwner: string; nextAction: string; note: string };
  replacement: {
    ready: boolean;
    unavailableReasons: string[];
    order: {
      id: string;
      externalId: string;
      reference: string;
      currency: string | null;
      internalHref: string;
      providerHref: string | null;
      providerVerified: boolean;
    } | null;
    items: Array<{
      claimedItemId: string;
      sourceOrderLineId: string;
      lineExternalId: string;
      sku: string | null;
      variantRef: string | null;
      title: string;
      orderedQuantity: number;
      claimedQuantity: number;
      confirmedReplacementQuantity: number;
      outstandingAuthorisedQuantity: number;
      availableQuantity: number;
      costMinor: number | null;
      costCurrency: string | null;
      costProvenance: string;
    }>;
    latestHandoff: {
      id: string;
      state: string;
      stateVersion: number;
      externalReference: string | null;
      merchantReportedAt: string | null;
      observedSource: string | null;
      observedAt: string | null;
      amountMinor: number | null;
      currency: string | null;
      payload: Record<string, unknown>;
      actualCostMinor: number | null;
      actualCostCurrency: string | null;
      actualCostRecordedAt: string | null;
    } | null;
  } | null;
  options: ComparisonOption[];
};

const LEGACY_DECISION: Record<ResolutionAction, Decision> = {
  full_refund: 'full_refund',
  partial_refund: 'partial_refund',
  same_item_replacement: 'approved',
  request_evidence: 'escalated',
  escalate: 'escalated',
  no_additional_payout: 'no_action',
};

export function ClaimReviewManageCard({
  wb,
  canManage,
  contextStatus = 'ready',
  onDecisionRecorded,
}: {
  wb: ClaimReviewWorkbench;
  canManage: boolean;
  contextStatus?: 'loading' | 'unavailable' | 'ready';
  onDecisionRecorded?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [confirmingReversal, setConfirmingReversal] = useState(false);
  // B5: a pristine form shows no red. Validation surfaces only once the operator
  // has interacted with the decision fields (changed a select or touched notes).
  const [decisionTouched, setDecisionTouched] = useState(false);
  const {
    claimId, state, patch, busy, dispatch, claimIsClosed,
    onOutcome, onEvidence, onAssignment, onSnooze, onClearSnooze, onReverse,
    onStatusChange, onReopen, latestOutcome, decisionData, onReplacementDispatch, onReplacementCost,
  } = wb;

  if (!canManage) {
    return (
      <RailSection id="manage" title="Decision" open={state.railOpen.manage ?? false} onToggle={(id) => dispatch({ type: 'toggleRail', id })}>
        <p style={{ margin: 0, color: '#64686d', fontSize: 11.5, lineHeight: 1.45 }}>
          You have read-only access. Recording decisions, evidence, and transitions requires the decision permission.
        </p>
      </RailSection>
    );
  }

  if (contextStatus !== 'ready') {
    return (
      <RailSection id="manage" title="Decision" open={state.railOpen.manage ?? true} onToggle={(id) => dispatch({ type: 'toggleRail', id })}>
        <p role="status" style={{ margin: 0, color: '#64686d', fontSize: 11.5, lineHeight: 1.45 }}>
          {contextStatus === 'loading'
            ? 'Required evidence context is loading. Decision controls remain unavailable; no merchant decision or recovery state has changed.'
            : 'Decision controls are unavailable while the required evidence context cannot be loaded. Use Retry evidence context in Evidence & recommendations. This load failure did not change the recorded decision or recovery state.'}
        </p>
      </RailSection>
    );
  }

  const recoveryCase = (decisionData?.recoveryCase as { id?: string } | null | undefined) ?? null;
  const comparison = (decisionData?.resolutionComparison as ResolutionComparisonPayload | null | undefined) ?? null;
  const selectedResolution = comparison?.options.find((option) => option.action === state.resolution) ?? null;
  const replacement = comparison?.replacement ?? null;
  const replacementSelected = state.resolution === 'same_item_replacement';
  const hasOutcome = Boolean(latestOutcome);
  const disabled = busy || !claimId;
  const reversalCurrency = wb.selectedClaim?.currency ?? null;
  const monetaryReversal = ['approved', 'partial_refund', 'full_refund', 'denied', 'no_action'].includes(state.reverseDecision);
  const reversalAmount = monetaryReversal ? parseMajorUnitInput(state.reverseAmount ?? '', reversalCurrency) : null;
  const reversalReady = !disabled && Boolean(state.reverseNote.trim())
    && (!monetaryReversal || (Boolean(reversalCurrency) && reversalAmount != null && reversalAmount >= 0));
  const hasDecision = comparison
    ? Boolean(selectedResolution?.confirmable)
    : DECISION_OPTIONS.includes(state.decision);
  const validation = merchantDecisionSchema.safeParse({ decision: state.decision, outcome: 'pending', notes: state.notes });
  const validationMessage = validation.success ? null : validation.error.issues[0]?.message ?? 'Check the decision details.';
  const currency = replacementSelected
    ? (replacement?.order?.currency ?? comparison?.currency ?? wb.selectedClaim?.currency ?? null)
    : (comparison?.currency ?? wb.selectedClaim?.currency ?? null);
  const monetaryDecision = selectedResolution
    ? selectedResolution.financial
    : ['approved', 'partial_refund', 'full_refund', 'denied', 'no_action'].includes(state.decision);
  const amountMinor = monetaryDecision ? parseMajorUnitInput(state.decisionAmount, currency) : null;
  const amountValid = !monetaryDecision || (amountMinor != null && amountMinor >= 0 && Boolean(currency));
  const selectedReplacementItems = replacementSelected
    ? (replacement?.items ?? []).flatMap((item) => {
        const quantity = Number(state.replacementQuantities[item.claimedItemId] ?? 0);
        return Number.isInteger(quantity) && quantity > 0 ? [{ ...item, quantity }] : [];
      })
    : [];
  const replacementItemsValid = !replacementSelected || (
    replacement?.ready === true
    && selectedReplacementItems.length > 0
    && selectedReplacementItems.every((item) => item.quantity <= item.availableQuantity)
  );
  const duplicateJustificationValid = !replacementSelected
    || Number(comparison?.priorConcession?.count ?? 0) === 0
    || state.duplicateConcessionJustification.trim().length >= 3;
  const replacementRationaleValid = !replacementSelected || state.notes.trim().length >= 3;
  const decisionReady = !disabled && hasDecision && validation.success && amountValid
    && replacementItemsValid && duplicateJustificationValid && replacementRationaleValid;
  const authorizedValue = monetaryDecision && amountValid
    ? formatMinorCurrencyNullable(amountMinor, currency)
    : 'No financial value changes';

  return (
    <RailSection id="manage" title="Decision" open={state.railOpen.manage ?? true} onToggle={(id) => dispatch({ type: 'toggleRail', id })}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Ownership */}
        <div style={{ order: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <FieldLabel>Ownership</FieldLabel>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" disabled={disabled} onClick={() => void onAssignment('assign_to_me')}
              style={{ ...btnStyle(disabled ? 'disabled' : 'secondary'), flex: 1, padding: '6px 12px', borderRadius: 6, color: '#64686d', fontSize: 11, fontWeight: 500, lineHeight: '16px' }}>
              Assign to me
            </button>
            {wb.selectedClaim?.assigned_to ? (
              <button type="button" disabled={disabled} onClick={() => void onAssignment('unassign')}
                style={{ ...btnStyle(disabled ? 'disabled' : 'secondary'), flex: 1, padding: '6px 12px', borderRadius: 6, color: '#64686d', fontSize: 11, fontWeight: 500, lineHeight: '16px' }}>
                Unassign
              </button>
            ) : null}
          </div>
        </div>

        {/* Record decision + outcome */}
        <div style={{ order: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <FieldLabel htmlFor="manage-decision">{comparison ? 'Resolution to record' : 'Merchant decision'}</FieldLabel>
          {comparison ? (
            <div data-state-id="resolution-comparison-review" style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '9px 10px', border: '1px solid #eae8e5', borderRadius: 7, background: '#ffffff' }}>
              <div style={{ display: 'flex', gap: 8, color: '#64686d', fontSize: 10.5, lineHeight: 1.4 }}>
                <span style={{ flex: 1 }}>Case v{comparison.caseVersion} · evidence {comparison.evidenceVersion.split(':')[0]} items</span>
                <span>{comparison.policyVersion}</span>
              </div>
              <div style={{ color: '#40454a', fontSize: 11, lineHeight: 1.45 }}>
                Advisory: {comparison.recommendation.replaceAll('_', ' ')} · uncertainty {comparison.recommendationUncertainty.replaceAll('_', ' ')}
              </div>
              <div style={{ color: '#64686d', fontSize: 10.5, lineHeight: 1.45 }}>{comparison.recovery.note}</div>
            </div>
          ) : null}
            <Select id="manage-decision" style={inputStyle()}
            value={comparison ? state.resolution : state.decision} onChange={(e) => {
              setDecisionTouched(true);
              if (comparison) {
                const resolution = e.target.value as ResolutionAction | '';
                patch({
                  resolution,
                  decision: resolution ? LEGACY_DECISION[resolution] : '' as Decision,
                  outcome: 'pending' as Outcome,
                  replacementQuantities: resolution === 'same_item_replacement' ? state.replacementQuantities : {},
                  duplicateConcessionJustification: resolution === 'same_item_replacement' ? state.duplicateConcessionJustification : '',
                });
              } else {
                const decision = e.target.value as Decision;
                patch({ decision, resolution: '', outcome: 'pending' as Outcome });
              }
            }} aria-label="Decision" aria-describedby="manage-decision-requirement">
            <option value="">Choose a resolution…</option>
            {comparison
              ? comparison.options.map((option) => <option key={option.action} value={option.action}>{option.label}{option.confirmable ? '' : ' — review only'}</option>)
              : DECISION_OPTIONS.map((d) => <option key={d} value={d}>{DECISION_VERB[d] ?? d}</option>)}
          </Select>
          {selectedResolution ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '9px 10px', borderRadius: 7, background: '#f4f3f1' }}>
              <div style={{ color: '#1c1f23', fontSize: 11.5, lineHeight: 1.45 }}>{selectedResolution.customerResolution}</div>
              {selectedResolution.unavailableReason ? <div role="status" style={{ color: '#7a5310', fontSize: 10.5, lineHeight: 1.45 }}>{selectedResolution.unavailableReason}</div> : null}
              {selectedResolution.costs.map((cost) => (
                <div key={cost.id} style={{ display: 'flex', gap: 8, color: '#64686d', fontSize: 10.5, lineHeight: 1.4 }}>
                  <span style={{ flex: 1 }}>{cost.label} · {cost.provenance}</span>
                  <span>{cost.state === 'unavailable' ? 'unavailable' : `${formatMinorCurrencyNullable(cost.amountMinor, cost.currency)} · ${cost.state.replace('_', ' ')}`}</span>
                </div>
              ))}
              {[...selectedResolution.policyRestrictions, ...selectedResolution.contradictions].map((message) => <div key={message} style={{ color: '#7a5310', fontSize: 10.5, lineHeight: 1.45 }}>{message}</div>)}
              <div style={{ color: '#40454a', fontSize: 10.5, lineHeight: 1.45 }}>Next: {selectedResolution.preparedNextAction}</div>
            </div>
          ) : null}
          {replacementSelected && replacement ? (
            <div data-state-id="replacement-authorisation" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '9px 10px', border: '1px solid #e4e3e0', borderRadius: 7, background: '#ffffff' }}>
              <div style={{ color: '#40454a', fontSize: 11, fontWeight: 500, lineHeight: 1.45 }}>
                Original order {replacement.order?.reference ?? 'unavailable'}
              </div>
              {replacement.items.map((item) => (
                <label key={item.claimedItemId} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 70px', alignItems: 'center', gap: 8, color: '#40454a', fontSize: 10.5, lineHeight: 1.45 }}>
                  <span>
                    <span style={{ display: 'block', color: '#1c1f23', fontWeight: 500 }}>{item.title}</span>
                    <span style={{ display: 'block' }}>
                      SKU {item.sku ?? 'unavailable'} · variant {item.variantRef ?? 'unavailable'} · {item.availableQuantity} eligible
                    </span>
                    <span style={{ display: 'block', color: '#64686d' }}>
                      {item.claimedQuantity} claimed · {item.confirmedReplacementQuantity} confirmed replaced · {item.outstandingAuthorisedQuantity} authorised outstanding
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={item.availableQuantity}
                    step={1}
                    inputMode="numeric"
                    aria-label={`Replacement quantity for ${item.title}`}
                    value={state.replacementQuantities[item.claimedItemId] ?? ''}
                    onChange={(event) => patch({
                      replacementQuantities: {
                        ...state.replacementQuantities,
                        [item.claimedItemId]: event.target.value,
                      },
                    })}
                    onBlur={() => setDecisionTouched(true)}
                    style={{ ...inputStyle(), width: '100%', boxSizing: 'border-box', borderRadius: 6, padding: '6px 8px', color: '#40454a', fontSize: 12 }}
                  />
                </label>
              ))}
              {!replacementItemsValid && decisionTouched ? (
                <p role="alert" style={{ margin: 0, color: '#b0431a', fontSize: 10.5, lineHeight: 1.45 }}>
                  Select at least one positive whole-item quantity within the eligible limit.
                </p>
              ) : null}
              {Number(comparison?.priorConcession?.count ?? 0) > 0 ? (
                <Textarea
                  style={inputStyle()}
                  aria-label="Prior refund replacement justification"
                  placeholder="Why is a replacement appropriate after the prior refund? (required)"
                  value={state.duplicateConcessionJustification}
                  onChange={(event) => patch({ duplicateConcessionJustification: event.target.value })}
                  onBlur={() => setDecisionTouched(true)}
                />
              ) : null}
            </div>
          ) : null}
          {monetaryDecision ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6 }}>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  style={{ ...inputStyle(), boxSizing: 'border-box', width: '100%', borderRadius: 6, padding: '6px 8px', color: '#40454a', fontSize: 12, lineHeight: 1.45 }}
                  value={state.decisionAmount}
                  onChange={(event) => patch({ decisionAmount: event.target.value })}
                  onBlur={() => setDecisionTouched(true)}
                  aria-label="Decision amount"
                  placeholder={replacementSelected ? 'Authorised budget' : 'Amount'}
                />
                <span style={{ display: 'flex', minWidth: 48, alignItems: 'center', justifyContent: 'center', border: '1px solid #e4e3e0', borderRadius: 6, background: '#f4f3f1', padding: '0 8px', color: '#64686d', fontSize: 11, fontWeight: 500, lineHeight: '16px' }}>
                  {currency ?? '—'}
                </span>
              </div>
              <p style={{ margin: 0, color: '#6f6a63', fontSize: 10.5, fontWeight: 400 }}>
                Enter {currency ?? 'the case currency'} in major units{replacementSelected ? ' as the maximum replacement budget' : ''}.
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
                ? 'Choose an available resolution before recording it.'
                : !replacementItemsValid
                  ? 'Choose an eligible positive whole-item replacement quantity.'
                : !duplicateJustificationValid
                  ? 'Explain the duplicate concession before recording a replacement.'
                : !replacementRationaleValid
                  ? 'Add the replacement rationale.'
                : !amountValid
                  ? 'Enter a non-negative amount and known ISO currency.'
                  : !validation.success
                    ? validationMessage ?? 'Add a rationale before recording it.'
                  : 'This records the merchant decision; it does not send an external refund or replacement.'}
          </span>
          {decisionTouched && validationMessage && hasDecision ? <p role="alert" style={{ margin: 0, color: '#b0431a', fontSize: 12, lineHeight: 1.45 }}>{validationMessage}</p> : null}
          {decisionTouched && !amountValid ? <p role="alert" style={{ margin: 0, color: '#b0431a', fontSize: 12, lineHeight: 1.45 }}>Enter a non-negative amount and known ISO currency.</p> : null}
          <ActionDock
            copy={decisionReady
              ? replacementSelected
                ? 'Records an internal replacement authorisation and prepares a manual handoff. No order is created.'
                : 'Records an internal authorization only. No external payout is sent.'
              : 'Complete the decision, value, and required rationale.'}
            actions={(
              <Button
                type="button"
                size="sm"
                style={{ width: '100%' }}
                disabled={!decisionReady}
                aria-describedby="manage-decision-requirement"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setConfirming(true);
                }}
              >
                {decisionReady ? 'Review decision' : 'Decision not ready'}
              </Button>
            )}
          />
        </div>

        <Disclosure
          style={{ order: 3, border: '1px solid #eae8e5', borderRadius: 6, padding: 12 }}
          summaryStyle={{ color: '#64686d', fontSize: 11, fontWeight: 500, lineHeight: '16px' }}
          summary="Manage evidence and lifecycle"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
        {/* Add evidence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <FieldLabel htmlFor="manage-evidence-type">Add evidence</FieldLabel>
          <Select id="manage-evidence-type" style={inputStyle()}
            value={state.evidenceType} onChange={(e) => patch({ evidenceType: e.target.value as EvidenceType })} aria-label="Evidence type">
            {EVIDENCE_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{EVIDENCE_TYPE_LABELS[t]}</option>)}
          </Select>
          <Select style={inputStyle()}
            value={state.source} onChange={(e) => patch({ source: e.target.value as EvidenceSource })} aria-label="Evidence source">
            {EVIDENCE_SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{EVIDENCE_SOURCE_LABELS[s]}</option>)}
          </Select>
          <input type="text" style={{ ...inputStyle(), boxSizing: 'border-box', width: '100%', padding: '6px 8px', borderRadius: 6, color: '#40454a', fontSize: 12, lineHeight: 1.45 }}
            placeholder="Evidence URL (optional)" value={state.evidenceUrl} onChange={(e) => patch({ evidenceUrl: e.target.value })} aria-label="Evidence URL" />
          <button type="button" disabled={disabled} onClick={() => void onEvidence()}
            style={{ ...btnStyle(disabled ? 'disabled' : 'secondary'), width: '100%', padding: '6px 12px', borderRadius: 6, color: '#64686d', fontSize: 11, fontWeight: 500, lineHeight: '16px' }}>
            Add evidence
          </button>
        </div>

        {/* Lifecycle: transition / reopen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <FieldLabel htmlFor="manage-snooze-days">Snooze follow-up</FieldLabel>
          <div style={{ display: 'flex', gap: 6 }}>
            <input id="manage-snooze-days" type="number" min={1} max={30} style={{ ...inputStyle(), width: 64, padding: '6px 8px', borderRadius: 6, color: '#40454a', fontSize: 12, lineHeight: 1.45 }}
              value={state.snoozeDays} onChange={(e) => patch({ snoozeDays: e.target.value })} aria-label="Snooze days" />
            <input type="text" style={{ ...inputStyle(), flex: 1, padding: '6px 8px', borderRadius: 6, color: '#40454a', fontSize: 12, lineHeight: 1.45 }}
              placeholder="Reason (optional)" value={state.snoozeReason} onChange={(e) => patch({ snoozeReason: e.target.value })} aria-label="Snooze reason" />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" disabled={disabled} onClick={() => void onSnooze()}
              style={{ ...btnStyle(disabled ? 'disabled' : 'secondary'), flex: 1, padding: '6px 12px', borderRadius: 6, color: '#64686d', fontSize: 11, fontWeight: 500, lineHeight: '16px' }}>Snooze</button>
            <button type="button" disabled={disabled} onClick={() => void onClearSnooze()}
              style={{ ...btnStyle(disabled ? 'disabled' : 'secondary'), flex: 1, padding: '6px 12px', borderRadius: 6, color: '#64686d', fontSize: 11, fontWeight: 500, lineHeight: '16px' }}>Clear</button>
          </div>
        </div>

        {/* Reverse a recorded decision */}
        {hasOutcome ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel htmlFor="manage-reverse-note">Reverse decision</FieldLabel>
            <Select id="manage-reverse-note" style={inputStyle()}
              value={state.reverseDecision} onChange={(e) => patch({ reverseDecision: e.target.value as Decision })} aria-label="Reversal decision">
              {DECISION_OPTIONS.map((d) => <option key={d} value={d}>{DECISION_VERB[d] ?? d}</option>)}
            </Select>
            <input type="text" style={{ ...inputStyle(), boxSizing: 'border-box', width: '100%', padding: '6px 8px', borderRadius: 6, color: '#40454a', fontSize: 12, lineHeight: 1.45 }}
              placeholder="Reason for reversal (required)" value={state.reverseNote} onChange={(e) => patch({ reverseNote: e.target.value })} aria-label="Reversal reason" />
            {monetaryReversal ? <label style={{ display: 'grid', gap: 5, color: '#64686d', fontSize: 11 }}>
              Replacement decision amount · {reversalCurrency ?? 'currency unavailable'}
              <input aria-label="Replacement decision amount" inputMode="decimal" value={state.reverseAmount ?? ''}
                onChange={(event) => patch({ reverseAmount: event.target.value })} disabled={disabled || !reversalCurrency}
                style={{ ...inputStyle(), boxSizing: 'border-box', width: '100%', padding: '6px 8px', borderRadius: 6, color: '#40454a', fontSize: 12 }} />
              <span>Enter a nonnegative amount in {reversalCurrency ?? 'the verified case currency'}, including 0 for no authorised payout. This replaces the recorded decision; it does not move money.</span>
            </label> : null}
            <button type="button" disabled={!reversalReady}
              onClick={() => setConfirmingReversal(true)}
              style={{ ...btnStyle(!reversalReady ? 'disabled' : 'secondary'), width: '100%', padding: '6px 12px', borderRadius: 6, color: '#64686d', fontSize: 11, fontWeight: 500, lineHeight: '16px' }}>
              Reverse decision
            </button>
          </div>
        ) : null}

        {/* Recovery */}
        {recoveryCase?.id ? (
          <Link href={`/financials/recovery/${recoveryCase.id}`} style={{ ...btnStyle('secondary'), display: 'block', width: '100%', borderRadius: 6, padding: '6px 12px', color: '#64686d', fontSize: 11, fontWeight: 500, lineHeight: '16px', textAlign: 'center', textDecoration: 'none' }}>
            Open recovery case
          </Link>
        ) : null}
          </div>
        </Disclosure>
        {replacement?.latestHandoff ? (
          <div data-state-id="replacement-manual-handoff" style={{ order: 4, display: 'flex', flexDirection: 'column', gap: 8, padding: 12, border: '1px solid #e4e3e0', borderRadius: 7, background: '#ffffff' }}>
            <div style={{ color: '#1c1f23', fontSize: 11.5, fontWeight: 500 }}>Manual replacement handoff</div>
            <div style={{ color: '#64686d', fontSize: 10.5, lineHeight: 1.45 }}>
              State: {replacement.latestHandoff.state.replaceAll('_', ' ')}. Opening or copying does not dispatch a replacement.
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                style={{ ...btnStyle('secondary'), flex: 1, padding: '6px 12px', borderRadius: 6, color: '#64686d', fontSize: 11, fontWeight: 500 }}
                onClick={() => {
                  const instructions = replacement.latestHandoff?.payload.manual_instructions;
                  const items = replacement.latestHandoff?.payload.items;
                  const text = JSON.stringify({ instructions, items, budget_minor: replacement.latestHandoff?.amountMinor, currency: replacement.latestHandoff?.currency }, null, 2);
                  void navigator.clipboard.writeText(text).then(
                    () => wb.showMsg('Manual replacement instructions copied. Dispatch was not recorded.', 'success'),
                    () => wb.showMsg('Clipboard copy is unavailable. Dispatch was not recorded.', 'error'),
                  );
                }}
              >
                Copy instructions
              </button>
              {replacement.order?.providerHref ? (
                <a href={replacement.order.providerHref} target="_blank" rel="noreferrer" style={{ ...btnStyle('secondary'), flex: 1, display: 'block', padding: '6px 12px', borderRadius: 6, color: '#64686d', fontSize: 11, fontWeight: 500, textAlign: 'center', textDecoration: 'none' }}>
                  Open original order
                </a>
              ) : null}
            </div>
            {replacement.latestHandoff.state === 'handoff_ready' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  type="text"
                  style={{ ...inputStyle(), boxSizing: 'border-box', width: '100%', padding: '6px 8px', borderRadius: 6, color: '#40454a', fontSize: 12 }}
                  placeholder="Shopify replacement reference"
                  aria-label="Shopify replacement reference"
                  value={state.replacementExternalReference}
                  onChange={(event) => patch({ replacementExternalReference: event.target.value })}
                />
                <Textarea
                  style={inputStyle()}
                  placeholder="Retained receipt note"
                  aria-label="Replacement receipt note"
                  value={state.replacementReceiptNote}
                  onChange={(event) => patch({ replacementReceiptNote: event.target.value })}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={disabled || (!state.replacementExternalReference.trim() && !state.replacementReceiptNote.trim())}
                  onClick={() => void onReplacementDispatch(replacement.latestHandoff!.id, replacement.latestHandoff!.stateVersion)}
                >
                  Record merchant-confirmed dispatch
                </Button>
              </div>
            ) : null}
            {replacement.latestHandoff.merchantReportedAt && replacement.latestHandoff.actualCostMinor == null ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8, borderTop: '1px solid #eae8e5' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6 }}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    style={{ ...inputStyle(), boxSizing: 'border-box', width: '100%', padding: '6px 8px', borderRadius: 6, color: '#40454a', fontSize: 12 }}
                    placeholder="Actual replacement cost"
                    aria-label="Actual replacement cost"
                    value={state.replacementActualCost}
                    onChange={(event) => patch({ replacementActualCost: event.target.value })}
                  />
                  <span style={{ display: 'flex', minWidth: 48, alignItems: 'center', justifyContent: 'center', border: '1px solid #e4e3e0', borderRadius: 6, background: '#f4f3f1', padding: '0 8px', color: '#64686d', fontSize: 11 }}>
                    {replacement.latestHandoff.currency ?? '—'}
                  </span>
                </div>
                <Textarea
                  style={inputStyle()}
                  placeholder="Cost receipt evidence note"
                  aria-label="Replacement cost evidence note"
                  value={state.replacementCostNote}
                  onChange={(event) => patch({ replacementCostNote: event.target.value })}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={disabled || parseMajorUnitInput(state.replacementActualCost, replacement.latestHandoff.currency) == null || state.replacementCostNote.trim().length < 3}
                  onClick={() => void onReplacementCost({
                    id: replacement.latestHandoff!.id,
                    externalReference: replacement.latestHandoff!.externalReference,
                    currency: replacement.latestHandoff!.currency,
                  })}
                >
                  Record actual cost
                </Button>
              </div>
            ) : null}
            <dl data-state-id="replacement-outcome-corroboration" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '5px 12px', margin: 0, color: '#64686d', fontSize: 10.5, lineHeight: 1.45 }}>
              <dt>Authorised</dt><dd style={{ margin: 0 }}>{formatMinorCurrencyNullable(replacement.latestHandoff.amountMinor, replacement.latestHandoff.currency)}</dd>
              <dt>Merchant-confirmed dispatch</dt><dd style={{ margin: 0 }}>{replacement.latestHandoff.merchantReportedAt ? 'recorded' : 'not recorded'}</dd>
              <dt>Source corroboration</dt><dd style={{ margin: 0 }}>{replacement.latestHandoff.observedAt ? 'observed' : 'unavailable'}</dd>
              <dt>Actual cost incurred</dt><dd style={{ margin: 0 }}>{replacement.latestHandoff.actualCostMinor == null ? 'unavailable' : formatMinorCurrencyNullable(replacement.latestHandoff.actualCostMinor, replacement.latestHandoff.actualCostCurrency)}</dd>
              <dt>Recovery</dt><dd style={{ margin: 0 }}>{comparison?.recovery.recoverability.replaceAll('_', ' ') ?? 'unavailable'}</dd>
              <dt>Reconciled money</dt><dd style={{ margin: 0 }}>{replacement.latestHandoff.state === 'reconciled' ? 'reconciled' : 'not reconciled'}</dd>
            </dl>
            {replacement.latestHandoff.externalReference ? <div style={{ color: '#64686d', fontSize: 10.5 }}>Reference: {replacement.latestHandoff.externalReference}</div> : null}
          </div>
        ) : null}
      </div>
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        pending={busy}
        pendingMessage="Recording the merchant decision and manual handoff atomically."
        title="Record merchant decision"
        description="This records your authorization and its value. It does not send a refund, replacement, credit, or external claim."
        overlayId="record-merchant-decision-modal"
        actions={[{
          label: busy ? 'Recording…' : 'Confirm & record',
          // §3.2 — authorizing a monetary decision into the append-only ledger is
          // the canonical commit action, not an ordinary accent forward action.
          variant: 'commit',
          onClick: () => {
            void (async () => {
              const result = await onOutcome();
              if (result?.ok) {
                setConfirming(false);
                onDecisionRecorded?.();
              }
            })();
          },
        }]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <dl style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: 0, color: '#40454a', fontSize: 13, lineHeight: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><dt>Resolution</dt><dd style={{ margin: 0, fontWeight: 500 }}>{selectedResolution?.label ?? DECISION_VERB[state.decision] ?? state.decision}</dd></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><dt>Authorized value</dt><dd style={{ margin: 0, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{authorizedValue}</dd></div>
            {comparison ? <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><dt>Snapshot</dt><dd style={{ margin: 0, fontWeight: 500 }}>case v{comparison.caseVersion} · {comparison.token.slice(0, 10)}</dd></div> : null}
            {replacementSelected && replacement?.order ? <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><dt>Original order</dt><dd style={{ margin: 0, fontWeight: 500 }}>{replacement.order.reference}</dd></div> : null}
            {replacementSelected ? selectedReplacementItems.map((item) => <div key={item.claimedItemId} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><dt>{item.title}</dt><dd style={{ margin: 0, fontWeight: 500 }}>{item.quantity} · SKU {item.sku ?? 'unavailable'} · variant {item.variantRef ?? 'unavailable'}</dd></div>) : null}
            {replacementSelected ? <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><dt>Rationale</dt><dd style={{ margin: 0, maxWidth: 280, textAlign: 'right' }}>{state.notes.trim()}</dd></div> : null}
          </dl>
          <BeforeYouConfirm
            objectSummary={`${claimId} · merchant decision`}
            valueSummary={`${authorizedValue}${currency && authorizedValue !== 'No financial value changes' ? ` ${currency}` : ''}`}
            externalAction={replacementSelected
              ? 'Unauth prepares exact manual Shopify instructions after recording. It does not create an order, reserve stock, change an address, ship anything, or notify the customer.'
              : selectedResolution?.preparedNextAction ?? 'For a refund authorisation, Unauth prepares an exact manual Shopify handoff after recording. It does not call Shopify, move money, or notify the customer.'}
            reversible="No. A reversal appends a new record; it never edits this one."
            appendOnly="A merchant-decision event and its authorized stage. Paid value, confirmed loss and recovery remain unavailable until their own evidence arrives."
          />
        </div>
      </Modal>
      <Modal
        open={confirmingReversal}
        onClose={() => setConfirmingReversal(false)}
        title="Reverse merchant decision"
        description={`${claimId} · the original decision remains in the immutable activity history`}
        overlayId="reverse-merchant-decision-modal"
        actions={[{
          label: 'Record reversal',
          variant: 'danger',
          disabled: !reversalReady,
          onClick: () => {
            setConfirmingReversal(false);
            void onReverse();
          },
        }]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, color: '#64686d', fontSize: 13, lineHeight: '20px' }}>
            New decision: <strong style={{ color: '#1c1f23' }}>{DECISION_VERB[state.reverseDecision] ?? state.reverseDecision}</strong>
          </p>
          {monetaryReversal ? <p>Replacement authorised amount: <strong>{formatMinorCurrencyNullable(reversalAmount, reversalCurrency)} · {reversalCurrency ?? 'currency unavailable'}</strong></p> : null}
          <p style={{ margin: 0, color: '#64686d', fontSize: 13, lineHeight: '20px' }}>
            Rationale: {state.reverseNote.trim() || 'A rationale is required before recording a reversal.'}
          </p>
          <BeforeYouConfirm
            objectSummary={`${claimId} · reversal of the latest merchant decision`}
            valueSummary={monetaryReversal ? `${formatMinorCurrencyNullable(reversalAmount, reversalCurrency)} · ${reversalCurrency ?? 'currency unavailable'}` : 'No monetary authorisation'}
            externalAction="No external action is performed. Any refund, credit or replacement that already occurred is not recalled by this reversal."
            reversible="Append-only. The original decision remains visible in case history."
            appendOnly="A reversal event referencing the original decision. Any correcting financial stage is recorded separately from source-backed evidence."
          />
        </div>
      </Modal>
    </RailSection>
  );
}
