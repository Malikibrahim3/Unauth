/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { SourcesOperations } from '@/components/sources/SourcesOperations';
import type { CatalogueRowItem } from '@/lib/integrations/catalogueView';

function row(overrides: Partial<CatalogueRowItem> = {}): CatalogueRowItem {
  return {
    id: 'shopify',
    name: 'Shopify',
    description: 'Orders, refunds, and Shopify Payments disputes.',
    category: 'commerce',
    authMode: 'oauth',
    stage: 'beta',
    runtimeVerificationPending: true,
    pendingRuntimeCapabilities: [],
    status: 'connected',
    syncState: 'import_complete',
    freshness: { confidence: 'measured', deliveryModel: 'webhook', lastDataReceivedAt: '2026-08-16T10:00:00Z', lastSyncAttemptAt: null },
    connectionId: 'connection-1',
    connectionCount: 1,
    account: 'fixture-shop.myshopify.com',
    lastSyncAttemptAt: null,
    lastSuccessfulSyncAt: '2026-08-16T10:00:00Z',
    lastDataReceivedAt: '2026-08-16T10:00:00Z',
    lastVerifiedAt: null,
    lastError: null,
    importedRecords: 42,
    importedRecordsKnown: true,
    scopes: [],
    capabilities: [],
    evidenceCapabilities: [
      { id: 'order_value', support: 'supported', availability: 'enabled', availabilityReason: 'Available.' },
      { id: 'dispute_status', support: 'supported', availability: 'enabled', availabilityReason: 'Available.' },
    ],
    connectEnabled: true,
    badge: 'healthy',
    noteTone: null,
    ...overrides,
  };
}

describe('Sources catalogue surface', () => {
  it('shows the five-layer readiness stack and every canonical catalogue item, including planned slots', () => {
    render(
      <SourcesOperations
        view="browse"
        items={[
          row(),
          row({ id: 'gorgias', name: 'Gorgias', category: 'helpdesk', connectionId: null, connectionCount: 0, status: 'not_connected', badge: 'disconnected', evidenceCapabilities: [{ id: 'ticket_messages', support: 'supported', availability: 'not_connected' }] }),
          row({ id: 'stripe', name: 'Stripe', category: 'payments_disputes', stage: 'planned', connectionId: null, connectionCount: 0, status: 'not_connected', badge: 'disconnected', connectEnabled: false, evidenceCapabilities: [{ id: 'dispute_status', support: 'unsupported', availability: 'unsupported' }] }),
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Minimum evidence stack' })).toBeInTheDocument();
    expect(screen.getByText('2 of 5')).toBeInTheDocument();
    expect(screen.getAllByText('Connected provider')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Find a source to connect' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Working' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ready to connect' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Not available yet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inspect Shopify source' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inspect Stripe source' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Not available yet \d+$/ })).toBeInTheDocument();
  });

  it('filters by planned state and exposes truthful unknown record values in the inspector', () => {
    render(
      <SourcesOperations
        view="connected"
        items={[
          row({ importedRecords: 0, importedRecordsKnown: false }),
          row({ id: 'adyen', name: 'Adyen', category: 'payments_disputes', stage: 'planned', status: 'not_connected', badge: 'disconnected', connectionId: null, connectionCount: 0, connectEnabled: false, evidenceCapabilities: [{ id: 'dispute_status', support: 'unsupported', availability: 'unsupported' }] }),
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Not available yet \d+$/ }));
    expect(screen.getByRole('button', { name: 'Inspect Adyen source' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Inspect Shopify source' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Inspect Adyen source' }));
    expect(screen.getByText(/no merchant connection, sync history, freshness, or record count/i)).toBeInTheDocument();
    expect(screen.queryByText(/0 records/i)).not.toBeInTheDocument();
  });

  it('supports provider search and a no-results recovery state', () => {
    render(<SourcesOperations view="browse" items={[row()]} />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search providers' }), { target: { value: 'does-not-exist' } });
    expect(screen.getByRole('heading', { name: 'No sources match these filters' })).toBeInTheDocument();
    const emptyState = screen.getByText('No sources match these filters').closest('[data-state-id="source-catalogue-no-results"]');
    expect(emptyState).not.toBeNull();
    fireEvent.click(within(emptyState!).getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('button', { name: 'Inspect Shopify source' })).toBeInTheDocument();
  });

  it('supports the ready and no-connectable scenarios without inventing actions', () => {
    render(
      <SourcesOperations
        view="browse"
        items={[
          row({ evidenceCapabilities: [{ id: 'order_value', support: 'supported', availability: 'enabled' }, { id: 'dispute_status', support: 'supported', availability: 'enabled' }] }),
          row({ id: 'gorgias', name: 'Gorgias', category: 'helpdesk', evidenceCapabilities: [{ id: 'ticket_messages', support: 'supported', availability: 'enabled' }] }),
          row({ id: 'shipbob', name: 'ShipBob', category: 'warehouse_3pl', evidenceCapabilities: [{ id: 'warehouse_pick_pack', support: 'supported', availability: 'enabled' }] }),
          row({ id: 'ups', name: 'UPS', category: 'carrier', evidenceCapabilities: [{ id: 'tracking_events', support: 'supported', availability: 'enabled' }] }),
          row({ id: 'stripe', name: 'Stripe', category: 'payments_disputes', evidenceCapabilities: [{ id: 'dispute_status', support: 'supported', availability: 'enabled' }] }),
        ]}
      />,
    );

    expect(screen.getByText('5 of 5')).toBeInTheDocument();
  });

  it('states when a required layer has no connectable provider and omits an action', () => {
    const unavailable = row({ connectEnabled: false, connectionId: null, connectionCount: 0, status: 'not_connected', badge: 'disconnected' });
    render(<SourcesOperations view="browse" items={[unavailable]} />);

    const commerce = screen.getAllByRole('heading', { name: 'Commerce and orders' })[0].closest('article');
    expect(within(commerce!).getByText('No connectable provider is currently available for this layer.')).toBeInTheDocument();
    expect(within(commerce!).queryByRole('link')).not.toBeInTheDocument();
  });
});
