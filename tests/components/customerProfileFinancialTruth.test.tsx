/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import type { CustomerProfilePageViewProps } from '@/app/(app)/customers/[id]/customerProfilePageLoad';
import { CustomerProfilePageView } from '@/app/(app)/customers/[id]/CustomerProfilePageView';

jest.mock('@/components/audit/CustomerNotes', () => ({ __esModule: true, default: () => null }));

jest.mock('@/components/navigation/AppNavLink', () => ({ __esModule: true, default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));
jest.mock('@/components/layout/SetBreadcrumbLabel', () => ({ SetBreadcrumbLabel: () => null }));
jest.mock('@/components/customers/CustomerDecisionControls', () => ({ CustomerDecisionControls: () => null }));

function fixture(currency: string | null = 'GBP') {
  return {
    profile: { id: 'local-customer', total_orders: 2, first_seen: '2026-01-01', last_seen: '2026-09-01' },
    displayName: 'Synthetic customer', orderCoverage: 'complete', caseCoverage: 'complete',
    merchantClaimCount: 2, merchantOrderCount: 2, isEligibleForEvidence: false,
    totalOrderValue: 20000, totalRefundedValue: 10000, displayCurrency: currency,
    transactions: [], activityLog: [], openClaimCount: 0, merchantNarrative: '25 of those orders were followed by a refund claim (100% rate).', linkedAccounts: [],
    claims: ['resolved', 'closed'].map((status) => ({ id: `case-${status}`, status, claim_type: 'refund', currency: 'GBP', submitted_at: '2026-09-01', amount_at_risk: 5000 })),
  } as unknown as CustomerProfilePageViewProps;
}

describe('customer financial labels', () => {
  it('does not turn terminal lifecycle states or order value into payment, loss or contribution', () => {
    render(<CustomerProfilePageView {...fixture()} />);
    expect(screen.getByText('RESOLVED')).toBeInTheDocument();
    expect(screen.getByText('CLOSED')).toBeInTheDocument();
    expect(screen.queryByText('REFUNDED')).not.toBeInTheDocument();
    expect(screen.getByText('Recorded order value')).toBeInTheDocument();
    expect(screen.getByText('Case-linked order value')).toBeInTheDocument();
    expect(screen.queryByText(/Loss to date|Net contribution|Lifetime value|100% rate/)).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Case history' })).toBeInTheDocument();
  });

  it('does not borrow a case currency for unavailable aggregate currency', () => {
    render(<CustomerProfilePageView {...fixture(null)} />);
    expect(screen.getByText('Recorded order value').parentElement).toHaveTextContent('—');
    expect(screen.getByText('Case-linked order value').parentElement).toHaveTextContent('—');
  });
  it('counts mixed-currency loaded cases without adding their monetary values or claiming a full period', () => {
    const props = fixture(null);
    props.merchantClaimCount = 80;
    props.claims[1].currency = 'USD';
    render(<CustomerProfilePageView {...props} />);
    expect(screen.getAllByText(/2 loaded of 80 observed cases/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/claims in 12 months|Claim rate|100.0%/)).not.toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Recorded customer cases' });
    expect(table.querySelectorAll('[role="columnheader"]')).toHaveLength(4);
    expect(table.querySelectorAll('[role="rowgroup"] [role="row"]')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Open workspace case registry' })).toHaveAttribute('href', '/cases');
    expect(screen.queryByText('Previous')).not.toBeInTheDocument();
    expect(screen.getByText('2026-09').parentElement).toHaveTextContent('2026-0920');
  });

  it('does not fabricate a date or zero when history is unavailable', () => {
    const props = fixture(null);
    props.claims = [];
    props.caseCoverage = 'unavailable';
    props.merchantClaimCount = null;
    props.openClaimCount = null;
    render(<CustomerProfilePageView {...props} />);
    expect(screen.getByText('No dated cases are available to plot.')).toBeInTheDocument();
    expect(screen.getByText('Active case count is unavailable.')).toBeInTheDocument();
    expect(screen.getByText('Observed cases').parentElement).toHaveTextContent('—');
  });

});
