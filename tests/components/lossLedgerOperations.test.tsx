/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { LossLedgerOperations } from '@/components/losses/LossLedgerOperations';
import { LossLedgerFilters } from '@/components/losses/LossLedgerFilters';
import { SuppliedVisualBody } from '@/components/visual-authority/generated/Loss-Ledger-Clean';
import type { LossLedgerRow } from '@/components/losses/LossLedger';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const row = (id: string, patch: Partial<LossLedgerRow> = {}): LossLedgerRow => ({
  id, supportPayoutCaseId: `case-${id}`, category: 'parcel_missing', attribution: 'carrier',
  counterpartyType: 'carrier', counterpartyName: 'Runtime carrier', status: 'submitted',
  recoverability: 'recoverable', financialState: 'confirmed', preventionOnly: false, writtenOff: false,
  realisedLossMinor: 418000, estimatedLossMinor: null, recoveredMinor: 0, netUnrecoveredMinor: 418000,
  recoverableMinor: 418000, currency: 'GBP', source: 'ups', freshness: 'current',
  effectiveAt: '2026-08-24T12:00:00Z', updatedAt: '2026-09-01T12:00:00Z', ...patch,
});

const props = (rows: LossLedgerRow[]): ComponentProps<typeof LossLedgerOperations> => ({
  rows, currency: 'GBP', rangeLabel: 'All time', selectedCause: null,
  hrefForCause: (cause) => `/financials/losses?search=${cause ?? ''}`,
  page: 1, hrefForPage: (page) => `/financials/losses?page=${page}`, recordLimitation: null,
  aggregate: { currencies: [], from: null, to: null, currencyFilter: 'GBP',
    definitionVersion: 'mr4-financial-v1', timeBasis: 'case_submitted_at',
    mixedCurrencyPolicy: 'separated', unknownPolicy: 'withheld_not_zero', source: 'unavailable', limitation: null },
});

describe('source Loss ledger with runtime bindings', () => {
  it('uses the supplied entry nesting, column geometry, fonts and status markup', () => {
    const reference = render(<SuppliedVisualBody />);
    const sourceRow = within(reference.container).getByText('LOSS-2228').parentElement!;
    const styles = [sourceRow, ...sourceRow.querySelectorAll('*')].map((element) => [element.tagName, element.getAttribute('style')]);
    reference.unmount();
    const actual = render(<LossLedgerOperations {...props([row('runtime-loss')])} />);
    const actualRow = actual.container.querySelector('a[href="/financials/losses/runtime-loss"]')!.parentElement!;
    expect([actualRow, ...actualRow.querySelectorAll('*')].map((element) => [element.tagName, element.getAttribute('style')])).toEqual(styles);
    expect(within(actualRow).getByRole('link', { name: /case/i })).toHaveAttribute('href', '/cases/case-runtime-loss');
    expect(screen.queryByText('LOSS-2228')).not.toBeInTheDocument();
  });

  it('shows seven backend rows and keeps both pagination controls', () => {
    const input = props(Array.from({ length: 8 }, (_, index) => row(`record-${index}`)));
    const { rerender, container } = render(<LossLedgerOperations {...input} />);
    expect(container.querySelectorAll('a[href^="/financials/losses/record-"]')).toHaveLength(7);
    expect(screen.getByText('Previous')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/financials/losses?page=2');
    rerender(<LossLedgerOperations {...input} page={2} />);
    expect(container.querySelectorAll('a[href^="/financials/losses/record-"]')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '/financials/losses?page=1');
    expect(screen.getByText('Next')).toHaveAttribute('aria-disabled', 'true');
  });

  it('does not invent effective dates, confirmed amounts or causal explanations', () => {
    render(<LossLedgerOperations {...props([
      row('undated', { effectiveAt: null }),
      row('estimated', { realisedLossMinor: null, estimatedLossMinor: 123456 }),
    ])} />);
    expect(screen.getByText('0 weeks')).toBeInTheDocument();
    expect(screen.getByText(/No source-backed case-submission distribution/)).toBeInTheDocument();
    expect(screen.getByText('BY CASE SUBMISSION DATE')).toBeInTheDocument();
    expect(screen.queryByText(/bank holiday|will lock on 5 Sep/)).not.toBeInTheDocument();
  });

  it('keeps unavailable cause amounts distinct from verified zero', () => {
    const { rerender, container } = render(<LossLedgerOperations {...props([row('missing', { realisedLossMinor: null, recoveredMinor: null })])} />);
    const cause = () => container.querySelector('a[href="/financials/losses?search=carrier"]')!.parentElement!;
    expect(cause().textContent).toContain('—');
    expect(cause().textContent).not.toContain('£0.00');
    rerender(<LossLedgerOperations {...props([row('zero', { realisedLossMinor: 0 })])} />);
    expect(cause().textContent).toContain('£0.00');
  });

  it('does not combine different currencies in the distribution', () => {
    render(<LossLedgerOperations {...props([row('gbp'), row('usd', {currency: 'USD'})])} currency={null} />);
    expect(screen.getByText('0 weeks')).toBeInTheDocument();
    expect(screen.getByText(/0 causes shown/)).toBeInTheDocument();
  });

  it('shows completed write-offs as completed, not still due', () => {
    render(<LossLedgerOperations {...props([row('closed', { writtenOff: true })])} />);
    expect(screen.getByText('WRITTEN OFF')).toBeInTheDocument();
    expect(screen.queryByText('WRITE-OFF DUE')).not.toBeInTheDocument();
  });

  it('connects all four supplied filters to scoped canonical URLs', () => {
    const filters = ['Date range', 'Cause', 'Status', 'Currency'].map((name, index) => ({
      name, label: `${name} current`, value: 'current', options: [
        {value: 'current', label: 'Current', href: '/financials/losses?range=all'},
        {value: 'changed', label: 'Changed', href: `/financials/losses?filter=${index}&page=1`},
      ],
    })) as ComponentProps<typeof LossLedgerFilters>['filters'];
    render(<LossLedgerFilters filters={filters} entryCount={8} exportHref="/api/reports/claims?range=all" />);
    expect(screen.getAllByRole('combobox')).toHaveLength(4);
    for (const [index, filter] of filters.entries()) {
      fireEvent.change(screen.getByRole('combobox', {name: filter.name}), {target: {value: 'changed'}});
      expect(push).toHaveBeenLastCalledWith(`/financials/losses?filter=${index}&page=1`);
    }
    expect(screen.getByRole('link', {name: 'Export rows'})).toHaveAttribute('href', '/api/reports/claims?range=all');
  });
});
