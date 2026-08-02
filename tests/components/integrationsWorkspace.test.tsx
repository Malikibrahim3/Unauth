/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import { IntegrationsWorkspace } from '@/components/integrations/IntegrationsWorkspace';
import type { CatalogueRowItem } from '@/components/integrations/ConnectorRow';

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
});
