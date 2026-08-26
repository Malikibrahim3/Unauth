import {
  evaluateSourceReadiness,
  sourceStatus,
  type ReadinessSource,
} from '@/lib/sources/evidenceReadiness';

function source(overrides: Partial<ReadinessSource> = {}): ReadinessSource {
  return {
    id: 'shopify',
    name: 'Shopify',
    category: 'commerce',
    stage: 'beta',
    status: 'not_connected',
    badge: 'disconnected',
    connectionId: null,
    connectionCount: 0,
    connectEnabled: true,
    evidenceCapabilities: [
      { id: 'order_value', support: 'supported', availability: 'not_connected' },
    ],
    ...overrides,
  };
}

describe('source evidence readiness', () => {
  it('counts enabled evidence capabilities across layers, but reports five layers separately', () => {
    const result = evaluateSourceReadiness([
      source({
        evidenceCapabilities: [
          { id: 'order_value', support: 'supported', availability: 'enabled' },
          { id: 'dispute_status', support: 'supported', availability: 'enabled' },
        ],
        status: 'connected',
        badge: 'healthy',
        connectionId: 'shopify-1',
        connectionCount: 1,
      }),
      source({ id: 'gorgias', name: 'Gorgias', category: 'helpdesk', evidenceCapabilities: [{ id: 'ticket_messages', support: 'supported', availability: 'not_connected' }] }),
      source({ id: 'shipbob', name: 'ShipBob', category: 'warehouse_3pl', evidenceCapabilities: [{ id: 'warehouse_pick_pack', support: 'supported', availability: 'not_connected' }] }),
      source({ id: 'ups', name: 'UPS', category: 'carrier', evidenceCapabilities: [{ id: 'tracking_events', support: 'supported', availability: 'not_connected' }] }),
    ]);

    expect(result.readyCount).toBe(2);
    expect(result.ready).toBe(false);
    expect(result.layers.find((layer) => layer.id === 'commerce')?.ready).toBe(true);
    expect(result.layers.find((layer) => layer.id === 'payments')?.ready).toBe(true);
    expect(result.layers.find((layer) => layer.id === 'support')?.state).toBe('missing');
    expect(result.firstMissingLayer?.id).toBe('support');
  });

  it('keeps configuration readiness separate from operational attention', () => {
    const result = evaluateSourceReadiness([
      source({
        status: 'connected',
        badge: 'stale',
        connectionId: 'shopify-1',
        connectionCount: 1,
        evidenceCapabilities: [{ id: 'order_value', support: 'supported', availability: 'enabled' }],
      }),
    ]);
    const commerce = result.layers.find((layer) => layer.id === 'commerce');

    expect(commerce?.ready).toBe(true);
    expect(commerce?.state).toBe('attention');
    expect(commerce?.needsAttention).toBe(true);
    expect(sourceStatus(source({
      status: 'connected',
      badge: 'healthy',
      connectionId: 'shopify-1',
      connectionCount: 1,
      readModel: { configuration: 'configured', operational: 'attention' },
      evidenceCapabilities: [{ id: 'order_value', support: 'supported', availability: 'enabled' }],
    }))).toBe('attention');
  });

  it('never lets planned providers satisfy a required layer', () => {
    const result = evaluateSourceReadiness([
      source({
        id: 'stripe',
        name: 'Stripe',
        category: 'payments_disputes',
        stage: 'planned',
        badge: 'disconnected',
        evidenceCapabilities: [{ id: 'dispute_status', support: 'supported', availability: 'enabled' }],
      }),
    ]);
    const payments = result.layers.find((layer) => layer.id === 'payments');

    expect(payments?.ready).toBe(false);
    expect(payments?.state).toBe('unavailable');
    expect(payments?.availableProviders).toHaveLength(0);
  });

  it('counts two connected providers in one layer once and preserves filter state semantics', () => {
    const sources = [
      source({ connectionId: 'shopify-1', connectionCount: 1, status: 'connected', badge: 'healthy', evidenceCapabilities: [{ id: 'order_value', support: 'supported', availability: 'enabled' }] }),
      source({ id: 'woocommerce', name: 'WooCommerce', connectionId: 'woo-1', connectionCount: 1, status: 'connected', badge: 'healthy', evidenceCapabilities: [{ id: 'line_items', support: 'supported', availability: 'enabled' }] }),
    ];
    const result = evaluateSourceReadiness(sources);

    expect(result.readyCount).toBe(1);
    expect(result.layers.find((layer) => layer.id === 'commerce')?.readyProviders).toHaveLength(2);
    expect(sourceStatus(sources[0])).toBe('connected');
  });
});
