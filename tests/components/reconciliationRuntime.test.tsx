/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReconciliationOperations } from '@/components/reconciliation/ReconciliationOperations';

jest.mock('@/components/reconciliation/PeriodCloseOverlay', () => ({ PeriodCloseOverlay: () => null }));

it('retains unknown-currency exceptions and exposes paging within the selected period', () => {
  const props = {
    pageResult: {
      rows: [{ id: 'exception-1', title: 'Unknown currency exception', context: {}, created_at: '2026-08-04T00:00:00Z' }],
      page: 1, totalPages: 2, totalCount: 26, status: 'open', contract: 'canonical',
    },
    aggregate: { currencies: [{ currency: 'GBP', knownStates: [] }], source: 'canonical' },
    periodPreview: {
      from: '2026-07-31T23:00:00.000Z', to: '2026-08-31T23:00:00.000Z', timezone: 'Europe/London',
      boundary: 'start_inclusive_end_exclusive', blockers: [], blockerCount: 0, blockersState: 'available',
      earlierOutstandingCount: 3, settlements: [], settlementState: 'verified_empty',
      observationAuthority: 'source_or_receipt_backed_only', source: 'canonical', closeBlockedReasons: [],
    },
    sourceConnected: true, canClose: false,
    query: { status: 'open', source: null, currency: null, search: null, period: '2026-08', action: null },
  } as unknown as React.ComponentProps<typeof ReconciliationOperations>;
  render(<ReconciliationOperations {...props} />);
  expect(screen.getByRole('link', { name: /Unknown currency exception/ })).toBeInTheDocument();
  expect(screen.queryByText(/verified empty exception set/)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Next', exact: true })).toHaveAttribute('href', '/financials/reconciliation?page=2&period=2026-08');
  expect(screen.getByText(/3 earlier open exceptions shown separately/)).toBeInTheDocument();
  expect(screen.getByText('LEDGER RECORD')).toBeInTheDocument();
  expect(screen.queryByText('WHAT ARRIVED IN THE BANK')).not.toBeInTheDocument();
});
