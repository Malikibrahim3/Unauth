import fs from 'node:fs';
import path from 'node:path';
import { INTEGRATION_PROVIDERS } from '@/lib/integrations/registry';
import { verifyAfterShipApiKey } from '@/lib/integrations/providers/aftership';
import { exchangeFedExClientCredentials } from '@/lib/integrations/providers/fedex';
import { exchangeUpsClientCredentials } from '@/lib/integrations/providers/ups';
import {
  mapAfterShipTrackingToEvidence,
  mapCarrierProofToEvidence,
} from '@/lib/integrations/evidenceMapper';
import { assembleEvidencePack } from '@/lib/payouts/assembleEvidencePack';

class MockQuery {
  private filters: Array<{ column: string; value: unknown; op: 'eq' | 'neq' | 'not_null' }> = [];
  private limitCount: number | null = null;
  private orFilter: string | null = null;

  constructor(private table: string, private tables: Record<string, any[]>) {}

  select() { return this; }
  eq(column: string, value: unknown) { this.filters.push({ column, value, op: 'eq' }); return this; }
  neq(column: string, value: unknown) { this.filters.push({ column, value, op: 'neq' }); return this; }
  not(column: string) { this.filters.push({ column, value: null, op: 'not_null' }); return this; }
  in(column: string, value: unknown[]) { this.filters.push({ column, value, op: 'in' } as any); return this; }
  order() { return this; }
  limit(count: number) { this.limitCount = count; return this; }
  or(filter: string) { this.orFilter = filter; return this; }

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
      if ((filter as any).op === 'in') rows = rows.filter((row) => ((filter as any).value as unknown[]).includes(row[filter.column]));
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
    expect(byId.shipbob.buildStatus).toBe('slot_only');
    expect(byId.loop.buildStatus).toBe('slot_only');
    expect(byId.stripe.buildStatus).toBe('slot_only');
    expect(byId.gmail).toBeUndefined();
    expect(byId.amazon_marketplace).toBeUndefined();
    expect(byId.slack).toBeUndefined();
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
    expect(byId.loop.evidenceCapabilities).toEqual(expect.arrayContaining(['return_request_status', 'return_inspection_outcome']));
    expect(new Set(INTEGRATION_PROVIDERS.map((provider) => provider.id))).toEqual(new Set([
      'shopify',
      'gorgias',
      'aftership',
      'ups',
      'fedex',
      'document_upload',
      'self_fulfillment_pack',
      'shipbob',
      'shiphero',
      'extensiv',
      'shipmonk',
      'loop',
      'returngo',
      'narvar',
      'stripe',
      'paypal',
      'adyen',
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
        integration_evidence_items: [
          {
            id: 'e1',
            merchant_id: 'm1',
            support_payout_case_id: 'c1',
            source_provider: 'ups',
            source_category: 'carrier',
            evidence_type: 'delivery_photo',
            title: 'UPS delivery photo',
            summary: 'Delivery photo attempted, not available for this shipment',
            confidence: 'medium',
            value: null,
            raw_reference: '1Z999',
            created_at: '2026-06-20T00:00:00.000Z',
          },
          {
            id: 'slot-evidence',
            merchant_id: 'm1',
            support_payout_case_id: 'c1',
            source_provider: 'shipbob',
            source_category: 'warehouse_3pl',
            evidence_type: 'contract_terms',
            title: 'Should not surface',
            summary: 'Slot-only row should be ignored',
            confidence: 'low',
            value: null,
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
    expect(pack.items.map((item) => item.sourceProvider)).not.toContain('shipbob');
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
