'use client';

import {
  DECISION_LABELS,
  OUTCOME_LABELS,
} from '@/components/claims/claimReviewLabels';
import { btnStyle, inputStyle } from '@/components/claims/claimReviewStyles';
import {
  EVIDENCE_SOURCE_LABELS,
  EVIDENCE_TYPE_LABELS,
  FieldLabel,
  RailSection,
} from '@/components/claims/claimReviewPrimitives';
import { nextMetaRowId } from '@/components/claims/claimReviewReducer';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';
import type { Decision, EvidenceSource, EvidenceType, Outcome } from '@/components/claims/claimReviewTypes';

export function ClaimReviewEvidenceRail({ wb }: { wb: ClaimReviewWorkbench }) {
  const {
    claimId,
    busy,
    primaryAction,
    selectedClaim,
    claimIsClosed,
    latestOutcome,
    evidenceRecorded,
    responseRecorded,
    customerResponse,
    state,
    patch,
    dispatch,
    onEvidence,
    onOutcome,
    onCopyCustomerResponse,
    onReverse,
  } = wb;

  return (
    <>
      <RailSection
        id="evidence"
        title="Add evidence"
        open={state.railOpen.evidence}
        onToggle={(id) => dispatch({ type: 'toggleRail', id })}
        highlighted={primaryAction.railSection === 'evidence'}
        badge={evidenceRecorded ? (
          <span className="text-xs rounded-full px-1.5 py-0.5 font-semibold" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>On record</span>
        ) : undefined}
      >
        {!claimId && (
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Save the claim first. Evidence attaches to an active claim record.</p>
        )}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel htmlFor="evidence-type">Type</FieldLabel>
              <select id="evidence-type" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={state.evidenceType} onChange={(e) => patch({ evidenceType: e.target.value as EvidenceType })}>
                {(Object.entries(EVIDENCE_TYPE_LABELS) as [EvidenceType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="evidence-source">Source</FieldLabel>
              <select id="evidence-source" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={state.source} onChange={(e) => patch({ source: e.target.value as EvidenceSource })}>
                {(Object.entries(EVIDENCE_SOURCE_LABELS) as [EvidenceSource, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="evidence-url">Evidence URL (optional)</FieldLabel>
            <input id="evidence-url" aria-label="Evidence URL (optional)" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} placeholder="https://…" value={state.evidenceUrl} onChange={(e) => patch({ evidenceUrl: e.target.value })} />
          </div>
          <button type="button" aria-label={state.showMeta ? 'Hide advanced evidence fields' : 'Show advanced evidence fields'} onClick={() => patch({ showMeta: !state.showMeta })} className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>
            {state.showMeta ? '▲ Hide' : '▼ Advanced'}: hash &amp; metadata
          </button>
          {state.showMeta && (
            <div className="space-y-2">
              <div>
                <FieldLabel htmlFor="evidence-hash">Evidence hash (SHA-256)</FieldLabel>
                <input id="evidence-hash" aria-label="Evidence hash (SHA-256)" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} placeholder="sha256:…" value={state.evidenceHash} onChange={(e) => patch({ evidenceHash: e.target.value })} />
              </div>
              {state.metaRows.map((r) => (
                <div key={r.id} className="grid grid-cols-2 gap-2">
                  <input aria-label="Metadata key" className="px-2 py-1.5 rounded-md text-xs" style={inputStyle()} placeholder="key" value={r.key} onChange={(e) => dispatch({ type: 'setMetaRows', updater: (rows) => rows.map((x) => (x.id === r.id ? { ...x, key: e.target.value } : x)) })} />
                  <input aria-label="Metadata value" className="px-2 py-1.5 rounded-md text-xs" style={inputStyle()} placeholder="value" value={r.value} onChange={(e) => dispatch({ type: 'setMetaRows', updater: (rows) => rows.map((x) => (x.id === r.id ? { ...x, value: e.target.value } : x)) })} />
                </div>
              ))}
              <button type="button" aria-label="Add metadata row" onClick={() => dispatch({ type: 'setMetaRows', updater: (rows) => [...rows, { id: nextMetaRowId(), key: '', value: '' }] })} className="px-2 py-1 rounded-md text-xs" style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>+ Add row</button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onEvidence}
          disabled={busy || !claimId}
          className="mt-3 w-full px-3 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          style={btnStyle(primaryAction.key === 'evidence' && claimId ? 'primary' : claimId ? 'secondary' : 'disabled')}
        >
          {busy ? <><span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> Saving…</> : 'Save evidence'}
        </button>
      </RailSection>

      {selectedClaim && !claimIsClosed && (
        <RailSection
          id="decision"
          title="Merchant decision"
          open={state.railOpen.decision}
          onToggle={(id) => dispatch({ type: 'toggleRail', id })}
          highlighted={primaryAction.railSection === 'decision'}
          badge={latestOutcome ? (
            <span className="text-xs rounded-full px-1.5 py-0.5 font-semibold" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>Recorded</span>
          ) : undefined}
        >
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Unauth surfaces evidence. Merchant decides.</p>
          <div className="space-y-2">
            <div>
              <FieldLabel htmlFor="merchant-decision">Decision</FieldLabel>
              <select id="merchant-decision" className="w-full px-2 py-1.5 rounded-md text-sm" style={inputStyle()} value={state.decision} onChange={(e) => patch({ decision: e.target.value as Decision })}>
                {(Object.entries(DECISION_LABELS) as [Decision, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="merchant-outcome">Outcome</FieldLabel>
              <select id="merchant-outcome" className="w-full px-2 py-1.5 rounded-md text-sm" style={inputStyle()} value={state.outcome} onChange={(e) => patch({ outcome: e.target.value as Outcome })}>
                {(Object.entries(OUTCOME_LABELS) as [Outcome, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          {!claimId && (
            <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Save the claim details first. Outcome recording requires an active claim.</p>
          )}
          <button
            type="button"
            onClick={onOutcome}
            disabled={busy || !claimId}
            className="mt-2 w-full px-3 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            style={btnStyle(primaryAction.key === 'decision' && claimId ? 'primary' : claimId ? 'secondary' : 'disabled')}
          >
            {busy ? <><span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> Saving…</> : 'Record merchant decision'}
          </button>
        </RailSection>
      )}

      <RailSection
        id="response"
        title="Customer response"
        open={state.railOpen.response}
        onToggle={(id) => dispatch({ type: 'toggleRail', id })}
        highlighted={primaryAction.railSection === 'response'}
        badge={responseRecorded ? (
          <span className="text-xs rounded-full px-1.5 py-0.5 font-semibold" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>Sent</span>
        ) : undefined}
      >
        <textarea aria-label="Customer response preview" className="w-full p-2 rounded-md text-xs resize-none mb-2" style={inputStyle()} rows={4} value={customerResponse} readOnly />
        <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>Internal notes and risk signals stay out of the customer-facing response.</p>
        <button
          type="button"
          onClick={onCopyCustomerResponse}
          disabled={!claimId}
          className="w-full px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60"
          style={btnStyle(primaryAction.key === 'response' && claimId ? 'primary' : claimId ? 'secondary' : 'disabled')}
        >
          Copy &amp; record
        </button>
      </RailSection>

      {selectedClaim && latestOutcome && (
        <RailSection id="advanced" title="Advanced" open={state.railOpen.advanced} onToggle={(id) => dispatch({ type: 'toggleRail', id })}>
          <p className="text-xs mb-3 font-semibold" style={{ color: 'var(--text-muted)' }}>Reverse recorded decision</p>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <select aria-label="Reverse decision" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={state.reverseDecision} onChange={(e) => patch({ reverseDecision: e.target.value as Decision })}>
                {(Object.entries(DECISION_LABELS) as [Decision, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select aria-label="Reverse outcome" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={state.reverseOutcome} onChange={(e) => patch({ reverseOutcome: e.target.value as Outcome })}>
                {(Object.entries(OUTCOME_LABELS) as [Outcome, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <textarea aria-label="Reason for reversal" className="w-full px-2 py-1.5 rounded-md text-xs resize-none" style={inputStyle()} rows={2} placeholder="Reason for reversal" value={state.reverseNote} onChange={(e) => patch({ reverseNote: e.target.value })} />
            <button type="button" onClick={onReverse} disabled={busy || !claimId} className="w-full px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60" style={btnStyle('muted')}>
              Reverse decision
            </button>
          </div>
        </RailSection>
      )}
    </>
  );
}
