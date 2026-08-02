/** @jest-environment jsdom */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import {
  CaseFinancialHistoryCard,
  type CaseFinancialSummary,
} from '@/components/claims/payout/CaseFinancialHistoryCard';

const summary: CaseFinancialSummary = {
  support_payout_case_id: 'case-1',
  currency: 'GBP',
  requested_minor: 1000,
  exposed_minor: 0,
  approved_minor: 500,
  paid_minor: 0,
  estimated_loss_minor: 0,
  confirmed_loss_minor: 0,
  recoverable_minor: 0,
  recovered_minor: 0,
  prevented_minor: 0,
  written_off_minor: 0,
  known_states: ['requested', 'exposed', 'approved'],
  updated_at: '2026-07-22T12:00:00.000Z',
};

describe('CaseFinancialHistoryCard', () => {
  it('shows proven zero separately from unavailable stages', () => {
    render(<CaseFinancialHistoryCard summaries={[summary]} />);
    expect(screen.getByRole('heading', { name: 'Financial history' })).toBeInTheDocument();
    expect(screen.getByText('Requested value').nextElementSibling).toHaveTextContent('10.00');
    expect(screen.getByText('Maximum exposure').nextElementSibling).toHaveTextContent('0.00');
    expect(screen.getByText('Merchant decision').nextElementSibling).toHaveTextContent('5.00');
    expect(screen.getByText('Observed payout').nextElementSibling).toHaveTextContent('Unavailable');
    expect(screen.getByText('Recovered cash').nextElementSibling).toHaveTextContent('Unavailable');
  });

  it('does not fabricate zero when no canonical ledger summary exists', () => {
    render(<CaseFinancialHistoryCard summaries={[]} />);
    expect(screen.getByText(/Missing values remain unavailable rather than showing as zero/i)).toBeInTheDocument();
  });
});
