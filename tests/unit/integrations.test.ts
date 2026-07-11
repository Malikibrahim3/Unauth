import fs from 'node:fs';
import path from 'node:path';
import { INTEGRATION_PROVIDERS } from '@/lib/integrations/registry';
import { getTracking, verifyAfterShipApiKey } from '@/lib/integrations/providers/aftership';
import { buildEvidence } from '@/lib/claim-gate/buildEvidence';
import { exchangeFedExClientCredentials } from '@/lib/integrations/providers/fedex';
import { exchangeUpsClientCredentials } from '@/lib/integrations/providers/ups';
import {
  mapAfterShipTrackingToEvidence,
  mapCarrierProofToEvidence,
} from '@/lib/integrations/evidenceMapper';
import { assembleEvidencePack } from '@/lib/payouts/assembleEvidencePack';

class MockQuery {
  private filters: Array<{ column: string; value: unknown; op: 'eq' | 'neq' | 'not_null' | 'in' | 'gte' | 'ilike' }> = [];
  private limitCount: number | null = null;
  private orFilter: string | null = null;

  constructor(private table: string, private tables: Record<string, any[]>) {}

  select() { return this; }
  eq(column: string, value: unknown) { this.filters.push({ column, value, op: 'eq' }); return this; }
  ilike(column: string, value: unknown) { this.filters.push({ column, value, op: 'ilike' }); return this; }
  neq(column: string, value: unknown) { this.filters.push({ column, value, op: 'neq' }); return this; }
  not(column: string) { this.filters.push({ column, value: null, op: 'not_null' }); return this; }
  in(column: string, value: unknown[]) { this.filters.push({ column, value, op: 'in' }); return this; }
  gte(column: string, value: unknown) { this.filters.push({ column, value, op: 'gte' }); return this; }
  order() { return this; }
  limit(count: number) { this.limitCount = count; return this; }
  or(filter: string) { this.orFilter = filter; return this; }

  async upsert(payload: any) {
    const rows = Array.isArray(payload) ? payload : [payload];
    this.tables[this.table] = this.tables[this.table] ?? [];
    for (const row of rows) {
      const idx = this.tables[this.table].findIndex((existing) => existing.id && existing.id === row.id);
      if (idx >= 0) this.tables[this.table][idx] = { ...this.tables[this.table][idx], ...row };
      else this.tables[this.table].push(row);
    }
    return { data: rows, error: null };
  }

  async maybeSingle() {
    const rows = this.rows();
    return { data: rows[0] ?? null, error: null };
  }

  then<TResult1 = { data: any[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: any[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({ data: this.rows(), error: null }).then(onfulfilled ?? undefined, onrejected ?? undefined);
  }

  private rows() {
    let rows = [...(this.tables[this.table] ?? [])];
    for (const filter of this.filters) {
      if (filter.op === 'eq') rows = rows.filter((row) => row[filter.column] === filter.value);
      if (filter.op === 'neq') rows = rows.filter((row) => row[filter.column] !== filter.value);
      if (filter.op === 'not_null') rows = rows.filter((row) => row[filter.column] != null);
      if (filter.op === 'in') rows = rows.filter((row) => (filter.value as unknown[]).includes(row[filter.column]));
      if (filter.op === 'gte') rows = rows.filter((row) => String(row[filter.column] ?? '') >= String(filter.value ?? ''));
      if (filter.op === 'ilike') rows = rows.filter((row) => String(row[filter.column] ?? '').toLowerCase() === String(filter.value ?? '').toLowerCase());
    }
    if (this.orFilter) {
      const clauses = this.orFilter.split(',').map((clause) => clause.split('.'));
      rows = rows.filter((row) => clauses.some(([column, op, value]) => op === 'eq' && String(row[column]) === value));
    }
    if (this.limitCount != null) rows = rows.slice(0, this.limitCount);
    return rows;
  }
}

function mockClient(tables: Record<string, any[]>) {
  return {
    from(table: string) {
      return new MockQuery(table, tables);
    },
  } as any;
}

describe('integration registry', () => {
  it('marks built providers live and future providers slot-only', () => {
    const byId = Object.fromEntries(INTEGRATION_PROVIDERS.map((provider) => [provider.id, provider]));
    expect(byId.shopify.buildStatus).toBe('live');
    expect(byId.gorgias.buildStatus).toBe('live');
    expect(byId.aftership.buildStatus).toBe('live');
    expect(byId.ups.buildStatus).toBe('live');
    expect(byId.fedex.buildStatus).toBe('live');
    expect(byId.document_upload.buildStatus).toBe('live');
    expect(byId.self_fulfillment_pack.buildStatus).toBe('live');
    expect(byId.shipbob.buildStatus).toBe('live');
    expect(byId.stripe.buildStatus).toBe('slot_only');
    expect(byId.gmail).toBeUndefined();
    expect(byId.amazon_marketplace).toBeUndefined();
    expect(byId.slack).toBeUndefined();
    // Dead integration stubs (no real wiring) were removed: loop, returngo,
    // narvar, shiphero, extensiv, shipmonk, paypal, adyen.
    expect(byId.loop).toBeUndefined();
    expect(byId.returngo).toBeUndefined();
    expect(byId.narvar).toBeUndefined();
    expect(byId.shiphero).toBeUndefined();
    expect(byId.extensiv).toBeUndefined();
    expect(byId.shipmonk).toBeUndefined();
    expect(byId.paypal).toBeUndefined();
    expect(byId.adyen).toBeUndefined();
    expect(byId.carrier_claims.buildStatus).toBe('slot_only');
    expect(byId.carrier_claims.evidenceCapabilities).toEqual(expect.arrayContaining([
      'carrier_claim_submission_status',
      'carrier_claim_outcome',
      'recovery_amount_approved',
      'recovery_amount_paid',
    ]));
    expect(byId.shipbob.evidenceCapabilities).toEqual(
      expect.arrayContaining(['warehouse_pick_pack', 'warehouse_exception', 'three_pl_sla_claim_status']),
    );
    expect(new Set(INTEGRATION_PROVIDERS.map((provider) => provider.id))).toEqual(new Set([
      'shopify',
      'gorgias',
      'aftership',
      'ups',
      'fedex',
      'document_upload',
      'self_fulfillment_pack',
      'shipbob',
      'stripe',
      'carrier_claims',
    ]));
  });

  it('does not expose a location coordinate capability', () => {
    const allCapabilities = INTEGRATION_PROVIDERS.flatMap((provider) => provider.evidenceCapabilities);
    expect(allCapabilities.join(' ')).not.toMatch(new RegExp(['g', 'ps'].join(''), 'i'));
    expect(allCapabilities.join(' ')).not.toMatch(new RegExp(['lati', 'tude', '|longi', 'tude'].join(''), 'i'));
  });
});

describe('live connector auth and normalization', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('verifies AfterShip API keys and maps tracking events', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;
    await expect(verifyAfterShipApiKey('as_test_123456')).resolves.toBeUndefined();

    const items = mapAfterShipTrackingToEvidence({
      id: 'trk_1',
      tracking_number: '1Z999',
      slug: 'ups',
      tag: 'Delivered',
      checkpoints: [{ tag: 'InfoReceived' }, { tag: 'Delivered' }],
    }, { merchantId: 'm1' });

    expect(items.map((item) => item.evidenceType)).toEqual([
      'tracking_number',
      'delivery_status',
      'tracking_events',
      'delivery_photo',
      'signature',
    ]);
    expect(items.find((item) => item.evidenceType === 'tracking_events')?.value).toBe(2);
  });

  it('fetches AfterShip tracking through the v4 endpoint and normalizes POD', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          tracking: {
            tracking_number: '1ZA2207X0444990706',
            slug: 'ups',
            tag: 'Delivered',
            shipment_delivery_date: '2026-06-18T10:00:00.000Z',
            last_checkpoint: {
              message: 'Delivered',
              location: 'London',
              checkpoint_time: '2026-06-18T10:00:00.000Z',
            },
            checkpoints: [{ tag: 'Delivered', message: 'Delivered', checkpoint_time: '2026-06-18T10:00:00.000Z' }],
            proof_of_delivery: { url: 'https://example.test/pod.jpg', type: 'photo' },
          },
        },
      }),
      headers: new Headers(),
    }) as any;

    const tracking = await getTracking('1ZA2207X0444990706', 'UPS', 'as_test');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tracking/2026-01/trackings?'),
      expect.any(Object),
    );
    expect(tracking).toMatchObject({
      tracking_number: '1ZA2207X0444990706',
      slug: 'ups',
      current_status: 'Delivered',
      proof_of_delivery: { url: 'https://example.test/pod.jpg', type: 'photo' },
      tracking_source: 'aftership',
    });
  });

  it('exchanges UPS and FedEx OAuth credentials', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'token_123', expires_in: 3600 }),
    }) as any;
    await expect(exchangeUpsClientCredentials({ clientId: 'id', clientSecret: 'secret' }))
      .resolves.toMatchObject({ accessToken: 'token_123' });
    await expect(exchangeFedExClientCredentials({ clientId: 'id', clientSecret: 'secret' }))
      .resolves.toMatchObject({ accessToken: 'token_123' });
  });

  it('normalizes unavailable carrier proof without erroring', () => {
    const items = mapCarrierProofToEvidence('ups', { trackResponse: {} }, {
      merchantId: 'm1',
      trackingNumber: '1Z999',
    });
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.evidenceType).sort()).toEqual(['delivery_photo', 'signature']);
    expect(items.every((item) => item.value === null)).toBe(true);
    expect(items.map((item) => item.summary).join(' ').toLowerCase()).toContain('not available');
  });
});

describe('evidence assembly', () => {
  it('enriches claim-gate evidence with AfterShip and ShipBob evidence rows', async () => {
    const originalAfterShip = process.env.AFTERSHIP_API_KEY;
    const originalShipBobPat = process.env.SHIPBOB_PAT;
    const originalShipBobSandbox = process.env.SHIPBOB_SANDBOX;
    const originalFetch = global.fetch;
    process.env.AFTERSHIP_API_KEY = 'as_test';
    process.env.SHIPBOB_PAT = 'sb_test';
    process.env.SHIPBOB_SANDBOX = 'true';
    global.fetch = jest.fn(async (url: string) => {
      if (url.includes('api.aftership.com')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              tracking: {
                tracking_number: '1ZA2207X0444990706',
                slug: 'ups',
                tag: 'Delivered',
                shipment_delivery_date: '2026-06-18T10:00:00.000Z',
                last_checkpoint: { message: 'Delivered at door', checkpoint_time: '2026-06-18T10:00:00.000Z' },
                checkpoints: [{ tag: 'Delivered', message: 'Delivered at door', checkpoint_time: '2026-06-18T10:00:00.000Z' }],
                proof_of_delivery: { url: 'https://example.test/pod.jpg', type: 'signature' },
              },
            },
          }),
          headers: new Headers(),
        } as any;
      }
      if (url.includes('/order?')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            orders: [{
              id: 'shipbob-order-1',
              reference_id: '1001',
              status: 'Fulfilled',
              shipments: [{ id: 'shipment-1', status: 'Delivered', tracking_number: '1ZA2207X0444990706', carrier: 'UPS', products: [] }],
              products: [{ reference_id: 'SKU-1', name: 'Tee', quantity: 1 }],
            }],
          }),
          headers: new Headers(),
        } as any;
      }
      if (url.includes('/timeline')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ events: [{ description: 'Picked and packed', event_date: '2026-06-17T10:00:00.000Z' }] }),
          headers: new Headers(),
        } as any;
      }
      if (url.includes('/return?')) {
        return { ok: true, status: 200, json: async () => ({ returns: [] }), headers: new Headers() } as any;
      }
      throw new Error(`unexpected fetch ${url}`);
    }) as any;

    const tables = {
      source_orders: [{
        id: 'order-1',
        merchant_id: 'm1',
        external_id: 'gid://shopify/Order/1001',
        order_number: '1001',
        email: 'customer@example.com',
        currency: 'GBP',
        total_price: 118,
        fulfillment_state: 'fulfilled',
        placed_at: '2026-06-16T00:00:00.000Z',
      }],
      source_tickets: [],
      source_fulfillments: [{
        id: 'fulfillment-1',
        merchant_id: 'm1',
        source_order_id: 'order-1',
        status: 'success',
        shipment_status: 'delivered',
        tracking_company: 'UPS',
        tracking_number: '1ZA2207X0444990706',
        occurred_at: '2026-06-18T10:00:00.000Z',
      }],
      support_payout_cases: [],
      source_refunds: [],
      claim_outcomes: [],
      integration_evidence_items: [],
    };

    try {
      const evidence = await buildEvidence({
        client: mockClient(tables),
        merchantId: 'm1',
        customerEmail: 'customer@example.com',
        externalOrderId: '#1001',
        externalTicketId: null,
        platform: 'gorgias',
        claimText: 'Tracking says delivered but I never received it',
        claimType: 'DELIVERED_NOT_RECEIVED',
      });

      expect(evidence.summary.proof_of_delivery).toBe('PRESENT');
      expect(evidence.fulfillmentEvidence[0]).toMatchObject({
        tracking_number: '1ZA2207X0444990706',
        delivery_scan_present: true,
        pod_present: true,
        evidence_strength: 'strong',
      });
      expect(evidence.shipbobEvidence).toMatchObject({
        order_found: true,
        shipment_count: 1,
        pick_pack_events: 1,
      });
      expect(evidence.connections).toMatchObject({ carrier_tracking: true, warehouse: true });
      // Phase 7.1: integration evidence is written to the canonical evidence_items
      // store (provider → source_system, value → structured_value.value).
      expect(tables.evidence_items.map((row) => row.source_system).sort()).toEqual(['aftership', 'shipbob']);
      expect(tables.evidence_items.find((row) => row.source_system === 'aftership')?.structured_value.value)
        .toMatchObject({ tracking_source: 'aftership', evidence_strength: 'strong' });

      global.fetch = jest.fn().mockRejectedValue(new Error('provider unavailable')) as any;
      const unavailableEvidence = await buildEvidence({
        client: mockClient(tables),
        merchantId: 'm1',
        customerEmail: 'customer@example.com',
        externalOrderId: '#1001',
        externalTicketId: null,
        platform: 'gorgias',
        claimText: 'Tracking says delivered but I never received it',
        claimType: 'DELIVERED_NOT_RECEIVED',
      });
      expect(unavailableEvidence.connections).toMatchObject({ carrier_tracking: false, warehouse: false });
    } finally {
      process.env.AFTERSHIP_API_KEY = originalAfterShip;
      process.env.SHIPBOB_PAT = originalShipBobPat;
      process.env.SHIPBOB_SANDBOX = originalShipBobSandbox;
      global.fetch = originalFetch;
    }
  });

  it('keeps slot-only providers out of case evidence and reports attempted unavailable proof', async () => {
    const pack = await assembleEvidencePack({
      client: mockClient({
        merchant_integrations: [
          { provider_id: 'ups', status: 'connected', last_sync_at: null, last_error: null },
        ],
        store_connections: [],
        helpdesk_connections: [],
        source_tickets: [],
        source_orders: [],
        source_refunds: [],
        source_fulfillments: [],
        category_applicability: [],
        // Phase 7.1 canonical evidence_items shape (source_system, claim_id,
        // structured_value.value, source_metadata.source_category).
        evidence_items: [
          {
            id: 'e1',
            merchant_id: 'm1',
            claim_id: 'c1',
            source_system: 'ups',
            source_metadata: { source_category: 'carrier', confidence_label: 'medium' },
            evidence_type: 'delivery_photo',
            title: 'UPS delivery photo',
            summary: 'Delivery photo attempted, not available for this shipment',
            confidence: 0.6,
            structured_value: { value: null },
            source_record_id: '1Z999',
            created_at: '2026-06-20T00:00:00.000Z',
          },
          {
            id: 'slot-evidence',
            merchant_id: 'm1',
            claim_id: 'c1',
            source_system: 'loop',
            source_metadata: { source_category: 'returns', confidence_label: 'low' },
            evidence_type: 'contract_terms',
            title: 'Should not surface',
            summary: 'Slot-only row should be ignored',
            confidence: 0.3,
            structured_value: { value: null },
            created_at: '2026-06-20T00:00:00.000Z',
          },
        ],
        extracted_partner_terms: [],
      }),
      merchantId: 'm1',
      supportPayoutCaseId: 'c1',
      trackingNumber: '1Z999',
    });

    expect(pack.items.map((item) => item.sourceProvider)).toContain('ups');
    expect(pack.items.map((item) => item.sourceProvider)).not.toContain('loop');
    expect(pack.missingEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerId: 'ups',
          capability: 'delivery_photo',
          reason: 'attempted_unavailable',
          attempted: true,
        }),
      ]),
    );
  });

  it('includes order + fulfillment evidence from the case graph even when no store provider is connected', async () => {
    const pack = await assembleEvidencePack({
      client: mockClient({
        // No store/helpdesk provider connected — inclusion must be driven by
        // canonical source-graph data, not hasConnected('shopify'|'gorgias').
        merchant_integrations: [],
        store_connections: [],
        helpdesk_connections: [],
        source_tickets: [],
        source_orders: [{
          id: 'order-1',
          merchant_id: 'm1',
          external_id: '1001',
          order_number: '1001',
          total_price: 118,
          currency: 'GBP',
          line_items_count: 2,
          placed_at: '2026-06-16T00:00:00.000Z',
          created_at: '2026-06-16T00:00:00.000Z',
        }],
        source_refunds: [],
        source_fulfillments: [{
          id: 'fulfillment-1',
          merchant_id: 'm1',
          source_order_id: 'order-1',
          status: 'success',
          shipment_status: 'delivered',
          tracking_company: 'UPS',
          tracking_number: '1Z999',
          occurred_at: '2026-06-18T10:00:00.000Z',
        }],
        category_applicability: [],
        integration_evidence_items: [],
        extracted_partner_terms: [],
      }),
      merchantId: 'm1',
      supportPayoutCaseId: 'c1',
      orderId: 'order-1',
    });

    const evidenceTypes = pack.items.map((item) => item.evidenceType);
    expect(evidenceTypes).toContain('order_value');
    expect(evidenceTypes.some((type) => type === 'tracking_number' || type === 'delivery_status')).toBe(true);
  });
});

describe('integration security migration', () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), 'supabase/migrations/20260620120000_integration_layer_connectors.sql'),
    'utf8',
  );

  it('keeps credentials out of the public integration GET route', () => {
    const route = fs.readFileSync(path.join(process.cwd(), 'app/api/integrations/route.ts'), 'utf8');
    expect(route).not.toContain('encrypted_payload');
    expect(route).not.toContain('decryptIntegrationCredentials');
  });

  it('enables RLS on every new integration table', () => {
    for (const table of [
      'merchant_integrations',
      'integration_credentials',
      'integration_evidence_items',
      'integration_documents',
      'extracted_partner_terms',
      'category_applicability',
      'pack_confirmations',
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
    expect(migration).toContain('carrier_claim_submission_status');
    expect(migration).toContain('recovery_amount_paid');
    expect(migration).toContain('integration_credentials_no_client_select');
    expect(migration).toContain('using (false)');
  });
});
