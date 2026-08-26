/**
 * @jest-environment jsdom
 *
 * Overview keeps one dominant financial question. The visual, its
 * accessible data alternative, and the records drill-down all share range,
 * currency, and metric scope.
 */
import React, { type ReactNode } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type {
  DashboardPeriodComparison,
  DashboardOperationRow,
  IntelligenceReport,
  MoneyBridge,
  ReportTrendPoint,
} from '@/lib/reporting/intelligence';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, prefetch: _prefetch, ...props }: { href: string; children: ReactNode; prefetch?: boolean }) => <a href={href} {...props}>{children}</a>,
}));
jest.mock('next/navigation', () => ({
  usePathname: () => '/overview',
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('@/components/reports/ExportMenu', () => ({ __esModule: true, default: () => <button type="button">Export</button> }));
jest.mock('@/components/ui', () => ({
  Modal: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <div>{children}</div> : null,
  SourceBeacon: () => null,
}));
jest.mock('@/components/ui/ButtonLink', () => ({
  ButtonLink: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
jest.mock('@/components/navigation/AuthenticatedSidebar', () => ({
  AuthenticatedSidebar: () => <aside aria-label="Primary navigation" />,
}));
import {
  buildNonNegativeSmoothPaths,
  DashboardOverview,
} from '@/components/dashboard/DashboardOverview';

const bridge: MoneyBridge = {
  currency: 'GBP', requestedMinor: 0, exposedMinor: 12500, approvedMinor: 0,
  paidMinor: 0, estimatedLossMinor: 0, preventedMinor: 2400,
  realisedLossMinor: 800, recoverableMinor: 0, recoveredMinor: 3100,
  outstandingMinor: 0, writtenOffMinor: 0, finalNetLossMinor: 0,
  knownStates: ['exposed', 'recovered', 'prevented', 'confirmed_loss'], caseIds: ['case-1'],
};

const trend = (date: string, values: Partial<ReportTrendPoint> = {}): ReportTrendPoint => ({
  date, currency: 'GBP', exposureMinor: 0, recoveredMinor: 0, preventedMinor: 0,
  realisedLossMinor: 0, knownStates: bridge.knownStates, ...values,
});

const operation = (
  key: string,
  label: string,
  count: number,
  values: Partial<DashboardOperationRow> = {},
): DashboardOperationRow => ({
  key,
  label,
  count,
  activeCount: count,
  snoozedCount: 0,
  href: `/financials/reports/records?kind=case&dimension=status&value=${key}&range=7d&timezone=UTC`,
  overdueCount: 0,
  approachingCount: 0,
  readyCount: key === 'open' || key === 'ready_for_decision' ? count : 0,
  oldestOpenedAt: '2026-07-12T12:00:00.000Z',
  exposureByCurrency: [],
  ...values,
});

const report: IntelligenceReport = {
  range: '7d', timezone: 'UTC', generatedAt: '2026-07-16T12:00:00.000Z',
  bridges: [bridge], trend: [trend('2026-07-15', { exposureMinor: 12500, recoveredMinor: 3100, preventedMinor: 2400 })],
  causes: [], recoveries: [], recordCount: 4,
  operations: [
    operation('open', 'Ready for decision', 2, {
      overdueCount: 1,
      exposureByCurrency: [{
        currency: 'GBP',
        knownMinor: 12500,
        knownCaseCount: 2,
        unvaluedCaseCount: 0,
      }],
    }),
    operation('awaiting_customer_evidence', 'Awaiting customer evidence', 1),
    operation('recovery_opened', 'Recovery opened', 1),
  ],
  coverage: [
    {
      objectType: 'Orders',
      scope: 'connected-source',
      records: 4,
      freshRecords: 3,
      staleRecords: 1,
      latestAt: '2026-07-16T12:00:00.000Z',
      href: '/orders',
    },
    {
      objectType: 'Cases',
      scope: 'internal',
      records: 40,
      freshRecords: 0,
      staleRecords: 40,
      latestAt: '2026-07-16T12:00:00.000Z',
      href: '/claims',
    },
  ],
  reconciliation: {
    ok: false,
    issues: ['A recovered value needs review'],
    confidence: {
      state: 'qualified',
      issueCount: 1,
      affectedCurrencies: ['GBP'],
      affectedMetrics: ['recovered'],
      excludedRecordCount: 1,
    },
  },
};

const comparison: DashboardPeriodComparison = {
  range: '7d',
  startAt: '2026-07-02T12:00:00.000Z',
  endAt: '2026-07-09T12:00:00.000Z',
  bridges: [{
    ...bridge,
    exposedMinor: 10000,
    preventedMinor: 2000,
    recoveredMinor: 2000,
    realisedLossMinor: 600,
  }],
  trend: [trend('2026-07-08', {
    exposureMinor: 10000,
    preventedMinor: 2000,
    recoveredMinor: 2000,
    realisedLossMinor: 600,
  })],
};

describe('DashboardOverview financial focal surface', () => {
  it('keeps a smoothed non-negative series on or above the zero baseline', () => {
    const [path] = buildNonNegativeSmoothPaths(
      [0, 80, 0, 220, 0, 0, 410, 0],
      451,
      800,
      46,
      8,
      16,
      162,
    );
    const coordinates = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const yCoordinates = coordinates.filter((_, index) => index % 2 === 1);

    expect(yCoordinates.length).toBeGreaterThan(0);
    expect(Math.max(...yCoordinates)).toBeLessThanOrEqual(162);
    expect(Math.min(...yCoordinates)).toBeGreaterThanOrEqual(16);
  });

  it('shows semantic comparison chips for every KPI when prior-period data is active', () => {
    const { container } = render(
      <DashboardOverview report={report} comparison={comparison} selectedCurrency="GBP" compare="previous" />,
    );

    expect(container.querySelectorAll('[class*="deltaChip"][data-tone="positive"]')).toHaveLength(2);
    expect(container.querySelectorAll('[class*="deltaChip"][data-tone="negative"]')).toHaveLength(3);
    expect(container.querySelector('[class*="deltaChip"][data-tone="neutral"]')).not.toBeInTheDocument();
  });

  it('keeps the financial visual, table alternative, freshness state, and records link in one scoped frame', () => {
    render(<DashboardOverview report={report} comparison={null} selectedCurrency="GBP" compare="none" />);

    const frame = screen.getByRole('region', { name: 'Payout position' });
    expect(within(frame).getAllByText('Current period')).toHaveLength(5);
    expect(within(frame).queryByText('— Unavailable', { exact: true })).not.toBeInTheDocument();
    expect(within(frame).getByTestId('financial-plot')).toBeInTheDocument();
    expect(within(frame).getByText(
      'Only validated ledger values are shown; connected-source activity may also be incomplete.',
    )).toBeInTheDocument();
    expect(within(frame).getByText('Peak £125.00 · 15 Jul')).toBeInTheDocument();
    expect(within(frame).getByText('Daily intervals', { exact: false })).toBeInTheDocument();
    expect(within(frame).getByText('Daily identified cohorts and the recorded outcomes for those same cases')).toBeInTheDocument();
    expect(within(frame).getByRole('link', { name: 'View underlying records' }))
      .toHaveAttribute('href', '/financials/reports/records?kind=case&dimension=financial&metric=exposed&range=7d&currency=GBP&timezone=UTC');

    fireEvent.click(within(frame).getByRole('button', { name: 'View data' }));
    // Scoped to the exposure chart itself, not the whole "Payout position"
    // frame — Resolution mix (C2) now has its own ChartDataTable sibling
    // inside the same frame (VP3 acceptance: C1 and C2 both expose a table).
    const exposureChart = within(frame).getByRole('region', { name: 'Exposure intake and resolution' });
    const table = within(exposureChart).getByRole('table');
    expect(within(table).getByText('Payout exposure by period — GBP')).toBeInTheDocument();
    expect(within(table).getByText('£125.00')).toBeInTheDocument();
    expect(within(table).getByText('£31.00')).toBeInTheDocument();
    expect(screen.getByText('3 of 4 current · 75%')).toBeInTheDocument();
    expect(screen.getByText('Needs review')).toBeInTheDocument();
    const trust = screen.getByRole('region', { name: 'Data trust' });
    expect(within(trust).getByText('Validated values only')).toBeInTheDocument();
  });

  it('updates the visual records scope and table values with the selected metric', () => {
    render(<DashboardOverview report={report} comparison={null} selectedCurrency="GBP" compare="none" />);

    fireEvent.click(screen.getByRole('button', { name: 'Recovered' }));
    const frame = screen.getByRole('region', { name: 'Payout position' });
    expect(within(frame).getByRole('link', { name: 'View underlying records' }))
      .toHaveAttribute('href', '/financials/reports/records?kind=case&dimension=financial&metric=recovered&range=7d&currency=GBP&timezone=UTC');

    expect(within(frame).getByText('Received and reconciled')).toBeInTheDocument();
    fireEvent.click(within(frame).getByRole('button', { name: 'View data' }));
    const exposureChart = within(frame).getByRole('region', { name: 'Exposure intake and resolution' });
    expect(within(exposureChart).getByRole('table')).toHaveTextContent('Recovered by period — GBP');
  });

  it('supports one-tab-stop keyboard inspection with roving focus', () => {
    render(<DashboardOverview report={report} comparison={null} selectedCurrency="GBP" compare="none" />);

    const periodButton = screen.getByRole('button', {
      name: /15 Jul, Payout exposure £125\.00, Recovered £31\.00/,
    });
    const periodButtons = within(screen.getByTestId('financial-plot')).getAllByRole('button');
    expect(periodButtons.filter((button) => button.tabIndex === 0)).toHaveLength(1);

    fireEvent.focus(periodButton);

    const frame = screen.getByRole('region', { name: 'Payout position' });
    expect(within(frame).getByText('Payout exposure £125.00')).toBeInTheDocument();
    fireEvent.keyDown(periodButton, { key: 'Home' });
    expect(periodButtons[0]).toHaveFocus();
  });

  it('states the active/action/ready relationship and ranks attention with visible reasons', () => {
    render(<DashboardOverview report={report} comparison={null} selectedCurrency="GBP" compare="none" />);

    expect(screen.getByLabelText('4 active cases, 2 need action, 2 of those are ready now'))
      .toBeInTheDocument();
    const frame = screen.getByRole('region', { name: 'Payout position' });
    expect(within(frame).getByRole('link', { name: 'Open work' })).toHaveAttribute('href', '/work');
    const attention = screen.getByRole('region', { name: 'What needs attention' });
    expect(within(attention).getByText('1 overdue')).toBeInTheDocument();
    expect(within(attention).getByText('£125.00 exposure')).toBeInTheDocument();
  });
});
