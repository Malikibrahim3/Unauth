/** @jest-environment jsdom */

import '@testing-library/jest-dom';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { CaseDetailOperations } from '@/components/claims/CaseDetailOperations';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';
import type { CaseEvidenceFile } from '@/lib/claims/caseEvidenceFile';

const push = jest.fn();
const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

jest.mock('@/components/claims/ClaimReviewToast', () => ({ ClaimReviewToast: () => null }));
jest.mock('@/components/claims/ClaimReviewManageCard', () => ({
  ClaimReviewManageCard: () => <div>Decision form</div>,
}));
jest.mock('@/components/collaboration/CaseComments', () => ({
  CaseComments: () => <section>Case comments</section>,
}));
jest.mock('@/components/support/SupportCaseContextList', () => ({
  __esModule: true,
  default: () => <div>Helpdesk source context</div>,
}));
jest.mock('@/components/claims/investigations/CaseInvestigationsCard', () => ({
  CaseInvestigationsCard: ({ focusedInvestigationId }: { focusedInvestigationId?: string | null }) => (
    <section data-testid="investigations" data-focused={focusedInvestigationId ?? ''}>
      Investigation lifecycle
    </section>
  ),
}));
jest.mock('@/components/claims/payout/CaseFinancialHistoryCard', () => ({
  CaseFinancialHistoryCard: () => <section>Financial history</section>,
}));
jest.mock('@/components/claims/payout/ReconciliationSummaryCard', () => ({
  ReconciliationSummaryCard: () => <section>Independent recommendations</section>,
}));
jest.mock('@/components/claims/case-file/CaseFileSections', () => ({
  ActivityTimeline: () => <section>Combined case activity</section>,
  CaseFileUnavailable: () => <section>Case file unavailable</section>,
  CaseTruthStrip: () => <section>Case truth lanes</section>,
  ClaimGates: () => <section>Nine hard claim gates</section>,
  CustodyChainCard: () => <section>Custody chain</section>,
  EvidenceRegisterCard: () => <section>Evidence register</section>,
  ItemParcelMatrixCard: () => <section>Item parcel matrix</section>,
  RecoveryOutcomeCard: () => <section>Recovery outcome</section>,
  ResponsibilityCard: () => <section>Apparent responsibility</section>,
}));
jest.mock('@/components/ui', () => ({
  BeforeYouConfirm: () => null,
  Drawer: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <aside>{children}</aside> : null,
  Modal: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <div role="dialog">{children}</div> : null,
}));

const caseFile = {
  version: 'case-evidence-file-v1',
  claim: {
    id: 'case-1',
    merchantId: 'merchant-1',
    customerName: 'Taylor Reed',
    claimType: 'missing_parcel',
    issueSummary: 'Parcel not received',
    requestedAction: 'partial_refund',
    orderId: 'order-1',
    orderReference: '#1042',
    ticketId: null,
    ticketReference: null,
    amountAtRiskMinor: 2500,
    currency: 'GBP',
    status: 'ready_for_decision',
    createdAt: '2026-08-20T09:00:00.000Z',
    updatedAt: '2026-08-23T10:00:00.000Z',
  },
  evidence: [],
  customerHistory: [],
  custodyChain: [],
  firstEvidencedFailure: { stage: null, occurredAt: null, summary: null, evidenceIds: [] },
  itemParcelMatrix: [],
  providerClaimReadiness: {
    readiness: 'evidence_needed',
    posture: 'insufficient',
    gates: Array.from({ length: 9 }, (_, index) => ({
      id: `gate-${index}`,
      state: index < 7 ? 'met' : 'missing',
      headline: `Gate ${index + 1}`,
      reason: index < 7 ? 'Verified by fixture evidence.' : 'Fixture evidence is missing.',
      evidenceIds: [],
      ruleVersionId: null,
      nextAction: index < 7 ? 'No action required.' : 'Collect the missing evidence.',
    })),
    hardGateIds: [],
    missingEvidence: ['carrier scan'],
    nextAction: 'Collect the missing carrier scan.',
    ruleVersionId: null,
    evaluatedAt: '2026-08-23T10:00:00.000Z',
  },
  apparentResponsibility: {
    owner: 'courier',
    confidence: 'likely',
    headline: 'Carrier responsibility is likely.',
    explanation: 'A carrier scan is missing.',
    supportingEvidenceIds: [],
    conflictingEvidenceIds: [],
    missingEvidence: ['carrier scan'],
    merchantConfirmed: false,
    merchantConfirmationState: 'unconfirmed',
    merchantConfirmedAt: null,
    confirmationSource: null,
  },
  responsibilityRecommendation: null,
  decisions: [{
    id: 'decision-1',
    decision: 'partial_refund',
    amountMinor: 2500,
    currency: 'GBP',
    effectiveAt: '2026-08-23T10:00:00.000Z',
  }],
  externalActions: [{
    id: 'action-1',
    capabilityId: 'refund.manual_handoff',
    externalRecordId: 'gid://shopify/Order/123456789',
    status: 'manual_required',
    payload: {
      scope: 'partial',
      amount_minor: 2500,
      currency: 'GBP',
      provider: { id: 'shopify' },
      source_object: {
        reference: '#1042',
        provider_href: 'https://merchant-one.myshopify.com/admin/orders/123456789',
  },
  partnerRule: null,
  recoveryCase: null,
  claimPacks: [],
  submissions: [],
  providerResponses: [],
  credits: [],
  financialEntries: [],
    },
  }],
  outcomes: [],
  activity: [],
  availability: {
    case: 'available',
    evidence: 'available',
    recovery: 'not_opened',
    rule: 'not_confirmed',
    errors: [],
  },
} as unknown as CaseEvidenceFile;

function workbench(overrides: Partial<ClaimReviewWorkbench> = {}): ClaimReviewWorkbench {
  return {
    selectedClaim: {
      id: 'case-1',
      status: 'ready_for_decision',
      claim_type: 'missing_parcel',
      amount_at_risk: 25,
      currency: 'GBP',
      order_ref: '#1042',
    },
    customerName: 'Taylor Reed',
    customerProfileHref: '/customers/customer-1',
    history: [{ id: 'case-1', status: 'ready_for_decision', claim_type: 'missing_parcel' }],
    supportCases: [],
    latestOutcome: null,
    decisionData: { payoutCase: { nextAction: 'request_evidence', nextActionReason: 'Carrier scan is missing.' } },
    decisionLoading: false,
    decisionError: null,
    decisionStale: false,
    refreshRecommendation: jest.fn(),
    patch: jest.fn(),
    state: { notes: '', nextClaimHref: null },
    ...overrides,
  } as unknown as ClaimReviewWorkbench;
}

describe('CaseDetailOperations', () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    window.history.replaceState({}, '', '/cases/case-1?tab=evidence');
  });

  it('preserves the exact Work return and separates authorisation, handoff, source result, and paid value', () => {
    const returnHref = '/work?view=mine&q=late&selected=task-9';
    render(
      <CaseDetailOperations
        wb={workbench()}
        financialSummaries={[]}
        canManage
        caseBackHref={returnHref}
        caseEvidenceFile={caseFile}
      />,
    );

    expect(screen.getByRole('button', { name: 'Review merchant decision' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve refund' })).not.toBeInTheDocument();
    expect(screen.getByText('UNAUTH RECOMMENDS · ADVISORY')).toBeInTheDocument();
    expect(screen.getByText('Request evidence')).toBeInTheDocument();
    expect(screen.getByText('PARTIAL REFUND')).toBeInTheDocument();
    expect(screen.getByText('PROVIDER GATES')).toBeInTheDocument();
    expect(screen.getByText('AUDIT TIMELINE')).toBeInTheDocument();
    expect(screen.getByText('MONEY & RECOVERY')).toBeInTheDocument();
    expect(screen.getByText('Received and matched')).toBeInTheDocument();
    expect(screen.getByText('Reconciled')).toBeInTheDocument();
    expect(screen.getByText(/order #1042/)).toBeInTheDocument();
  });

  it('opens a responsibility deep link and passes the exact investigation focus', async () => {
    window.history.replaceState({}, '', '/cases/case-1?tab=responsibility&investigationId=inv-7');
    render(
      <CaseDetailOperations
        wb={workbench()}
        financialSummaries={[]}
        canManage
        investigationId="inv-7"
        caseEvidenceFile={caseFile}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Responsibility.*Focused/i })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByTestId('investigations')).toHaveAttribute('data-focused', 'inv-7');
    });
    expect(window.location.search).toContain('tab=responsibility');
  });

  it('keeps the supplied audit timeline and decision regions in the Activity tab', async () => {
    window.history.replaceState({}, '', '/cases/case-1?tab=activity');
    render(
      <CaseDetailOperations
        wb={workbench({
          history: [
            { id: 'case-1', status: 'ready_for_decision', claim_type: 'missing_parcel' },
            { id: 'case-2', status: 'closed', claim_type: 'damaged' },
          ],
        })}
        financialSummaries={[]}
        canManage
        caseBackHref="/work?view=mine&selected=task-9"
        caseEvidenceFile={caseFile}
      />,
    );

    expect(await screen.findByText('AUDIT TIMELINE')).toBeInTheDocument();
    expect(screen.getByText('No append-only activity is available for this case.')).toBeInTheDocument();
    expect(screen.getByText('DECISION BOUNDARY')).toBeInTheDocument();
    expect(screen.getByText('MONEY & RECOVERY')).toBeInTheDocument();
  });
});
