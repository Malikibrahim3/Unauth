/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ExactClaimsPageView } from '@/app/(app)/cases/ExactClaimsPageView';
import { ClaimsPageView, type ClaimsPageViewProps } from '@/app/(app)/cases/ClaimsPageView';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
jest.mock('@/app/(app)/cases/ManualCaseDialog', () => ({ ManualCaseDialog: () => null }));
// Deliberately use the real supplied tree: a ten-row mock concealed this defect.
function propsFor(count: number, offset = 0): ClaimsPageViewProps {
  const claims = Array.from({ length: count }, (_, index) => ({
    id: `case-${offset + index + 1}`, customer_id: `customer-${offset + index + 1}`,
    shop_domain: 'example.test', shopify_order_id: `order-${offset + index + 1}`,
    claim_type: 'missing_parcel', status: 'open', amount_at_risk: offset + index + 1,
    currency: 'GBP', submitted_at: '2026-08-01T09:00:00Z',
    created_at: '2026-08-01T09:00:00Z', updated_at: '2026-08-07T09:00:00Z',
  }));
  return {
    connectionState: { helpdesk: true }, queueCounts: { total: 40, active: 40, overdue: 0, awaitingEvidence: 0 },
    coverageByMetric: { total: 'complete', overdue: 'complete', awaitingEvidence: 'complete' },
    aggregateCoverage: 'complete', casesSummary: { atRisk: { label: '£820.00' } },
    casesFlow: null, isEmpty: false, resultText: `${count} loaded cases`, pageSize: 25,
    filterTabs: [{ label: 'All', count: 40, coverage: 'complete', href: '/cases', active: true }], queueFilter: '', sp: {}, searchTerm: '', slaFilter: null, claims,
    listView: { kind: 'active' }, latestOutcomeByClaimId: new Map(), evidenceByClaimId: new Map(),
    customerById: new Map(claims.map((claim) => [claim.customer_id, { names: [`Customer ${claim.id}`] }])),
    currentUserId: 'user-1', initialSelectedCaseId: null, recoveryMetricRows: [],
    recoveryMetricCoverage: 'complete', page: offset ? 2 : 1, totalPages: 2,
    totalMatching: 40, basePath: '/cases',
  } as ClaimsPageViewProps;
}

it('renders every loaded case, binds later rows independently, and removes prior-page rows', () => {
  window.history.replaceState(null, '', '/cases');
  const { container, rerender } = render(<ExactClaimsPageView {...propsFor(25)} />);
  expect(container.querySelectorAll('[data-case-id]')).toHaveLength(25);
  for (let index = 1; index <= 25; index += 1) {
    const row = container.querySelector(`[data-case-id="case-${index}"]`) as HTMLElement;
    expect(within(row).getByText(`Customer case-${index} · missing parcel`)).toBeInTheDocument();
    expect(within(row).getByText(`£${index.toFixed(2)}`)).toBeInTheDocument();
  }
  expect(screen.getByText('25 of 40 in this queue')).toBeInTheDocument();
  fireEvent.keyDown(container.querySelector('[data-case-id="case-25"]')!, { key: 'Enter' });
  expect(window.location.search).toBe('?selected=case-25');
  expect(screen.getByRole('link', { name: 'Open case review' })).toHaveAttribute('href', '/cases/case-25');
  fireEvent.click(screen.getByRole('button', { name: 'Close case preview' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(push).toHaveBeenCalledWith('/cases?page=2');
  rerender(<ExactClaimsPageView {...propsFor(15, 25)} />);
  expect(container.querySelectorAll('[data-case-id]')).toHaveLength(15);
  expect(container.querySelector('[data-case-id="case-25"]')).toBeNull();
  expect(container.querySelector('[data-case-id="case-40"]')).toBeInTheDocument();
  expect(screen.getByText('15 of 40 in this queue')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Close case preview' })).not.toBeInTheDocument();
});

it('replaces reference chart values with the same live daily data in populated and empty views', () => {
  const props = propsFor(25);
  const flow = {
    opened30d: 4, closed30d: 1, netChange: 3, medianOpenAgeDays: null,
    medianTimeToCloseDays: null, closedWithinSlaPercent: null,
    daily: [
      { date: '2026-09-09', label: '9 Sep', opened: 4, closed: 1, backlog: 3 },
      { date: '2026-09-10', label: '10 Sep', opened: 0, closed: 0, backlog: 3 },
    ],
  };
  const { container, rerender } = render(<ExactClaimsPageView {...props} casesFlow={flow} />);
  expect(container.querySelectorAll('[data-case-flow-day]')).toHaveLength(2);
  expect(screen.getByText('9 Sep – 10 Sep · UTC')).toBeInTheDocument();
  expect(screen.queryByText('2 Aug – 1 Sep · the gap is the backlog')).not.toBeInTheDocument();
  const details = container.querySelector('details')!;
  details.open = true;
  expect(within(details).getByRole('row', { name: '2026-09-09 4 1' })).toBeInTheDocument();
  expect(within(details).getByRole('row', { name: '2026-09-10 0 0' })).toBeInTheDocument();
  const zero = container.querySelector('[data-case-flow-day="2026-09-10"]')!;
  expect(Array.from(zero.children).every(bar => (bar as HTMLElement).style.height === '0%')).toBe(true);
  rerender(<ClaimsPageView {...props} claims={[]} casesFlow={flow} />);
  expect(container.querySelectorAll('[data-case-flow-day]')).toHaveLength(2);
  expect(screen.getByText('9 Sep – 10 Sep · UTC')).toBeInTheDocument();
  rerender(<ExactClaimsPageView {...props} casesFlow={null} />);
  expect(container.querySelectorAll('[data-case-flow-day]')).toHaveLength(0);
  expect(screen.getByText('Daily case history unavailable.')).toBeInTheDocument();
});

it('binds queue labels, URLs and selection consistently across populated and empty results', () => {
  const props = propsFor(25);
  props.filterTabs = [
    { label: 'All', count: 40, coverage: 'complete', href: '/cases?page=1', active: false },
    { label: 'Needs evidence', count: 2, coverage: 'complete', href: '/cases?queue=needs_evidence&page=1', active: true },
    { label: 'Ready for decision', count: 3, coverage: 'complete', href: '/cases?queue=ready_for_decision&page=1', active: false },
  ];
  const { rerender } = render(<ExactClaimsPageView {...props} />);
  const verify = () => {
    const nav = within(screen.getByRole('navigation', { name: 'Case work states' }));
    expect(nav.getAllByRole('link')).toHaveLength(3);
    expect(nav.getByRole('link', { name: 'Needs evidence' })).toHaveAttribute('aria-current', 'page');
    expect(nav.getByRole('link', { name: 'Ready for decision' })).toHaveAttribute('href', '/cases?queue=ready_for_decision&page=1');
    expect(nav.queryByText('Ready to close')).not.toBeInTheDocument();
  };
  verify();
  rerender(<ClaimsPageView {...props} claims={[]} />);
  verify();
});

it('returns focus to a pointer opener that was not focused before the drawer opened', async () => {
  render(<ExactClaimsPageView {...propsFor(25)} />);
  const opener = screen.getByRole('button', { name: 'Filters' });
  expect(opener).not.toHaveFocus();
  // fireEvent deliberately does not pre-focus: this reproduces WebKit's
  // pointer-button behavior instead of concealing it with trigger.focus().
  fireEvent.click(opener);
  const dialog = await screen.findByRole('dialog', { name: 'Filter cases' });
  await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  await waitFor(() => expect(opener).toHaveFocus());
});
