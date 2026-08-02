/**
 * @jest-environment jsdom
 *
 * Phase 06 (LP-VIZ-02/04/06/07, LP-MOT-06): the shared chart frame exposes the
 * §6.4 anatomy (question, scope, freshness, drill-down, accessible table); the
 * state matrix distinguishes every §6.6 state; the data table is the
 * keyboard-equivalent alternative; and chart motion is topology-aware.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, renderHook, screen, within } from '@testing-library/react';

jest.mock('@/lib/design/useMotionAllowed', () => ({ useMotionAllowed: jest.fn(() => true) }));

import {
  ChartFrame,
  ChartState,
  ChartDataTable,
  simpleChartTable,
  type ChartDataTableModel,
} from '@/components/charts/authenticated/ChartFrame';
import { RankedContributionChart } from '@/components/charts/authenticated/RankedContributionChart';
import { useChartMotion } from '@/components/charts/authenticated/core/useChartMotion';
import { useMotionAllowed } from '@/lib/design/useMotionAllowed';

const mockMotionAllowed = useMotionAllowed as jest.Mock;

const twoSeriesTable: ChartDataTableModel = {
  caption: 'Exposure and recovered value by period',
  columns: [
    { key: 'period', header: 'Period' },
    { key: 'exposure', header: 'Exposure', numeric: true },
    { key: 'recovered', header: 'Recovered', numeric: true },
  ],
  rows: [
    { key: 'jul-1', header: '1 Jul', values: ['£1,000', '£200'] },
    { key: 'jul-2', header: '2 Jul', headerHref: '/reports/records?d=jul-2', values: ['£1,250', '£450'] },
  ],
};

describe('ChartFrame anatomy (LP-VIZ-02, §6.4)', () => {
  it('exposes question, summary, scope, legend, freshness, drill-down, and table', () => {
    render(
      <ChartFrame
        id="hero"
        kind="cumulative-financial"
        question="How is financial value accumulating?"
        summary="Cumulative daily financial value"
        scope="GBP · Last 30 days"
        legend={<span>Exposure · Recovered</span>}
        freshness="Source: case ledger · updated 2 minutes ago"
        records={{ href: '/reports/records?metric=exposed' }}
        table={twoSeriesTable}
      >
        <div data-testid="plot">plot</div>
      </ChartFrame>,
    );

    // Question-led title names the section.
    const section = screen.getByRole('region', { name: 'How is financial value accumulating?' });
    expect(within(section).getByRole('heading', { level: 2 })).toHaveTextContent('How is financial value accumulating?');
    expect(within(section).getByText('Cumulative daily financial value')).toBeInTheDocument();
    expect(within(section).getByText('GBP · Last 30 days')).toBeInTheDocument();
    expect(within(section).getByText(/Source: case ledger/)).toBeInTheDocument();
    expect(section).toHaveAttribute('data-auth-chart', 'cumulative-financial');

    // Drill-down (§6.4 item 8) is a keyboard-reachable link with the real href.
    const drill = screen.getByRole('link', { name: /view records/i });
    expect(drill).toHaveAttribute('href', '/reports/records?metric=exposed');
  });
});

describe('ChartDataTable — keyboard-equivalent values (LP-VIZ-06, §6.6)', () => {
  it('renders a single accessible table with right-aligned numeric columns and row deep-links', () => {
    render(<ChartDataTable model={twoSeriesTable} defaultOpen />);

    const table = screen.getByRole('table');
    expect(within(table).getByText('Exposure and recovered value by period')).toBeInTheDocument(); // <caption>

    // Every plotted value is present in the table (pointer tooltip ⇒ keyboard-equivalent text).
    expect(within(table).getByText('£1,250')).toBeInTheDocument();
    expect(within(table).getByText('£450')).toBeInTheDocument();

    // Numeric columns carry the right-align class; the row header is a real <th scope="row">.
    const numericHeader = within(table).getByRole('columnheader', { name: 'Exposure' });
    expect(numericHeader.className).toContain('numericCol');
    expect(within(table).getByRole('rowheader', { name: '1 Jul' })).toBeInTheDocument();
    expect(within(table).getByRole('link', { name: '2 Jul' })).toHaveAttribute('href', '/reports/records?d=jul-2');
  });

  it('renders nothing when the model has no rows', () => {
    const { container } = render(<ChartDataTable model={{ columns: twoSeriesTable.columns, rows: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('folds the legacy single-value row shape onto the same primitive', () => {
    const model = simpleChartTable([{ label: 'Carrier', value: '£300', detail: '4 records', href: '/x' }]);
    expect(model.columns.map((c) => c.header)).toEqual(['Item', 'Value', 'Context']);
    expect(model.rows[0].values).toEqual(['£300', '4 records']);
  });
});

describe('ChartState matrix (LP-VIZ-07, §6.6)', () => {
  it('announces data-integrity blocks assertively and other states politely', () => {
    const { rerender } = render(<ChartState kind="error" title="Could not load" description="x" action={<button>Retry</button>} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();

    rerender(<ChartState kind="mixed-currency" title="Mixed currency" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Mixed currency');

    rerender(<ChartState kind="filtered-empty" title="No matches" action={<button>Clear filters</button>} />);
    expect(screen.getByRole('status')).toHaveTextContent('No matches');
  });

  it('carries the kind so stale/partial metadata can take a caution tone', () => {
    const { container } = render(<ChartState kind="stale" title="Showing last known values" />);
    expect(container.querySelector('[data-kind="stale"]')).not.toBeNull();
  });
});

describe('RankedContributionChart on the shared frame (consumer)', () => {
  it('renders inside a ChartFrame region with an accessible table and an optional drill-down', () => {
    render(
      <RankedContributionChart
        id="causes"
        title="Which causes account for most value?"
        description="Confirmed loss by cause"
        records={{ href: '/reports/records?dimension=cause', label: 'View all causes' }}
        items={[
          { label: 'Carrier', value: 3000, displayValue: '£3,000', href: '/c/carrier' },
          { label: 'Warehouse', value: 1200, displayValue: '£1,200', href: '/c/wh' },
        ]}
      />,
    );

    const section = screen.getByRole('region', { name: 'Which causes account for most value?' });
    expect(within(section).getByText('Confirmed loss by cause')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all causes' })).toHaveAttribute('href', '/reports/records?dimension=cause');
    // Accessible table exposes the ranked values.
    expect(within(screen.getByRole('table')).getByText('£3,000')).toBeInTheDocument();
  });

  it('shows the empty state when no attributable value exists', () => {
    render(<RankedContributionChart id="empty" title="Where is value?" description="d" items={[]} />);
    expect(screen.getByText('No attributable value')).toBeInTheDocument();
  });
});

describe('useChartMotion topology-aware phases (LP-MOT-06)', () => {
  beforeEach(() => mockMotionAllowed.mockReturnValue(true));

  it('grows once, morphs on value updates, and snaps on a topology change', () => {
    const { result, rerender } = renderHook(
      ({ n, key }: { n: number; key: string }) => useChartMotion(n, { topologyKey: key }),
      { initialProps: { n: 5, key: 'a' } },
    );

    expect(result.current.phase).toBe('initial');
    expect(result.current.isAnimationActive).toBe(true);

    rerender({ n: 5, key: 'a' }); // value-only update, stable topology
    expect(result.current.phase).toBe('update');
    expect(result.current.isAnimationActive).toBe(true);

    rerender({ n: 6, key: 'b' }); // topology change ⇒ snap, no misleading tween
    expect(result.current.phase).toBe('none');
    expect(result.current.isAnimationActive).toBe(false);
  });

  it('suppresses motion past the density cap', () => {
    const { result } = renderHook(() => useChartMotion(41, { topologyKey: 'x' }));
    expect(result.current.isAnimationActive).toBe(false);
    expect(result.current.phase).toBe('none');
  });

  it('suppresses motion when reduced motion / capture mode disallow it', () => {
    mockMotionAllowed.mockReturnValue(false);
    const { result } = renderHook(() => useChartMotion(3, { topologyKey: 'x' }));
    expect(result.current.isAnimationActive).toBe(false);
  });
});
