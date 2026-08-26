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
  claim: {
    id: 'case-1',
    customerName: 'Taylor Reed',
    claimType: 'missing_parcel',
    issueSummary: 'Parcel not received',
    orderReference: '#1042',
    amountAtRiskMinor: 2500,
    currency: 'GBP',
    createdAt: '2026-08-20T09:00:00.000Z',
  },
  providerClaimReadiness: {
    gates: Array.from({ length: 9 }, (_, index) => ({ id: `gate-${index}`, state: index < 7 ? 'met' : 'missing' })),
  },
  apparentResponsibility: {
    owner: 'courier',
    confidence: 'likely',
    headline: 'Carrier responsibility is likely.',
    explanation: 'A carrier scan is missing.',
    supportingEvidenceIds: [],
    conflictingEvidenceIds: [],
    missingEvidence: ['carrier scan'],
  },
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
    },
  }],
  outcomes: [],
  availability: { errors: [] },
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

    expect(screen.getByRole('link', { name: 'Back to work' })).toHaveAttribute('href', returnHref);
    expect(screen.getByRole('button', { name: 'Record refund authorisation' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve refund' })).not.toBeInTheDocument();
    expect(screen.getByText('Recommend collecting evidence')).toBeInTheDocument();
    expect(screen.queryByText('Request Evidence')).not.toBeInTheDocument();
    expect(screen.getByText('Partial refund')).toBeInTheDocument();
    expect(screen.getByText('Manual Required')).toBeInTheDocument();
    expect(screen.getByText('Not observed')).toBeInTheDocument();
    expect(screen.getByText('Paid value not recorded')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open exact Shopify order/i })).toHaveAttribute(
      'href',
      'https://merchant-one.myshopify.com/admin/orders/123456789',
    );
  });

  it('opens a fragment deep link on Responsibility and passes the exact investigation focus', async () => {
    window.history.replaceState({}, '', '/cases/case-1#investigation-inv-7');
    render(
      <CaseDetailOperations
        wb={workbench()}
        financialSummaries={[]}
        canManage
        caseEvidenceFile={caseFile}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Responsibility/i })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByTestId('investigations')).toHaveAttribute('data-focused', 'inv-7');
    });
    expect(window.location.search).toContain('tab=responsibility');
  });

  it('keeps comments, helpdesk audit context, and linked prior cases in the Activity tab', async () => {
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

    expect(await screen.findByText('Combined case activity')).toBeInTheDocument();
    expect(screen.getByText('Case comments')).toBeInTheDocument();
    expect(screen.getByText('Helpdesk source context')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Previous cases' })).toBeInTheDocument();
  });
});
