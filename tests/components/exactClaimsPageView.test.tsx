/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ExactClaimsPageView } from '@/app/(app)/cases/ExactClaimsPageView';
import type { ClaimRow } from '@/app/(app)/cases/claimsPageData';
import type { ClaimsPageViewProps } from '@/app/(app)/cases/ClaimsPageView';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/components/visual-authority/generated/Cases-Clean', () => ({
  SuppliedVisualBody: () => (
    <div data-screen-label="Cases" data-testid="cases-frame" style={{ padding: '16px 378px 20px 22px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0', overflow: 'hidden' }}>
        <div>CASE</div>
        <div>CUSTOMER · REASON</div>
        <div>STATUS</div>
        <div>NEXT ACTION</div>
        <div>AT RISK</div>
        <div>CASE-4187 · Customer</div>
        <div>10 of 23 in this queue</div>
      </div>
      <div style={{ position: 'absolute', width: '340px' }}>
        <svg>
          <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
        </svg>
      </div>
    </div>
  ),
}));

jest.mock('@/app/(app)/cases/ManualCaseDialog', () => ({
  ManualCaseDialog: () => null,
}));

function claim(id: string): ClaimRow {
  return {
    id,
    customer_id: null,
    shop_domain: 'example.test',
    shopify_order_id: `order-${id}`,
    claim_type: 'missing_parcel',
    status: 'open',
    amount_at_risk: 128,
    currency: 'GBP',
    submitted_at: '2026-08-01T09:00:00.000Z',
    created_at: '2026-08-01T09:00:00.000Z',
    updated_at: '2026-08-07T09:00:00.000Z',
  };
}

function viewProps(overrides: Partial<ClaimsPageViewProps> = {}): ClaimsPageViewProps {
  return {
    connectionState: { helpdesk: true },
    queueCounts: { total: 1, active: 1, overdue: 0, awaitingEvidence: 0 },
    coverageByMetric: { total: 'complete', overdue: 'complete', awaitingEvidence: 'complete' },
    aggregateCoverage: 'complete',
    casesSummary: { atRisk: { label: '£128.00' } },
    casesFlow: null,
    isEmpty: false,
    resultText: 'Showing 1 of 1 case reviews',
    pageSize: 20,
    filterTabs: [],
    queueFilter: '',
    sp: {},
    searchTerm: '',
    slaFilter: null,
    claims: [claim('case-a')],
    listView: { kind: 'active' },
    latestOutcomeByClaimId: new Map(),
    evidenceByClaimId: new Map(),
    customerById: new Map(),
    currentUserId: 'user-1',
    initialSelectedCaseId: 'case-a',
    recoveryMetricRows: [],
    recoveryMetricCoverage: 'complete',
    page: 1,
    totalPages: 1,
    totalMatching: 1,
    basePath: '/cases',
    ...overrides,
  } as ClaimsPageViewProps;
}

describe('ExactClaimsPageView selection dismissal', () => {
  it('keeps an explicitly dismissed preview closed', async () => {
    window.history.replaceState(null, '', '/cases?selected=case-a');
    const { container } = render(<ExactClaimsPageView {...viewProps()} />);

    expect(screen.getByRole('button', { name: 'Close case preview' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close case preview' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Close case preview' })).not.toBeInTheDocument();
      expect(container.querySelector('[style*="width: 340px"]')).not.toBeInTheDocument();
      expect(window.location.search).toBe('');
    });
  });

  it('restores the closed frame and gives the bound ledger its own scroll owner', async () => {
    window.history.replaceState(null, '', '/cases?selected=case-a');
    const { container } = render(<ExactClaimsPageView {...viewProps()} />);

    expect(screen.getByRole('table', { name: 'Cases' })).toHaveStyle('overflow-y: auto');

    fireEvent.click(screen.getByRole('button', { name: 'Close case preview' }));

    await waitFor(() => {
      expect(screen.getByTestId('cases-frame')).toHaveStyle('padding: 16px 22px 20px 22px');
      expect(container.querySelector('[role="table"]')).toBeInTheDocument();
    });
  });

  it('keeps the registry closed when no valid URL selection exists', async () => {
    window.history.replaceState(null, '', '/cases');
    render(<ExactClaimsPageView {...viewProps({ initialSelectedCaseId: null })} />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Close case preview' })).not.toBeInTheDocument();
      expect(window.location.search).toBe('');
    });
  });

  it('clears an invalid URL selection instead of defaulting to the first row', async () => {
    window.history.replaceState(null, '', '/cases?selected=missing-case');
    render(<ExactClaimsPageView {...viewProps({ initialSelectedCaseId: 'missing-case' })} />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Close case preview' })).not.toBeInTheDocument();
      expect(window.location.search).toBe('');
    });
  });

  it('keeps continuity with the first remaining row when the selected row is filtered out', async () => {
    window.history.replaceState(null, '', '/cases?selected=case-a');
    const { rerender } = render(<ExactClaimsPageView {...viewProps()} />);

    expect(screen.getByRole('button', { name: 'Close case preview' })).toBeInTheDocument();

    rerender(
      <ExactClaimsPageView
        {...viewProps({
          claims: [claim('case-b')],
          initialSelectedCaseId: null,
        })}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Close case preview' })).toBeInTheDocument();
      expect(window.location.search).toBe('?selected=case-b');
    });
  });
});
