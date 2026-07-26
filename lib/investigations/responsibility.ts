import type {
  CaseInvestigation,
  InvestigationResponseOutcome,
} from '@/lib/investigations/types';
import type {
  AttributionConfidence,
  LossAttributionLabel,
} from '@/lib/payouts/types';

export type InvestigationResponsibilitySignal = {
  attribution: LossAttributionLabel | null;
  confidence: AttributionConfidence;
  neutral: boolean;
  reason: string;
};

function attributionFor(
  investigation: Pick<CaseInvestigation, 'target_type'>,
): LossAttributionLabel | null {
  switch (investigation.target_type) {
    case 'carrier':
      return 'carrier_loss';
    case '3pl':
    case 'warehouse':
      return 'warehouse_missing_item';
    case 'supplier':
      return 'supplier_defect';
    case 'customer':
      return 'customer_claim';
    case 'internal':
      return 'unknown';
  }
}

export function responsibilitySignalFromResponse(
  investigation: Pick<CaseInvestigation, 'target_type'>,
  outcome: InvestigationResponseOutcome,
): InvestigationResponsibilitySignal {
  if (outcome === 'issue_confirmed') {
    return {
      attribution: attributionFor(investigation),
      confidence: 'medium',
      neutral: false,
      reason: 'The responding party confirmed an issue within the area it controls.',
    };
  }
  if (outcome === 'no_issue_found') {
    return {
      attribution: null,
      confidence: 'needs_more_evidence',
      neutral: true,
      reason: 'A no-issue finding does not prove that another party or the customer caused the loss.',
    };
  }
  if (outcome === 'no_response') {
    return {
      attribution: null,
      confidence: 'needs_more_evidence',
      neutral: true,
      reason: 'Provider silence is not causal evidence and does not assign responsibility.',
    };
  }
  return {
    attribution: null,
    confidence: 'needs_more_evidence',
    neutral: true,
    reason: outcome === 'referred_elsewhere'
      ? 'The response refers the question elsewhere and does not resolve responsibility.'
      : 'The response is inconclusive and responsibility remains uncertain.',
  };
}

