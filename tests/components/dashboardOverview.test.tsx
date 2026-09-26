/**
 * @jest-environment jsdom
 *
 * The supplied Overview source is the visual contract. These tests keep the
 * canonical report data, trust state, and source hierarchy observable without
 * retaining assertions for the retired task-first dashboard.
 */
import React, { type ReactNode } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DashboardPeriodComparison, DashboardOperationRow, IntelligenceReport, MoneyBridge, ReportTrendPoint } from '@/lib/reporting/intelligence';

const mockPush = jest.fn();

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, prefetch: _prefetch, ...props }: { href: string; children: ReactNode; prefetch?: boolean }) => <a href={href} {...props}>{children}</a>,
  useLinkStatus: () => ({ pending: false }),
}));
jest.mock('next/navigation', () => ({
  usePathname: () => '/overview',
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

import { ExactDashboardOverview } from '@/components/dashboard/ExactDashboardOverview';
import { ExactAuthenticatedShell } from '@/components/layout/ExactAuthenticatedShell';

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

const operation = (key: string, label: string, count: number, values: Partial<DashboardOperationRow> = {}): DashboardOperationRow => ({
  key, label, count, activeCount: count, snoozedCount: 0,
  href: `/financials/reports/records?kind=case&dimension=status&value=${key}&range=7d&timezone=UTC`,
  overdueCount: 0, approachingCount: 0, readyCount: key === 'open' || key === 'ready_for_decision' ? count : 0,
  oldestOpenedAt: '2026-07-12T12:00:00.000Z', exposureByCurrency: [], ...values,
});

const report: IntelligenceReport = {
  range: '7d', timezone: 'UTC', generatedAt: '2026-07-16T12:00:00.000Z',
  bridges: [bridge], trend: [trend('2026-07-15', { exposureMinor: 12500, recoveredMinor: 3100, preventedMinor: 2400 })],
  causes: [], recoveries: [], recordCount: 4,
  operations: [
    operation('open', 'Ready for decision', 2, { overdueCount: 1, exposureByCurrency: [{ currency: 'GBP', knownMinor: 12500, knownCaseCount: 2, unvaluedCaseCount: 0 }] }),
    operation('awaiting_customer_evidence', 'Awaiting customer evidence', 1),
    operation('recovery_opened', 'Recovery opened', 1),
  ],
  coverage: [
    { objectType: 'Orders', scope: 'connected-source', records: 4, freshRecords: 3, staleRecords: 1, latestAt: '2026-07-16T12:00:00.000Z', href: '/orders' },
    { objectType: 'Cases', scope: 'internal', records: 40, freshRecords: 0, staleRecords: 40, latestAt: '2026-07-16T12:00:00.000Z', href: '/cases' },
  ],
  reconciliation: {
    ok: false,
    issues: ['A recovered value needs review'],
    confidence: { state: 'qualified', issueCount: 1, affectedCurrencies: ['GBP'], affectedMetrics: ['recovered'], excludedRecordCount: 1 },
  },
};

const comparison: DashboardPeriodComparison = {
  range: '7d', startAt: '2026-07-02T12:00:00.000Z', endAt: '2026-07-09T12:00:00.000Z',
  bridges: [{ ...bridge, exposedMinor: 10000, preventedMinor: 2000, recoveredMinor: 2000, realisedLossMinor: 600 }],
  trend: [trend('2026-07-08', { exposureMinor: 10000, preventedMinor: 2000, recoveredMinor: 2000, realisedLossMinor: 600 })],
};

describe('DashboardOverview supplied visual authority', () => {
  it('exposes one main landmark and retains the supplied breadcrumb hierarchy', () => {
    const { container } = render(
      <ExactAuthenticatedShell pathname="/overview" workspaceName="Test workspace" workspaces={[]} activeMerchantId={null} userName="Test member" userRole="owner" permissions={[]} sourceTone="green" sourceLabel="Sources current">
        <ExactDashboardOverview report={report} comparison={comparison} selectedCurrency="GBP" compare="previous" />
      </ExactAuthenticatedShell>,
    );
    expect(screen.getByRole('main').tagName).toBe('MAIN');
    expect(container.querySelector('main h1')).toHaveTextContent('Operating position');
    expect(screen.getByText('Company position')).toBeInTheDocument();
    expect(screen.getByText('Configure & connect')).toBeInTheDocument();
  });

  it('binds the supplied date control once, including clicks on its label', () => {
    mockPush.mockClear();
    const { container } = render(<ExactDashboardOverview report={report} comparison={comparison} selectedCurrency="GBP" compare="previous" />);
    expect(screen.getAllByRole('button', { name: 'Last 7 days' })).toHaveLength(1);
    expect(container.querySelector('[role="button"] [role="button"]')).toBeNull();
    fireEvent.click(screen.getByText('Last 7 days'));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/overview?range=30d');
  });

  it('keeps the exact source hierarchy and one date-range control', () => {
    const { container } = render(<ExactDashboardOverview report={report} comparison={comparison} selectedCurrency="GBP" compare="previous" />);
    const root = container.querySelector('[data-reference-id="Overview-Clean"]');
    expect(root).toHaveAttribute('data-visual-world', 'supplied-package');
    const source = container.textContent ?? '';
    expect(source.indexOf('FINANCIAL POSITION')).toBeLessThan(source.indexOf('RECOVERY STAGES'));
    expect(source.indexOf('RECOVERY STAGES')).toBeLessThan(source.indexOf('WHAT NEEDS ATTENTION'));
    expect(source.indexOf('WHAT NEEDS ATTENTION')).toBeLessThan(source.indexOf('EVIDENCE COVERAGE'));
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Last 7 days' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'vs previous period' })).toBeInTheDocument();
    expect(screen.getByText('GBP only')).toBeInTheDocument();
  });

  it('renders truthful report values and keeps trust details in the source structure', () => {
    render(<ExactDashboardOverview report={report} comparison={null} selectedCurrency="GBP" compare="none" />);
    expect(screen.getAllByText('£125.00').length).toBeGreaterThan(0);
    expect(screen.getByText(/Recognised across 4 cases/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 data-trust issues' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '1 data-trust issues' }));
    expect(screen.getByRole('dialog', { name: 'Data trust' })).toBeInTheDocument();
    expect(screen.getByText('Validated values only. Figures include source-backed records; affected values are marked rather than estimated.')).toBeInTheDocument();
  });

  it('provides a reachable semantic table alternative for the trend chart', () => {
    render(<ExactDashboardOverview report={report} comparison={null} selectedCurrency="GBP" compare="none" />);
    fireEvent.click(screen.getByText('View trend data'));
    const table = screen.getByRole('table', { name: /Last 7 days/ });
    expect(table).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'EXPOSURE' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '2026-07-15' })).toBeInTheDocument();
    expect(screen.getAllByText('£125.00').length).toBeGreaterThan(0);
  });

  it('keeps unavailable figures distinct from zero', () => {
    render(<ExactDashboardOverview report={{ ...report, bridges: [] }} comparison={null} selectedCurrency="GBP" compare="none" acceptanceState="unavailable" />);
    expect(screen.getByText('No verified financial position for this range')).toBeInTheDocument();
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
  });

  it('uses live chart paths, source coverage and canonical work links instead of example facts', () => {
    const { container } = render(<ExactDashboardOverview report={report} comparison={comparison} selectedCurrency="GBP" compare="previous" />);
    expect(screen.queryByText('4m ago')).not.toBeInTheDocument();
    expect(screen.queryByText(/CASE-4192/)).not.toBeInTheDocument();
    expect(screen.getByText('3 / 4 current')).toBeInTheDocument();
    expect(screen.getByText('Recovered', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText(/Re1 of|Re5 of/)).not.toBeInTheDocument();
    const graph = container.querySelector('svg[viewBox="0 0 640 190"]')!;
    expect(graph.querySelector('path[stroke="#f2761a"]')).toHaveAttribute('d', 'M20 6');
    const workLink = screen.getAllByRole('link').find((node) => node.textContent?.includes('Ready for decision'))!;
    fireEvent.click(workLink);
    expect(mockPush).toHaveBeenCalledWith(report.operations[0].href);
  });

  it('does not leave sample work rows behind when no work exists', () => {
    render(<ExactDashboardOverview report={{ ...report, operations: [] }} comparison={null} selectedCurrency="GBP" compare="none" />);
    expect(screen.getByRole('status')).toHaveTextContent('No work in this group');
    expect(screen.queryByText(/CASE-4187|REC-1191|EXC-118/)).not.toBeInTheDocument();
  });
});
