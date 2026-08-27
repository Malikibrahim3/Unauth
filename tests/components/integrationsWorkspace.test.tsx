/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { IntegrationsWorkspace } from '@/components/integrations/IntegrationsWorkspace';
import type { CatalogueRowItem } from '@/lib/integrations/catalogueView';

function catalogueItem(overrides: Partial<CatalogueRowItem> = {}): CatalogueRowItem {
  return {
    id: 'shopify',
    name: 'Shopify',
    description: 'Orders, customers, line items and refunds.',
    category: 'commerce',
    stage: 'live',
    status: 'not_connected',
    syncState: 'no_records_found',
    freshness: {
      confidence: 'unavailable',
      deliveryModel: 'unknown',
      lastDataReceivedAt: null,
      lastSyncAttemptAt: null,
    },
    connectionId: null,
    connectionCount: 0,
    account: null,
    lastSyncAttemptAt: null,
    lastSuccessfulSyncAt: null,
    lastDataReceivedAt: null,
    lastVerifiedAt: null,
    lastError: null,
    importedRecords: 0,
    scopes: [],
    capabilities: [],
    connectEnabled: true,
    badge: 'not_connected',
    noteTone: null,
    authMode: 'oauth',
    runtimeVerificationPending: false,
    ...overrides,
  };
}

describe('Integrations workspace evidence taxonomy', () => {
  it('groups providers in the operational order needed to assemble a rich case record', () => {
    render(
      <IntegrationsWorkspace
        initialView="browse"
        items={[
          catalogueItem(),
          catalogueItem({ id: 'gorgias', name: 'Gorgias', category: 'helpdesk' }),
          catalogueItem({ id: 'shipbob', name: 'ShipBob', category: 'warehouse_3pl' }),
          catalogueItem({ id: 'ups', name: 'UPS', category: 'carrier' }),
          catalogueItem({ id: 'stripe', name: 'Stripe', category: 'payments_disputes', stage: 'planned', connectEnabled: false }),
          catalogueItem({ id: 'csv_import', name: 'CSV / manual import' }),
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Evidence coverage sequence' })).toBeInTheDocument();
    expect(screen.getByText(/richest case record/i)).toBeInTheDocument();
    expect(screen.getByText(/Coverage still depends on provider permissions/i)).toBeInTheDocument();

    const orderedHeadings = [
      'Orders and customer account',
      'Request and conversation',
      'Pick, pack and warehouse',
      'Tracking and carrier proof',
      'Payments and disputes',
    ].map((name) => screen.getByRole('heading', { name }));

    orderedHeadings.slice(0, -1).forEach((heading, index) => {
      expect(heading.compareDocumentPosition(orderedHeadings[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    const financialSection = screen.getByRole('heading', { name: 'Payments and disputes' }).closest('section');
    expect(financialSection).not.toBeNull();
    expect(within(financialSection!).getByText('Stripe')).toBeInTheDocument();
    expect(within(financialSection!).getByText('Planned for this layer')).toBeInTheDocument();

    const supplementalSection = screen.getByRole('heading', { name: 'Supplemental records' }).closest('section');
    expect(supplementalSection).not.toBeNull();
    expect(within(supplementalSection!).getByText('CSV / manual import')).toBeInTheDocument();
  });

  it('defaults to actionable source issues and keeps the complete matrix behind progressive disclosure', () => {
    render(
      <IntegrationsWorkspace
        initialView="connected"
        items={[
          catalogueItem({
            status: 'connected',
            connectionId: 'connection-shopify',
            connectionCount: 1,
            badge: 'stale',
            importedRecords: 155,
            lastDataReceivedAt: '2026-07-19T22:18:00.000Z',
            freshness: {
              confidence: 'measured',
              deliveryModel: 'webhook',
              lastDataReceivedAt: '2026-07-19T22:18:00.000Z',
              lastSyncAttemptAt: '2026-07-18T22:49:00.000Z',
            },
            capabilities: [{ id: 'orders.read', level: 'read', support: 'supported', scopes: [], description: 'Read orders', availability: 'enabled', availabilityReason: 'Available for this connection.' }],
          }),
          catalogueItem({
            id: 'gorgias',
            name: 'Gorgias',
            category: 'helpdesk',
            status: 'connected',
            connectionId: 'connection-gorgias',
            connectionCount: 1,
            badge: 'connected',
            importedRecords: 42,
            capabilities: [{ id: 'tickets.read', level: 'read', support: 'supported', scopes: [], description: 'Read support tickets', availability: 'enabled', availabilityReason: 'Available for this connection.' }],
          }),
        ]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Needs attention · 1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/The latest provider data is outside its expected freshness window/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review connection/i })).toHaveAttribute('href', '/sources/shopify');
    expect(screen.queryByRole('region', { name: 'Complete source coverage' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All coverage' }));
    expect(screen.getByRole('region', { name: 'Complete source coverage' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stale Freshness expired/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('Not supported').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Not supported Not provided/i })).not.toBeInTheDocument();

    const supportCell = screen.getByRole('button', { name: /Available on demand 1 capability enabled/i });
    fireEvent.click(supportCell);
    const inspector = screen.getByRole('region', { name: 'Selected source trust detail' });
    expect(within(inspector).getByText('Gorgias · Support requests')).toBeInTheDocument();
    expect(within(inspector).getByText(/Not measurable for this delivery model/i)).toBeInTheDocument();
    expect(within(inspector).getByText(/42 provider records indexed/i)).toBeInTheDocument();
    expect(within(inspector).getByRole('link', { name: /View source/i })).toHaveAttribute('href', '/sources/gorgias');
    expect(within(inspector).queryByText(/repair/i)).not.toBeInTheDocument();
  });

  it('names verification separately instead of calling fully enabled capabilities partial', () => {
    render(
      <IntegrationsWorkspace
        initialView="connected"
        items={[
          catalogueItem({
            id: 'fedex',
            name: 'FedEx',
            category: 'carrier',
            status: 'connected',
            connectionId: 'connection-fedex',
            connectionCount: 1,
            badge: 'verification_unavailable',
            capabilities: [
              { id: 'tracking.read', level: 'read', support: 'supported', scopes: [], description: 'Read tracking', availability: 'enabled', availabilityReason: 'Enabled.' },
              { id: 'delivery.read', level: 'read', support: 'supported', scopes: [], description: 'Read delivery events', availability: 'enabled', availabilityReason: 'Enabled.' },
              { id: 'shipment.read', level: 'read', support: 'supported', scopes: [], description: 'Read shipments', availability: 'enabled', availabilityReason: 'Enabled.' },
            ],
          }),
        ]}
      />,
    );

    expect(screen.getAllByText('Verification unavailable').length).toBeGreaterThan(0);
    expect(screen.getByText(/capabilities are enabled, but runtime verification is unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review verification/i })).toHaveAttribute('href', '/sources/fedex');
    expect(screen.queryByText(/Partial/i)).not.toBeInTheDocument();
  });
});
