/**
 * @jest-environment jsdom
 *
 * Phase 11: case detail leads with a provenance-aware evidence spine, keeps
 * the three recommendation axes independent, and makes evidence failure
 * explicit and retryable without changing merchant state.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ReconciliationSummaryCard } from '@/components/claims/payout/ReconciliationSummaryCard';
import { useAsyncResource } from '@/lib/react/useFetchJson';

jest.mock('@/lib/react/useFetchJson', () => ({
  useAsyncResource: jest.fn(),
}));

const useAsyncResourceMock = useAsyncResource as jest.MockedFunction<typeof useAsyncResource>;

describe('Phase 11 case evidence spine', () => {
  afterEach(() => jest.clearAllMocks());

  it('distinguishes source facts, human findings, and inferences with provenance', () => {
    useAsyncResourceMock.mockReturnValue({
      status: 'success',
      data: {
        case_version: 3,
        claimed_items: [{ id: 'item-1', claimed_sku: 'SKU-1' }],
        order_lines: [],
        permissions: { can_mutate: true },
        reconciliation: {
          input: {
            facts: [
              {
                id: 'fact-1',
                factKind: 'source_fact',
                evidenceType: 'delivery_scan',
                sourceProvider: 'carrier_api',
                externalReference: 'scan-42',
                occurredAt: '2026-07-28T10:00:00.000Z',
                freshness: 'fresh',
                summary: 'Carrier recorded delivery',
              },
              {
                id: 'fact-2',
                factKind: 'human_finding',
                evidenceType: 'photo_review',
                sourceProvider: 'merchant_review',
                collectedAt: '2026-07-28T11:00:00.000Z',
                summary: 'Agent found the parcel location unclear',
              },
              {
                id: 'fact-3',
                factKind: 'inference',
                evidenceType: 'item_parcel_match',
                sourceProvider: 'reconciliation_engine',
                collectedAt: '2026-07-28T11:05:00.000Z',
                summary: 'Claimed item may be outside the recorded parcel',
              },
            ],
          },
          matrix: [],
          outcomes: [],
          recommendations: {
            customerAction: {
              assessment_state: 'likely',
              headline: 'Request delivery clarification',
              explanation: 'The delivery record does not resolve the claimed item.',
              missing_evidence: ['delivery_photo'],
            },
            responsibility: {
              assessment_state: 'unresolved',
              headline: 'Keep responsibility open',
              explanation: 'No human confirmation assigns responsibility.',
            },
            recovery: {
              assessment_state: 'blocked',
              headline: 'Wait before recovery',
              explanation: 'Responsibility evidence is incomplete.',
            },
          },
        },
      },
      error: null,
      dataAsOf: null,
      loading: false,
      isInitialLoading: false,
      isRefreshing: false,
      hasStaleData: false,
      reload: jest.fn(),
    } as never);

    render(
      <ReconciliationSummaryCard
        caseId="case-phase-11"
        evidenceStrength="moderate"
        nextAction="Request customer evidence"
        nextActionReason="A delivery photo would resolve the material gap."
      />,
    );

    expect(screen.getByRole('heading', { name: 'Evidence and readiness' })).toBeInTheDocument();
    const summary = screen.getByLabelText('Evidence readiness summary');
    expect(within(summary).getByText('Moderate')).toBeInTheDocument();
    expect(within(summary).getByText('3 facts')).toBeInTheDocument();
    expect(within(summary).getByText('Request customer evidence')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Source facts' })).toBeInTheDocument();
    expect(screen.getByText('Carrier recorded delivery')).toBeInTheDocument();
    expect(screen.getByText('Provider record · carrier api')).toBeInTheDocument();
    expect(screen.getByText(/Ref scan-42/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Human findings' })).toBeInTheDocument();
    expect(screen.getByText('Agent found the parcel location unclear')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Inferences' })).toBeInTheDocument();
    expect(screen.getByText('Claimed item may be outside the recorded parcel')).toBeInTheDocument();

    expect(screen.getByText('Customer action')).toBeInTheDocument();
    expect(screen.getByText('Responsibility')).toBeInTheDocument();
    expect(screen.getByText('Recovery')).toBeInTheDocument();
  });

  it('renders an explicit degraded state whose retry does not imply a commit', () => {
    const reload = jest.fn();
    useAsyncResourceMock.mockReturnValue({
      status: 'error',
      data: undefined,
      error: 'Case evidence took too long to load.',
      dataAsOf: null,
      loading: false,
      isInitialLoading: false,
      isRefreshing: false,
      hasStaleData: false,
      reload,
    } as never);

    render(<ReconciliationSummaryCard caseId="case-phase-11-error" canManage />);

    const summary = screen.getByLabelText('Evidence readiness summary');
    expect(within(summary).getAllByText(/Unavailable/)).toHaveLength(2);
    expect(within(summary).queryByText('0 facts')).not.toBeInTheDocument();
    expect(within(summary).queryByText('No named gaps')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Case evidence could not be loaded');
    expect(screen.getByRole('alert')).toHaveTextContent('No recommendation or merchant decision was changed');
    fireEvent.click(screen.getByRole('button', { name: 'Retry evidence' }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /confirm|record decision/i })).not.toBeInTheDocument();
  });
});
