/**
 * @jest-environment jsdom
 *
 * Phase 10: the Cases master-detail registry keeps a quiet selected row and
 * places value, evidence readiness, waiting time, and next action first in
 * the preview without changing any case decision behaviour.
 */
import React, { type ReactNode } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ClaimsQueueClient } from '@/app/(app)/claims/ClaimsQueueClient';
import type { ClaimRow } from '@/app/(app)/claims/claimsPageData';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a>,
}));
jest.mock('@/app/(app)/claims/claimsPageUi', () => ({
  StatusPill: ({ status }: { status: string }) => <span>State: {status}</span>,
  SlaPill: () => null,
}));
jest.mock('@/components/ui', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  ButtonLink: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
  EvidenceRow: ({ text }: { text: ReactNode }) => <span>{text}</span>,
}));
jest.mock('@/components/ui/StatusBadge', () => ({
  StatusBadge: ({ value }: { value: string }) => <span>{value}</span>,
}));

const claim = (id: string, amount: number, status = 'ready_for_decision'): ClaimRow => ({
  id,
  customer_id: id,
  shop_domain: null,
  shopify_order_id: `#${id}`,
  claim_type: 'missing_parcel',
  status,
  amount_at_risk: amount,
  currency: 'GBP',
  created_at: '2026-07-20T12:00:00.000Z',
  updated_at: '2026-07-20T12:00:00.000Z',
});

describe('Cases registry split preview (Phase 10)', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-07-29T12:00:00.000Z').getTime());
    window.history.replaceState(null, '', '/claims');
  });

  afterEach(() => jest.restoreAllMocks());

  it('updates the selected preview without a route change and puts review priority ahead of supporting detail', () => {
    const claims = [claim('case-1', 125), claim('case-2', 80, 'evidence_needed')];
    render(
      <ClaimsQueueClient
        claims={claims}
        outcomesRecord={{}}
        evidenceRecord={{ 'case-1': null, 'case-2': null }}
        customersRecord={{
          'case-1': { id: 'case-1', names: ['Alex Morgan'], primary_email: null, risk_level: 'unknown' },
          'case-2': { id: 'case-2', names: ['Sam Lee'], primary_email: null, risk_level: 'unknown' },
        }}
        currentUserId="user-1"
      />,
    );

    const preview = screen.getByRole('region', { name: 'Selected case preview' });
    expect(within(preview).getByText('Value at issue')).toBeInTheDocument();
    expect(within(preview).getByRole('heading', { name: '£125.00' })).toBeInTheDocument();
    expect(within(preview).getByText('Review context')).toBeInTheDocument();
    expect(within(preview).getByText('Case state')).toBeInTheDocument();
    expect(within(preview).getByText('Waiting time')).toBeInTheDocument();
    expect(within(preview).getByText('Next action')).toBeInTheDocument();
    expect(within(preview).queryByText('Current state')).not.toBeInTheDocument();
    expect(within(preview).getByRole('link', { name: 'Review case' })).toHaveAttribute(
      'href',
      '/claims/case-1#case-customer-action',
    );

    fireEvent.click(document.querySelector('[data-case-id="case-2"]') as HTMLButtonElement);
    expect(within(preview).getByRole('heading', { name: '£80.00' })).toBeInTheDocument();
    expect(window.location.search).toBe('?focus=case-2');
    expect(document.querySelector('[data-case-id="case-2"]')).toHaveAttribute('aria-pressed', 'true');
  });
});
