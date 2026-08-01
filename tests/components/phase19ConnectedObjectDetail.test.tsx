/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import { ConnectedObjectDetail } from '@/components/relationships/ConnectedObjectDetail';
import { CommerceObjectRouteSkeleton } from '@/components/relationships/CommerceObjectRouteSkeleton';
import type { ObjectSummary } from '@/lib/relationships/objectSummary';

const ORDER: ObjectSummary = {
  id: 'order-row-id',
  type: 'order',
  reference: '10042',
  sourceId: 'provider-order-773',
  provider: 'shopify',
  state: 'paid',
  updatedAt: '2026-07-29T10:00:00.000Z',
  amount: 129,
  currency: 'GBP',
  sourceOrderId: 'order-row-id',
  customer: { type: 'customer', id: 'customer-id', reference: 'Maya Chen', href: '/customers/customer-id' },
  connected: [
    { type: 'customer', id: 'customer-id', reference: 'Maya Chen', href: '/customers/customer-id' },
    { type: 'shipment', id: 'shipment-id', reference: 'TRK-204', href: '/shipments/shipment-id', state: 'delivered' },
    { type: 'payout case', id: 'case-id', reference: 'delivery issue · 6a77e1c9', href: '/claims/case-id', state: 'open' },
  ],
  facts: [
    { label: 'Total', value: 129, kind: 'money', currency: 'GBP' },
    { label: 'Discounts', value: 10, kind: 'money', currency: 'GBP' },
    { label: 'Fulfilment', value: 'fulfilled' },
  ],
  items: [
    { id: 'line-id', title: 'Canvas tote', sku: 'TOTE-01', quantity: 2, amount: 129, currency: 'GBP' },
  ],
  timeline: [{ label: 'Order placed', at: '2026-07-28T10:00:00.000Z', detail: 'paid' }],
  conversation: [],
  evidence: [],
  payoutCases: [{ type: 'payout case', id: 'case-id', reference: 'delivery issue · 6a77e1c9', href: '/claims/case-id', state: 'open' }],
  provenance: {
    sourceSystem: 'shopify',
    externalId: 'provider-order-773',
    sourceUrl: 'https://admin.shopify.com/orders/773',
    freshness: 'healthy',
    syncState: 'connected',
    lastSyncedAt: '2026-07-29T09:58:00.000Z',
    sourceCreatedAt: '2026-07-28T10:00:00.000Z',
    sourceUpdatedAt: '2026-07-29T10:00:00.000Z',
    connectorVersion: null,
    payloadHash: 'not-rendered',
  },
};

describe('Phase 19 commerce connected-object detail', () => {
  it('keeps human identity, provenance, canonical customer/case links, financial context, and joined evidence sections together', () => {
    render(<ConnectedObjectDetail object={ORDER} />);

    expect(screen.getByRole('heading', { name: '10042' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Customers' })).toHaveAttribute('href', '/customers');
    expect(screen.getByRole('link', { name: 'Maya Chen' })).toHaveAttribute('href', '/customers/customer-id');
    expect(screen.getByRole('heading', { name: 'Financial context' })).toBeInTheDocument();
    expect(screen.getByText('£129.00')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Items' })).toBeInTheDocument();
    expect(screen.getByText('Canvas tote')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lifecycle' })).toBeInTheDocument();

    const connected = screen.getByRole('heading', { name: 'Connected records' }).parentElement!;
    expect(within(connected).getByRole('link', { name: /delivery issue/i })).toHaveAttribute(
      'href',
      '/claims/case-id?return=%2Forders%2Forder-row-id',
    );

    const provenance = screen.getByTestId('connected-object-provenance');
    expect(within(provenance).getByText('From Shopify')).toBeInTheDocument();
    expect(provenance).toHaveTextContent('Healthy');
    expect(provenance).toHaveTextContent('Connected');
    expect(screen.queryByText('provider-order-773')).not.toBeInTheDocument();
    expect(screen.queryByText('not-rendered')).not.toBeInTheDocument();
  });

  it('never promotes a UUID source reference to the page identity and rejects an external return destination', () => {
    render(<ConnectedObjectDetail object={{ ...ORDER, reference: '123e4567-e89b-12d3-a456-426614174000' }} returnTo="//outside.example" />);

    expect(screen.getByRole('heading', { name: 'Order record' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Customers' })).toHaveAttribute('href', '/customers');
  });

  it('uses the same loading geometry for each commerce object route', () => {
    render(<CommerceObjectRouteSkeleton title="Loading shipment" />);
    expect(screen.getByLabelText('Loading shipment')).toHaveAttribute('aria-busy', 'true');
    expect(document.querySelector('.ua-working-surface')).toBeInTheDocument();
    expect(document.querySelectorAll('.ua-joined-section')).toHaveLength(3);
  });
});
