/**
 * @jest-environment jsdom
 *
 * Phase 14: a filtered-empty customer registry retains the unfiltered
 * directory context instead of presenting a misleading zero population.
 */
import React, { type ReactNode } from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { CustomersOverviewPageView } from '@/app/(app)/customers/CustomersOverviewPageView';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a>,
}));
jest.mock('@/components/connections/PageConnectionGate', () => ({
  PageConnectionGate: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
jest.mock('@/app/(app)/customers/CustomersPageActionBarLeft', () => ({
  CustomersPageActionBarLeft: () => <div>Search and sort customers</div>,
}));
jest.mock('@/components/customers/CustomersTableClient', () => ({
  __esModule: true,
  default: () => <div>Customer table</div>,
}));
jest.mock('@/components/common/PageSizeSelect', () => ({
  __esModule: true,
  default: () => <span>Rows</span>,
}));
jest.mock('@/components/ui', () => ({
  ButtonLink: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
  EmptyState: ({ title, description, action }: { title: string; description: ReactNode; action?: ReactNode }) => <section><h2>{title}</h2><p>{description}</p>{action}</section>,
  FilterChip: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  PageFrame: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  RegistrySurface: ({ children, resultCount }: { children: ReactNode; resultCount: ReactNode }) => <section aria-label="Customer directory"><p>{resultCount}</p>{children}</section>,
}));

describe('Phase 14 customer registry', () => {
  it('keeps the base directory total visible when filters have no matching customer', () => {
    render(
      <CustomersOverviewPageView
        connectionState={{ bothConnected: true, helpdesk: true } as never}
        setupState={'ready' as never}
        hasData
        pageActions={{ primary: { label: 'Open cases', href: '/claims' }, subtitle: 'Customer context' }}
        sp={{ q: 'not-a-customer' }}
        rows={[]}
        baseCustomerCount={56}
        totalCount={0}
        page={1}
        PAGE_SIZE={25}
        totalPages={1}
        noFilters={false}
        q="not-a-customer"
        hasRefunds={false}
        hasChargebacks={false}
        openClaimsOnly={false}
      />,
    );

    expect(screen.getByText('0 matching customers · 56 customer records total')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No customers found' })).toBeInTheDocument();
    expect(screen.getByText(/56 customer records remain in your directory/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clear all filters' })).toHaveAttribute('href', '/customers');
  });
});
