/**
 * APPLICATION-LEVEL tenant-scoping tests — not a test of Postgres RLS.
 *
 * These prove that loadConnectorCatalogue's own `.eq('merchant_id', ...)`
 * filtering (application code) never lets one merchant's connection state,
 * sync activity, verification timestamp, or freshness signal leak into
 * another merchant's catalogue, by calling the REAL loader against an
 * in-memory fake Supabase client (tests/helpers/fakeSupabaseClient.ts).
 *
 * They do NOT verify:
 *   - live Supabase Row Level Security policy enforcement;
 *   - database policy execution against a real Postgres instance;
 *   - composite ownership constraints (FKs, unique indexes) at the DB layer;
 *   - service-role bypass behaviour.
 * In production, every code path this feature uses (loadConnectorCatalogue,
 * liveVerification.ts, the two verify API routes) is called with
 * `createServiceClient()`, which bypasses RLS entirely — correctness in
 * production rests on `requirePermission()` resolving `ctx.merchantId` and
 * this same manual filtering, which is exactly what these tests exercise.
 * RLS on merchant_integrations/store_connections/helpdesk_connections (see
 * the final report's RLS audit) is a defense-in-depth backstop for a
 * hypothetical future client-side-Supabase code path, not the mechanism this
 * feature relies on — and this repo has no local Supabase/Postgres harness
 * (no supabase/config.toml, no docker-compose) to test that backstop itself.
 */
jest.mock('@/lib/connectors/registry', () => ({
  listConnectors: () => [
    {
      manifest: {
        id: 'shopify',
        name: 'Shopify',
        description: 'Commerce',
        category: 'commerce',
        verificationStatus: 'verified',
        launchVisible: true,
        capabilities: [],
      },
    },
    {
      manifest: {
        id: 'gorgias',
        name: 'Gorgias',
        description: 'Helpdesk',
        category: 'helpdesk',
        verificationStatus: 'verified',
        launchVisible: true,
        capabilities: [],
      },
    },
  ],
}));

import { loadConnectorCatalogue } from '@/lib/connectors/catalogue';
import { createFakeSupabaseClient } from '../helpers/fakeSupabaseClient';
import { TABLES } from '@/lib/supabase/tables';

function merchantIntegrationRow(merchantId: string, providerId: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: `${merchantId}-${providerId}`,
    merchant_id: merchantId,
    provider_id: providerId,
    status: 'connected',
    provider_account_name: null,
    last_sync_started_at: null,
    last_sync_completed_at: null,
    last_successful_sync_at: null,
    last_verified_at: null,
    webhook_last_received_at: null,
    last_error_message: null,
    last_error: null,
    last_error_code: null,
    imported_record_count: 5,
    granted_scopes: [],
    writeback_enabled: false,
    updated_at: '2026-07-15T00:00:00Z',
    ...overrides,
  };
}

function helpdeskConnectionRow(merchantId: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    merchant_id: merchantId,
    provider: 'gorgias',
    last_sync_at: null,
    updated_at: '2026-07-15T00:00:00Z',
    ...overrides,
  };
}

describe('loadConnectorCatalogue application-level tenant scoping (not RLS)', () => {
  it("merchant A's Shopify freshness never reflects merchant B's webhook activity", async () => {
    const client = createFakeSupabaseClient({
      [TABLES.MERCHANT_INTEGRATIONS]: [
        merchantIntegrationRow('merchant-a', 'shopify', { webhook_last_received_at: null }),
        merchantIntegrationRow('merchant-b', 'shopify', { webhook_last_received_at: '2026-07-16T00:00:00Z' }),
      ],
    });

    const catalogueA = await loadConnectorCatalogue(client as never, 'merchant-a');
    const catalogueB = await loadConnectorCatalogue(client as never, 'merchant-b');

    const shopifyA = catalogueA.find((item) => item.id === 'shopify')!;
    const shopifyB = catalogueB.find((item) => item.id === 'shopify')!;
    expect(shopifyA.lastDataReceivedAt).toBeNull();
    expect(shopifyB.lastDataReceivedAt).toBe('2026-07-16T00:00:00Z');
    expect(shopifyA.connectionId).toBe('merchant-a-shopify');
    expect(shopifyB.connectionId).toBe('merchant-b-shopify');
  });

  it("merchant A's Gorgias freshness (helpdesk_connections join) never reflects merchant B's ticket activity", async () => {
    const client = createFakeSupabaseClient({
      [TABLES.MERCHANT_INTEGRATIONS]: [
        merchantIntegrationRow('merchant-a', 'gorgias'),
        merchantIntegrationRow('merchant-b', 'gorgias'),
      ],
      [TABLES.SUPPORT_PROVIDER_CONNECTIONS]: [
        helpdeskConnectionRow('merchant-a', { last_sync_at: null }),
        helpdeskConnectionRow('merchant-b', { last_sync_at: '2026-07-16T05:00:00Z' }),
      ],
    });

    const catalogueA = await loadConnectorCatalogue(client as never, 'merchant-a');
    const catalogueB = await loadConnectorCatalogue(client as never, 'merchant-b');

    const gorgiasA = catalogueA.find((item) => item.id === 'gorgias')!;
    const gorgiasB = catalogueB.find((item) => item.id === 'gorgias')!;
    expect(gorgiasA.lastDataReceivedAt).toBeNull();
    expect(gorgiasA.syncState).toBe('import_queued');
    expect(gorgiasB.lastDataReceivedAt).toBe('2026-07-16T05:00:00Z');
  });

  it("merchant A's imported record counts and timestamps never leak into merchant B's catalogue", async () => {
    const client = createFakeSupabaseClient({
      [TABLES.MERCHANT_INTEGRATIONS]: [
        merchantIntegrationRow('merchant-a', 'shopify', { imported_record_count: 500, last_successful_sync_at: '2026-01-01T00:00:00Z' }),
        merchantIntegrationRow('merchant-b', 'shopify', { imported_record_count: 3, last_successful_sync_at: '2026-07-15T00:00:00Z' }),
      ],
    });

    const catalogueA = await loadConnectorCatalogue(client as never, 'merchant-a');
    const catalogueB = await loadConnectorCatalogue(client as never, 'merchant-b');

    expect(catalogueA.find((item) => item.id === 'shopify')!.importedRecords).toBe(500);
    expect(catalogueB.find((item) => item.id === 'shopify')!.importedRecords).toBe(3);
  });

  it('reads "last health check" from the table persistLiveVerification actually writes to per provider', async () => {
    // Regression test for a bug caught during browser verification: Shopify
    // and Gorgias persist their verification timestamp to store_connections
    // / helpdesk_connections (lib/connections/liveVerification.ts), not
    // merchant_integrations — reading the wrong table made "Last health
    // check" show "Not yet checked" forever even though a probe just ran.
    const client = createFakeSupabaseClient({
      [TABLES.MERCHANT_INTEGRATIONS]: [
        merchantIntegrationRow('merchant-a', 'shopify', { last_verified_at: null }), // never written for shopify
        merchantIntegrationRow('merchant-b', 'gorgias', { last_verified_at: null }),
      ],
      [TABLES.MERCHANT_SHOPIFY_CONNECTIONS]: [
        { merchant_id: 'merchant-a', platform: 'shopify', last_verified_at: '2026-07-16T15:06:00Z', installed_at: '2026-01-01T00:00:00Z' },
      ],
      [TABLES.SUPPORT_PROVIDER_CONNECTIONS]: [
        helpdeskConnectionRow('merchant-b', { last_verified_at: '2026-07-16T05:00:00Z' }),
      ],
    });

    const catalogueA = await loadConnectorCatalogue(client as never, 'merchant-a');
    const catalogueB = await loadConnectorCatalogue(client as never, 'merchant-b');

    expect(catalogueA.find((item) => item.id === 'shopify')!.lastVerifiedAt).toBe('2026-07-16T15:06:00Z');
    expect(catalogueB.find((item) => item.id === 'gorgias')!.lastVerifiedAt).toBe('2026-07-16T05:00:00Z');
  });

  it('a merchant\'s "last health check" never reflects another merchant\'s store_connections/helpdesk_connections row', async () => {
    const client = createFakeSupabaseClient({
      [TABLES.MERCHANT_INTEGRATIONS]: [
        merchantIntegrationRow('merchant-a', 'shopify'),
        merchantIntegrationRow('merchant-b', 'shopify'),
      ],
      [TABLES.MERCHANT_SHOPIFY_CONNECTIONS]: [
        { merchant_id: 'merchant-b', platform: 'shopify', last_verified_at: '2026-07-16T15:06:00Z', installed_at: '2026-01-01T00:00:00Z' },
      ],
    });

    const catalogueA = await loadConnectorCatalogue(client as never, 'merchant-a');
    expect(catalogueA.find((item) => item.id === 'shopify')!.lastVerifiedAt).toBeNull();
  });

  it('a shopify store_connections row never leaks into a different provider\'s "last health check"', async () => {
    // Wrong-provider-row case: merchant-a has a verified Shopify row but no
    // Gorgias helpdesk_connections row at all — Gorgias's lastVerifiedAt
    // must stay null, not pick up Shopify's timestamp by table-join accident.
    const client = createFakeSupabaseClient({
      [TABLES.MERCHANT_INTEGRATIONS]: [
        merchantIntegrationRow('merchant-a', 'shopify'),
        merchantIntegrationRow('merchant-a', 'gorgias'),
      ],
      [TABLES.MERCHANT_SHOPIFY_CONNECTIONS]: [
        { merchant_id: 'merchant-a', platform: 'shopify', last_verified_at: '2026-07-16T15:06:00Z', installed_at: '2026-01-01T00:00:00Z' },
      ],
    });

    const catalogueA = await loadConnectorCatalogue(client as never, 'merchant-a');
    expect(catalogueA.find((item) => item.id === 'shopify')!.lastVerifiedAt).toBe('2026-07-16T15:06:00Z');
    expect(catalogueA.find((item) => item.id === 'gorgias')!.lastVerifiedAt).toBeNull();
  });

  it('"last health check" is null when verification has never run for this connection', async () => {
    const client = createFakeSupabaseClient({
      [TABLES.MERCHANT_INTEGRATIONS]: [
        merchantIntegrationRow('merchant-a', 'shopify', { last_verified_at: null }),
      ],
    });
    const catalogueA = await loadConnectorCatalogue(client as never, 'merchant-a');
    expect(catalogueA.find((item) => item.id === 'shopify')!.lastVerifiedAt).toBeNull();
  });

  it('a merchant with no rows at all gets an all not_connected catalogue, never inheriting another merchant\'s rows', async () => {
    const client = createFakeSupabaseClient({
      [TABLES.MERCHANT_INTEGRATIONS]: [
        merchantIntegrationRow('merchant-a', 'shopify'),
      ],
    });

    const catalogueC = await loadConnectorCatalogue(client as never, 'merchant-c');
    expect(catalogueC.every((item) => item.status === 'not_connected')).toBe(true);
  });
});
