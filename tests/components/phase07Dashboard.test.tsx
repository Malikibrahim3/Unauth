/**
 * @jest-environment jsdom
 *
 * Phase 07: Overview keeps one dominant financial question. The visual, its
 * accessible data alternative, and the records drill-down all share range,
 * currency, and metric scope.
 */
import React, { type ReactNode } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type {
  DashboardOperationRow,
  IntelligenceReport,
  MoneyBridge,
  ReportTrendPoint,
} from '@/lib/reporting/intelligence';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a>,
}));
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('@/components/reports/ExportMenu', () => ({ __esModule: true, default: () => <button type="button">Export</button> }));
jest.mock('@/components/ui', () => ({
  Modal: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <div>{children}</div> : null,
}));
jest.mock('@/components/ui/ButtonLink', () => ({
  ButtonLink: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
jest.mock('@/components/ui/MetricGroup', () => ({
  MetricGroup: ({ items }: { items: Array<{ label: string; value: ReactNode }> }) => <dl>{items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>,
}));
jest.mock('@/components/charts/authenticated/cartesian/ComboBarLineChart', () => ({
  ComboBarLineChart: () => <div data-testid="financial-plot" />,
}));
jest.mock('@/components/charts/authenticated/cartesian/CompositionDonutChart', () => ({
  CompositionDonutChart: () => <div data-testid="workflow-plot" />,
}));
jest.mock('@/components/charts/authenticated/operational/WaffleMatrixChart', () => ({
  WaffleMatrixChart: () => <div data-testid="freshness-plot" />,
}));
jest.mock('@/components/charts/authenticated/RankedContributionChart', () => ({
  RankedContributionChart: () => <div data-testid="priority-work-plot" />,
}));
jest.mock('@/components/charts/authenticated/micro/MetricRail', () => ({
  MetricRail: () => null,
}));
jest.mock('@/components/charts/authenticated/micro/MetricTabs', () => ({
  MetricTabs: ({
    items,
    active,
    onSelect,
  }: {
    items: Array<{ key: string; label: string; value: ReactNode }>;
    active: string;
    onSelect: (key: string) => void;
  }) => (
    <div role="group" aria-label="Payout metric">
      {items.map((item) => <button key={item.key} type="button" aria-pressed={item.key === active} onClick={() => onSelect(item.key)}>{item.label} {item.value}</button>)}
    </div>
  ),
}));

import { DashboardOverview } from '@/components/dashboard/DashboardOverview';

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
  href: `/reports/records?kind=case&dimension=status&value=${key}&range=7d&timezone=UTC`,
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

describe('DashboardOverview Phase 07 financial focal surface', () => {
  it('keeps the financial visual, table alternative, freshness state, and records link in one scoped frame', () => {
    render(<DashboardOverview report={report} comparison={null} selectedCurrency="GBP" compare="none" />);

    const frame = screen.getByRole('region', { name: 'Payout position' });
    expect(within(frame).getByTestId('financial-plot')).toBeInTheDocument();
    expect(within(frame).getByText(
      'Only validated ledger values are shown; connected-source activity may also be incomplete.',
    )).toBeInTheDocument();
    expect(within(frame).getByText('Peak £125.00 · 15 Jul')).toBeInTheDocument();
    expect(within(frame).getByText('Daily intervals', { exact: false })).toBeInTheDocument();
    expect(within(frame).getByRole('link', { name: 'View underlying records' }))
      .toHaveAttribute('href', '/reports/records?kind=case&dimension=financial&metric=exposed&range=7d&currency=GBP&timezone=UTC');

    fireEvent.click(within(frame).getByRole('button', { name: 'View data' }));
    const table = within(frame).getByRole('table');
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
      .toHaveAttribute('href', '/reports/records?kind=case&dimension=financial&metric=recovered&range=7d&currency=GBP&timezone=UTC');

    expect(within(frame).getByText('Received and reconciled')).toBeInTheDocument();
    fireEvent.click(within(frame).getByRole('button', { name: 'View data' }));
    expect(within(frame).getByRole('table')).toHaveTextContent('Recovered by period — GBP');
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
