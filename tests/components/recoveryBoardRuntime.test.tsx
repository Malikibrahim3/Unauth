/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecoveryBoardOperations } from '@/components/recoveries/RecoveryBoardOperations';
import type { RecoveryCase } from '@/lib/recoveries/types';
import type { RecoveryPageResult } from '@/lib/recoveries/store';
import type { CanonicalFinancialAggregate } from '@/lib/financial/canonicalAggregates';

const result: RecoveryPageResult = {
  rows: Array.from({ length: 7 }, (_, index) => ({
    id: `recovery-${index}`, support_payout_case_id: `case-${index}`,
    status: 'paid', owner_type: 'carrier', recovery_type: 'carrier_claim',
    currency: 'GBP', amount_sought_minor: 1000, amount_approved_minor: 500,
    amount_recovered_minor: 200, amount_written_off_minor: 0,
    claim_readiness: index === 0 ? 'reconciled' : 'credited_unreconciled',
    evidence_missing: [], created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-02T00:00:00Z', deadline_at: null,
  } as RecoveryCase)),
  page: 2, pageSize: 25, totalCount: 60, totalPages: 3,
  stage: 'received', currency: 'GBP', availableCurrencies: ['GBP'],
  stageCounts: { received: 60 }, stableOrder: 'updated_at_desc_id_desc',
  source: 'canonical', limitation: null,
};
const aggregate = { currencies: [] } as unknown as CanonicalFinancialAggregate;

it('keeps every loaded recovery reachable and preserves scope when paging', () => {
  render(<RecoveryBoardOperations result={result} aggregate={aggregate} search="parcel" />);
  expect(screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.includes('/recovery/recovery-'))).toHaveLength(7);
  expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/financials/recovery?page=3&stage=received&currency=GBP&search=parcel');
  expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '/financials/recovery?page=1&stage=received&currency=GBP&search=parcel');
});

it('reports received and reconciled recovery separately for the shown page', () => {
  render(<RecoveryBoardOperations result={result} aggregate={aggregate} />);
  expect(screen.getByText('Received').closest('div')?.parentElement).toHaveTextContent('£14.00');
  expect(screen.getByText('Reconciled').closest('div')?.parentElement).toHaveTextContent('£2.00');
  expect(screen.getAllByText('This page')).toHaveLength(4);
});

it('opens the population represented by stage counts and keeps unknown counts unavailable', () => {
  const view = render(<RecoveryBoardOperations result={result} aggregate={aggregate} search="parcel" />);
  expect(screen.getByRole('link', { name: 'RECEIVED 60' })).toHaveAttribute('href', '/financials/recovery?stage=received&page=1&currency=GBP');
  expect(screen.getByText(/opening a stage clears search/)).toBeInTheDocument();
  view.rerender(<RecoveryBoardOperations result={{ ...result, rows: [], stageCounts: {}, source: 'compatibility' as RecoveryPageResult['source'] }} aggregate={aggregate} />);
  expect(screen.queryByText('No recovery routes in this workspace.')).not.toBeInTheDocument();
  expect(screen.getAllByText(/No routes in this stage on this page/).length).toBeGreaterThan(0);
});
