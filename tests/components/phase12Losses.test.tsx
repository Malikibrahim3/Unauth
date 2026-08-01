/**
 * @jest-environment jsdom
 *
 * Phase 12: loss value leads the registry, cause filters stay connected to
 * the ledger, and financial visuals distinguish a reconciled formula from an
 * unavailable one.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { LossLedger, type LossLedgerRow } from '@/components/losses/LossLedger';
import { LossTrendChart, LossWaterfall } from '@/components/losses/LossVisuals';

const BASE_ROW: LossLedgerRow = {
  id: 'loss-1',
  supportPayoutCaseId: 'case-1',
  category: 'delivery_loss',
  attribution: 'carrier_loss',
  counterpartyType: 'carrier',
  counterpartyName: 'UPS',
  status: 'collecting_evidence',
  recoverability: 'recoverable',
  financialState: 'confirmed',
  preventionOnly: false,
  writtenOff: false,
  realisedLossMinor: 12500,
  estimatedLossMinor: null,
  netUnrecoveredMinor: 8500,
  recoverableMinor: 10000,
  recoveredMinor: 4000,
  currency: 'GBP',
  source: null,
  freshness: 'current',
  updatedAt: '2026-07-29T10:00:00.000Z',
};

describe('Phase 12 losses route visuals', () => {
  it('keeps cause filters and ledger views connected to the same rows', () => {
    render(
      <LossLedger
        rows={[
          BASE_ROW,
          {
            ...BASE_ROW,
            id: 'loss-2',
            attribution: 'warehouse_error',
            category: 'fulfilment_or_warehouse_error',
            counterpartyType: 'warehouse',
            counterpartyName: 'Northline Fulfilment',
            recoverability: 'not_recoverable',
            recoverableMinor: null,
          },
        ]}
      />,
    );

    expect(screen.getByRole('region', { name: 'Loss ledger table' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Delivery loss/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Fulfilment error/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Recoverable/ }));

    expect(screen.getByRole('link', { name: /Delivery loss/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Fulfilment error/ })).not.toBeInTheDocument();
  });

  it('maps the Other cause filter to the ranked tail rather than its complement', () => {
    render(
      <LossLedger
        rows={[BASE_ROW, { ...BASE_ROW, id: 'loss-2', attribution: 'warehouse_error', category: 'fulfilment_or_warehouse_error' }]}
        selectedAttribution="__other"
        otherAttributionKeys={['warehouse_error']}
      />,
    );

    expect(screen.queryByRole('link', { name: /Delivery loss/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Fulfilment error/ })).toBeInTheDocument();
  });

  it('renders the immutable loss trend and accessible data table contract', () => {
    render(
      <LossTrendChart
        currency="GBP"
        data={[
          { key: '2026-07-01', label: '01 Jul 2026', totalMinor: 1000, causes: [{ key: 'carrier_loss', label: 'Carrier loss', valueMinor: 1000, href: '/losses?attribution=carrier_loss' }] },
          { key: '2026-07-02', label: '02 Jul 2026', totalMinor: 2500, causes: [{ key: 'carrier_loss', label: 'Carrier loss', valueMinor: 2500, href: '/losses?attribution=carrier_loss' }] },
          { key: '2026-07-03', label: '03 Jul 2026', totalMinor: 1800, causes: [{ key: 'warehouse_error', label: 'Warehouse error', valueMinor: 1800, href: '/losses?attribution=warehouse_error' }] },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'When and why are confirmed losses accumulating?' })).toBeInTheDocument();
    expect(screen.getByText('Source: append-only financial entries · no mutable updated_at dates')).toBeInTheDocument();
    expect(screen.getByText('View chart data')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /01 Jul 2026: Carrier loss/ })).toBeInTheDocument();
  });

  it('does not present an unreconciled waterfall as a financial result', () => {
    render(
      <LossWaterfall
        currency="GBP"
        reconciled={false}
        steps={[
          { key: 'loss', label: 'Confirmed loss', valueMinor: 1000, direction: 'total' },
          { key: 'recovered', label: 'Recovered value', valueMinor: null, direction: 'subtract' },
          { key: 'net', label: 'Net unrecovered', valueMinor: null, direction: 'total' },
        ]}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loss formula unavailable');
    expect(screen.getByText(/No amount has been inferred/)).toBeInTheDocument();
  });

  it('keeps a reconciled zero waterfall distinct from unavailable data', () => {
    render(
      <LossWaterfall
        currency="GBP"
        reconciled
        steps={[
          { key: 'loss', label: 'Confirmed loss', valueMinor: 0, direction: 'total' },
          { key: 'recovered', label: 'Recovered value', valueMinor: 0, direction: 'subtract' },
          { key: 'net', label: 'Net unrecovered', valueMinor: 0, direction: 'total' },
        ]}
      />,
    );

    expect(screen.queryByText('Loss formula unavailable')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'What remains unrecovered from this loss?' })).toBeInTheDocument();
    expect(screen.getAllByText('£0.00').length).toBeGreaterThan(0);
  });
});
