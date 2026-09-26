/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
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
  it('shows the supplied catalogue hierarchy and every canonical catalogue item, including planned slots', () => {
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

    expect(screen.getByText('One layer decides most answers')).toBeInTheDocument();
    expect(screen.getByText('connected')).toBeInTheDocument();
    expect(screen.getByText('you could connect today')).toBeInTheDocument();
    expect(screen.getByText('planned, no date')).toBeInTheDocument();
    expect(screen.getByText('ORDERS AND MONEY')).toBeInTheDocument();
    expect(screen.getByText('SUPPORT AND EVIDENCE')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Shopify CONNECTED/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Stripe PLANNED/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Gorgias AVAILABLE/i })).toBeInTheDocument();
  });

  it('filters connected source rows by evidence layer and status without inventing an inspector', () => {
    render(
      <SourcesOperations
        view="connected"
        items={[
          row({ importedRecords: 0, importedRecordsKnown: false }),
          row({ id: 'adyen', name: 'Adyen', category: 'payments_disputes', stage: 'planned', status: 'not_connected', badge: 'disconnected', connectionId: null, connectionCount: 0, connectEnabled: false, evidenceCapabilities: [{ id: 'dispute_status', support: 'unsupported', availability: 'unsupported' }] }),
        ]}
      />,
    );

    expect(screen.getByText('unknown')).toBeInTheDocument();
    const statusFilter = screen.getByRole('combobox', { name: 'Filter connected sources by status' });
    fireEvent.change(statusFilter, { target: { value: 'planned' } });
    expect(screen.queryByRole('option', { name: /planned/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Adyen .*PLANNED$/i })).not.toBeInTheDocument();
  });

  it('supports a no-results catalogue recovery state', () => {
    render(<SourcesOperations view="browse" items={[row()]} initialQuery="does-not-exist" />);
    expect(screen.getByText('No providers match this catalogue view')).toBeInTheDocument();
    const emptyState = screen.getByText('No providers match this catalogue view').closest('[data-state-id="source-catalogue-no-results"]');
    expect(emptyState).not.toBeNull();
    expect(screen.getByRole('link', { name: 'View all providers' })).toHaveAttribute('href', '/sources/browse');
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

    for (const label of ['Orders And Money', 'Support And Evidence', 'Carriers', 'Warehouse And Fulfilment', 'Returns']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('states when a provider has no credentials without inventing a connect action', () => {
    const unavailable = row({ connectEnabled: false, connectionId: null, connectionCount: 0, status: 'not_connected', badge: 'disconnected' });
    render(<SourcesOperations view="browse" items={[unavailable]} />);

    expect(screen.getByRole('link', { name: /Shopify NO CREDENTIALS/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /connect/i })).not.toBeInTheDocument();
  });
});
