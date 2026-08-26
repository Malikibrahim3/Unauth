/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ConnectorRow } from '@/components/integrations/ConnectorRow';
import { categoryLabel, type CatalogueRowItem } from '@/lib/integrations/catalogueView';

function gorgiasRow(overrides: Partial<CatalogueRowItem> = {}): CatalogueRowItem {
  return {
    id: 'gorgias',
    name: 'Gorgias',
    description: 'Support tickets, messages, and the compressed decision widget.',
    category: 'helpdesk',
    stage: 'live',
    status: 'connected',
    syncState: 'import_complete',
    freshness: { confidence: 'measured', deliveryModel: 'webhook', lastDataReceivedAt: '2026-07-16T15:00:00Z', lastSyncAttemptAt: null },
    connectionId: 'conn-1',
    connectionCount: 1,
    account: 'Fixture gorgias',
    lastSyncAttemptAt: null,
    // The real bug this regresses: Gorgias never has a real merchant_integrations
    // sync-completion column written by any production code path, so this raw
    // column is always null even when the connector is genuinely healthy.
    lastSuccessfulSyncAt: null,
    lastDataReceivedAt: '2026-07-16T15:00:00Z',
    lastVerifiedAt: '2026-07-16T15:00:00Z',
    lastError: null,
    importedRecords: 42,
    scopes: [],
    capabilities: [],
    connectEnabled: true,
    badge: 'healthy',
    noteTone: null,
    ...overrides,
  };
}

describe('Integrations list row — Gorgias timestamp/badge coherence', () => {
  it('labels every shipped integration category without invoking the fallback', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect([
      'commerce', 'helpdesk', 'tracking', 'carrier', 'warehouse_3pl',
      'returns', 'payments_disputes', 'documents',
    ].map(categoryLabel)).toEqual([
      'Commerce', 'Helpdesk', 'Tracking', 'Carrier', 'Warehouse / 3PL',
      'Returns', 'Payments / disputes', 'Documents',
    ]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('a genuinely healthy Gorgias row (real activity, no raw sync-completion column) never shows "No successful sync" or "No activity yet"', () => {
    render(<ConnectorRow item={gorgiasRow()} />);
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    // Must show the real activity timestamp, not a contradictory empty state.
    expect(screen.queryByText(/No successful sync/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No activity yet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Initial import pending/i)).not.toBeInTheDocument();
  });

  it('a Gorgias row with genuinely no activity ever reports "No activity yet", not a fabricated sync claim', () => {
    render(<ConnectorRow item={gorgiasRow({ badge: 'no_data', lastDataReceivedAt: null, syncState: 'no_records_found' })} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });

  it('a Gorgias row still awaiting its first sync reports "Initial import pending", not "No activity yet"', () => {
    render(<ConnectorRow item={gorgiasRow({ badge: 'sync_pending', lastDataReceivedAt: null, syncState: 'import_queued' })} />);
    expect(screen.getByText('Sync pending')).toBeInTheDocument();
    expect(screen.getByText('Initial import pending')).toBeInTheDocument();
  });
});
