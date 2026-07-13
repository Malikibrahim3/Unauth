'use client';

import { Badge } from '@/components/ui';
import { RailSection } from '@/components/claims/claimReviewPrimitives';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';

export function ClaimReviewEvidenceRail({ wb }: { wb: ClaimReviewWorkbench }) {
  const {
    claimId,
    evidenceRecorded,
    responseRecorded,
    state,
    dispatch,
  } = wb;

  return (
    <>
      <RailSection
        id="evidence"
        title="Source-backed evidence"
        open={state.railOpen.evidence}
        onToggle={(id) => dispatch({ type: 'toggleRail', id })}
        badge={evidenceRecorded ? (
          <Badge tone="success" size="sm" dot>On record</Badge>
        ) : undefined}
      >
        {!claimId ? (
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Select a source-backed case to view collected evidence and missing source data.
          </p>
        ) : (
          <div className="space-y-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <p>
              Evidence is collected from connected commerce, helpdesk, tracking, carrier, document, returns, warehouse/3PL, or payment-dispute sources.
            </p>
            <p>
              Missing evidence is calculated automatically. If a connector is absent, a provider does not expose a field, a source record is not found, or correspondence cannot be matched confidently, the case keeps that unavailable state.
            </p>
          </div>
        )}
      </RailSection>

      <RailSection
        id="response"
        title="Correspondence collection"
        open={state.railOpen.response}
        onToggle={(id) => dispatch({ type: 'toggleRail', id })}
        badge={responseRecorded ? (
          <Badge tone="success" size="sm" dot>Source reply</Badge>
        ) : undefined}
      >
        <div className="space-y-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <p>
            External replies are ingested from connected helpdesk, carrier, returns, warehouse/3PL, or payment-dispute sources and matched to cases by source identifiers and confidence.
          </p>
          <p>
            Low-confidence messages stay unmatched and do not count as evidence or update case status.
          </p>
        </div>
      </RailSection>
    </>
  );
}
