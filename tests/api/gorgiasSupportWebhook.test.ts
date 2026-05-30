import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { TABLES } from '@/lib/supabase/tables';
import {
  GORGIAS_ACCOUNT_ID_HEADER,
  GORGIAS_DOMAIN_HEADER,
  extractGorgiasAccountIdentity,
} from '@/lib/support/gorgias/accountIdentity';
import {
  GORGIAS_SUPPORT_SECRET_HEADERS,
  verifyGlobalGorgiasSupportWebhookSecret,
  verifyGorgiasWebhookAuth,
} from '@/lib/support/gorgias/webhookAuth';
import {
  generateGorgiasWebhookSecret,
  hashGorgiasWebhookSecret,
  isGorgiasWebhookSecretSufficientLength,
  verifyGorgiasWebhookSecret,
} from '@/lib/support/gorgias/webhookSecret';
import { upsertGorgiasSupportConnection } from '@/lib/support/gorgias/connectionStore';
import { matchGorgiasSupportConnection } from '@/lib/support/gorgias/resolveConnection';
import * as resolveMerchantModule from '@/lib/support/gorgias/resolveMerchantId';
import {
  GORGIAS_MERCHANT_ID_HEADER,
  isGorgiasProductionIngestMode,
  resolveGorgiasDevMerchantFallback,
} from '@/lib/support/gorgias/resolveMerchantId';
import {
  extractGorgiasTicketPayload,
  inferGorgiasEventType,
  ingestGorgiasSupportWebhook,
} from '@/lib/support/gorgias/ingestWebhook';
import { POST } from '@/app/api/gorgias/support-webhook/route';
import type { GorgiasSupportConnectionRow } from '@/lib/support/gorgias/resolveConnection';
import {
  resolveSupportLinkingTable,
  supportCaseIntakeTableWithLinking,
  supportLinkingLookupTables,
} from '@/tests/lib/supportIngestLinkingMock';

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}));
jest.mock('@/lib/support/gorgias/fetchTicket', () => ({
  fetchGorgiasTicketById: jest.fn(),
}));
jest.mock('@/lib/support/gorgias/merchantApiAccess', () => ({
  getActiveGorgiasMerchantApiAccess: jest.fn(),
}));

const MERCHANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_MERCHANT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CONNECTION_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const CONNECTION_ID_2 = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const SUPPORT_CASE_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const GLOBAL_WEBHOOK_SECRET =
  process.env.GORGIAS_SUPPORT_WEBHOOK_SECRET ??
  'test-gorgias-support-webhook-secret-32chars-min';
const CONNECTION_WEBHOOK_SECRET =
  'gorgias_whsec_abcdefghijklmnopqrstuvwxyz0123456789AB';
const CONNECTION_SECRET_HASH = hashGorgiasWebhookSecret(CONNECTION_WEBHOOK_SECRET);
const GORGIAS_ACCOUNT_ID = 'acme-gorgias-account';
const GORGIAS_DOMAIN = 'acme.gorgias.com';

const { createServiceClient } = jest.requireMock('@/lib/supabase/server') as {
  createServiceClient: jest.Mock;
};
const { fetchGorgiasTicketById } = jest.requireMock('@/lib/support/gorgias/fetchTicket') as {
  fetchGorgiasTicketById: jest.Mock;
};
const { getActiveGorgiasMerchantApiAccess } = jest.requireMock(
  '@/lib/support/gorgias/merchantApiAccess'
) as {
  getActiveGorgiasMerchantApiAccess: jest.Mock;
};

const gorgiasTicket = {
  id: 'g-500',
  subject: 'Refund for Shopify order #1007',
  status: 'open',
  tags: ['refund'],
  customer: { email: 'shopper@example.com' },
  messages: [{ body: 'Please refund Shopify order #1007', from_agent: false }],
  created_datetime: '2026-05-28T09:00:00.000Z',
  updated_datetime: '2026-05-28T09:30:00.000Z',
};

const activeConnection: GorgiasSupportConnectionRow = {
  id: CONNECTION_ID,
  merchant_id: MERCHANT_ID,
  provider_account_id: GORGIAS_ACCOUNT_ID,
  provider_base_url: `https://${GORGIAS_DOMAIN}`,
  status: 'active',
  webhook_secret_hash: CONNECTION_SECRET_HASH,
};

function makeGorgiasWebhookSupabase(options?: {
  connections?: GorgiasSupportConnectionRow[];
  shopifyConnections?: Array<{ merchant_id: string; shop_domain: string | null; active: boolean }>;
  failCaseUpsert?: boolean;
}) {
  let caseUpserts = 0;
  let eventInserts = 0;
  const lastCasePayloads: Record<string, unknown>[] = [];
  const connectionUpdates: Array<{ id: string; values: Record<string, unknown> }> = [];
  const connections = options?.connections ?? [activeConnection];
  const shopifyConnections = options?.shopifyConnections ?? [
    {
      merchant_id: MERCHANT_ID,
      shop_domain: 'unauth-test.myshopify.com',
      active: true,
    },
  ];
  const linkingTables = supportLinkingLookupTables();

  const supabase = {
    from: (table: string) => {
      if (table === TABLES.MERCHANT_SHOPIFY_CONNECTIONS) {
        return {
          select: () => ({
            eq: (column: string, value: string | boolean) => ({
              eq: (column2: string, value2: string | boolean) => ({
                order: () => ({
                  limit: async () => ({
                    data: shopifyConnections.filter(
                      (row) =>
                        row[column as 'merchant_id' | 'active'] === value &&
                        row[column2 as 'merchant_id' | 'active'] === value2
                    ),
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === TABLES.SUPPORT_PROVIDER_CONNECTIONS) {
        return {
          select: () => ({
            eq: (column: string, value: string) => {
              if (column === 'id') {
                return {
                  maybeSingle: async () => {
                    const row = connections.find((connection) => connection.id === value);
                    return { data: row ?? null, error: null };
                  },
                };
              }
              if (column === 'provider' && value === 'gorgias') {
                return {
                  eq: (_column2: string, status: string) =>
                    Promise.resolve({
                      data: connections.filter((row) => row.status === status),
                      error: null,
                    }),
                };
              }
              throw new Error(`unexpected connection filter: ${column}=${value}`);
            },
          }),
          update: (values: Record<string, unknown>) => ({
            eq: (_column: string, id: string) => {
              connectionUpdates.push({ id, values });
              return Promise.resolve({ error: null });
            },
          }),
        };
      }

      if (table === TABLES.SUPPORT_CASE_INTAKE) {
        if (options?.failCaseUpsert) {
          return {
            upsert: () => ({
              select: () => ({
                single: async () => ({ data: null, error: { message: 'upsert_failed' } }),
              }),
            }),
          };
        }
        return supportCaseIntakeTableWithLinking({
          supportCaseId: SUPPORT_CASE_ID,
          merchantId: MERCHANT_ID,
          getLastCasePayload: () => lastCasePayloads[lastCasePayloads.length - 1],
          onUpsert: (payload) => {
            caseUpserts += 1;
            lastCasePayloads.push(payload);
          },
        });
      }

      const linkingTable = resolveSupportLinkingTable(table, linkingTables);
      if (linkingTable) return linkingTable;

      if (table === TABLES.SUPPORT_CASE_EVENTS) {
        return {
          insert: (payload: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                eventInserts += 1;
                return {
                  data: {
                    id: `11111111-1111-1111-1111-${String(eventInserts).padStart(12, '0')}`,
                    ...payload,
                  },
                  error: null,
                };
              },
            }),
          }),
        };
      }

      throw new Error(`unexpected table: ${table}`);
    },
  };

  return {
    supabase,
    caseUpserts: () => caseUpserts,
    eventInserts: () => eventInserts,
    lastCasePayload: () => lastCasePayloads[lastCasePayloads.length - 1],
    connectionUpdates: () => connectionUpdates,
  };
}

function makeWebhookRequest(
  body: unknown,
  options?: {
    secret?: string;
    merchantId?: string;
    accountId?: string;
    domain?: string;
    eventType?: string;
  }
) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (options?.secret !== undefined) {
    headers[GORGIAS_SUPPORT_SECRET_HEADERS[0]] = options.secret;
  }
  if (options?.merchantId) {
    headers[GORGIAS_MERCHANT_ID_HEADER] = options.merchantId;
  }
  if (options?.accountId) {
    headers[GORGIAS_ACCOUNT_ID_HEADER] = options.accountId;
  }
  if (options?.domain) {
    headers[GORGIAS_DOMAIN_HEADER] = options.domain;
  }
  if (options?.eventType) {
    headers['x-gorgias-event-type'] = options.eventType;
  }

  return new NextRequest('http://localhost/api/gorgias/support-webhook', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  } as RequestInit);
}

describe('Gorgias connection resolution', () => {
  it('matches by account id', () => {
    const identity = extractGorgiasAccountIdentity(
      new Headers({ [GORGIAS_ACCOUNT_ID_HEADER]: GORGIAS_ACCOUNT_ID }),
      {},
      gorgiasTicket
    );
    expect(identity?.provider_account_id).toBe(GORGIAS_ACCOUNT_ID);

    const resolution = matchGorgiasSupportConnection([activeConnection], identity!);
    expect(resolution).toMatchObject({
      connection: { id: CONNECTION_ID, merchant_id: MERCHANT_ID },
      match: 'account_id',
    });
  });

  it('matches by domain header', () => {
    const identity = extractGorgiasAccountIdentity(
      new Headers({ [GORGIAS_DOMAIN_HEADER]: GORGIAS_DOMAIN }),
      {},
      gorgiasTicket
    );
    const resolution = matchGorgiasSupportConnection(
      [
        {
          ...activeConnection,
          provider_account_id: GORGIAS_DOMAIN,
          provider_base_url: `https://${GORGIAS_DOMAIN}`,
        },
      ],
      identity!
    );
    expect(resolution).toMatchObject({ match: 'domain' });
  });

  it('returns ambiguous for multiple account matches', () => {
    const identity = extractGorgiasAccountIdentity(
      new Headers({ [GORGIAS_ACCOUNT_ID_HEADER]: GORGIAS_ACCOUNT_ID }),
      {},
      gorgiasTicket
    );
    const resolution = matchGorgiasSupportConnection(
      [
        activeConnection,
        { ...activeConnection, id: CONNECTION_ID_2, merchant_id: OTHER_MERCHANT_ID },
      ],
      identity!
    );
    expect(resolution).toEqual({ error: 'ambiguous' });
  });
});

describe('Gorgias support webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  function disableDevMerchantFallback() {
    return jest
      .spyOn(resolveMerchantModule, 'resolveGorgiasDevMerchantFallback')
      .mockReturnValue({ error: 'disabled_in_production' });
  }

  it('rejects missing secret', async () => {
    const mock = makeGorgiasWebhookSupabase();
    createServiceClient.mockReturnValue(mock.supabase);
    const res = await POST(makeWebhookRequest(gorgiasTicket));
    expect(res.status).toBe(401);
  });

  it('rejects invalid secret', async () => {
    disableDevMerchantFallback();
    const mock = makeGorgiasWebhookSupabase();
    createServiceClient.mockReturnValue(mock.supabase);
    const res = await POST(
      makeWebhookRequest(gorgiasTicket, {
        secret: 'wrong-secret-value-32chars-minimum!!',
        accountId: GORGIAS_ACCOUNT_ID,
      })
    );
    expect(res.status).toBe(401);
    const updates = mock.connectionUpdates();
    expect(updates[0]?.values.last_error).toBe('unauthorized');
  });

  it('disables merchant header fallback in production mode', () => {
    expect(
      resolveGorgiasDevMerchantFallback({
        headerMerchantId: MERCHANT_ID,
        nodeEnv: 'production',
        vercelEnv: 'production',
      })
    ).toEqual({ error: 'disabled_in_production' });
    expect(isGorgiasProductionIngestMode({ nodeEnv: 'production', vercelEnv: 'production' })).toBe(
      true
    );
  });

  it('returns 404 when no active connection matches', async () => {
    disableDevMerchantFallback();
    const mock = makeGorgiasWebhookSupabase({ connections: [] });
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      makeWebhookRequest(gorgiasTicket, {
        secret: CONNECTION_WEBHOOK_SECRET,
        accountId: 'unknown-account',
      })
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('gorgias_connection_not_found');
  });

  it('returns 409 when connection match is ambiguous', async () => {
    disableDevMerchantFallback();
    const mock = makeGorgiasWebhookSupabase({
      connections: [
        activeConnection,
        { ...activeConnection, id: CONNECTION_ID_2, merchant_id: OTHER_MERCHANT_ID },
      ],
    });
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      makeWebhookRequest(gorgiasTicket, {
        secret: CONNECTION_WEBHOOK_SECRET,
        accountId: GORGIAS_ACCOUNT_ID,
      })
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('gorgias_connection_ambiguous');
  });

  it('ignores disabled connections', async () => {
    disableDevMerchantFallback();
    const mock = makeGorgiasWebhookSupabase({
      connections: [{ ...activeConnection, status: 'disabled' }],
    });
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      makeWebhookRequest(gorgiasTicket, {
        secret: CONNECTION_WEBHOOK_SECRET,
        accountId: GORGIAS_ACCOUNT_ID,
      })
    );
    expect(res.status).toBe(404);
  });

  it('resolves merchant by x-gorgias-account-id and ingests', async () => {
    const mock = makeGorgiasWebhookSupabase();
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      makeWebhookRequest(gorgiasTicket, {
        secret: CONNECTION_WEBHOOK_SECRET,
        accountId: GORGIAS_ACCOUNT_ID,
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.webhook_secret).toBeUndefined();
    expect(json.order_ref).toBe('1007');
    expect(json.claim_reason).toBe('refund_request');
    expect(json.link_status).toBe('not_found');
    expect(mock.lastCasePayload().provider_connection_id).toBe(CONNECTION_ID);
    expect(JSON.stringify(json)).not.toContain('shopper@example.com');
  });

  it('resolves merchant by x-gorgias-domain', async () => {
    const mock = makeGorgiasWebhookSupabase({
      connections: [
        {
          id: CONNECTION_ID,
          merchant_id: MERCHANT_ID,
          provider_account_id: GORGIAS_DOMAIN,
          provider_base_url: `https://${GORGIAS_DOMAIN}`,
          status: 'active',
          webhook_secret_hash: CONNECTION_SECRET_HASH,
        },
      ],
    });
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      makeWebhookRequest(gorgiasTicket, {
        secret: CONNECTION_WEBHOOK_SECRET,
        domain: GORGIAS_DOMAIN,
      })
    );
    expect(res.status).toBe(200);
  });

  it('resolves merchant by payload account id', async () => {
    const mock = makeGorgiasWebhookSupabase();
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      makeWebhookRequest(
        { account_id: GORGIAS_ACCOUNT_ID, ticket: gorgiasTicket },
        { secret: CONNECTION_WEBHOOK_SECRET }
      )
    );
    expect(res.status).toBe(200);
  });

  it('hydrates skeletal Gorgias webhook form payloads before ingesting', async () => {
    disableDevMerchantFallback();
    const mock = makeGorgiasWebhookSupabase({
      connections: [
        {
          id: CONNECTION_ID,
          merchant_id: MERCHANT_ID,
          provider_account_id: GORGIAS_DOMAIN,
          provider_base_url: `https://${GORGIAS_DOMAIN}`,
          status: 'active',
          webhook_secret_hash: CONNECTION_SECRET_HASH,
        },
      ],
    });
    createServiceClient.mockReturnValue(mock.supabase);
    getActiveGorgiasMerchantApiAccess.mockResolvedValue({
      providerBaseUrl: `https://${GORGIAS_DOMAIN}`,
      credentials: { email: 'agent@example.com', api_key: 'gorgias-api-key' },
    });
    fetchGorgiasTicketById.mockResolvedValue(gorgiasTicket);

    const res = await POST(
      new NextRequest(
        `http://localhost/api/gorgias/support-webhook?gorgias_domain=${encodeURIComponent(GORGIAS_DOMAIN)}&unauth_whsec=${encodeURIComponent(CONNECTION_WEBHOOK_SECRET)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ticket: { id: 'g-500', uri: '/api/tickets/g-500/' } }),
        }
      )
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(fetchGorgiasTicketById).toHaveBeenCalledWith({
      providerBaseUrl: `https://${GORGIAS_DOMAIN}`,
      credentials: { email: 'agent@example.com', api_key: 'gorgias-api-key' },
      ticketId: 'g-500',
    });
    expect(json.order_ref).toBe('1007');
    expect(json.claim_reason).toBe('refund_request');
    expect(json.is_claim).toBe(true);
    expect(json.claim_type).toBe('other');
    expect(mock.lastCasePayload().customer_email_hash).toBeTruthy();
    expect(mock.lastCasePayload().shop_domain).toBe('unauth-test.myshopify.com');
  });

  it('resolves merchant by gorgias_domain query param on webhook URL', async () => {
    disableDevMerchantFallback();
    const mock = makeGorgiasWebhookSupabase({
      connections: [
        {
          id: CONNECTION_ID,
          merchant_id: MERCHANT_ID,
          provider_account_id: GORGIAS_DOMAIN,
          provider_base_url: `https://${GORGIAS_DOMAIN}`,
          status: 'active',
          webhook_secret_hash: CONNECTION_SECRET_HASH,
        },
      ],
    });
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      new NextRequest(
        `http://localhost/api/gorgias/support-webhook?gorgias_domain=${encodeURIComponent(GORGIAS_DOMAIN)}`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [GORGIAS_SUPPORT_SECRET_HEADERS[0]]: CONNECTION_WEBHOOK_SECRET,
          },
          body: JSON.stringify(gorgiasTicket),
        }
      )
    );
    expect(res.status).toBe(200);
  });

  it('resolves merchant by ticket uri host', async () => {
    const mock = makeGorgiasWebhookSupabase({
      connections: [
        {
          id: CONNECTION_ID,
          merchant_id: MERCHANT_ID,
          provider_account_id: GORGIAS_DOMAIN,
          provider_base_url: `https://${GORGIAS_DOMAIN}`,
          status: 'active',
          webhook_secret_hash: CONNECTION_SECRET_HASH,
        },
      ],
    });
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      makeWebhookRequest(
        {
          ...gorgiasTicket,
          uri: `https://${GORGIAS_DOMAIN}/app/ticket/500`,
        },
        { secret: CONNECTION_WEBHOOK_SECRET }
      )
    );
    expect(res.status).toBe(200);
  });

  it('updates last_sync_at on success', async () => {
    const mock = makeGorgiasWebhookSupabase();
    createServiceClient.mockReturnValue(mock.supabase);

    await POST(
      makeWebhookRequest(gorgiasTicket, {
        secret: CONNECTION_WEBHOOK_SECRET,
        accountId: GORGIAS_ACCOUNT_ID,
      })
    );

    const updates = mock.connectionUpdates();
    expect(updates).toHaveLength(1);
    expect(updates[0].id).toBe(CONNECTION_ID);
    expect(updates[0].values.last_sync_at).toBeTruthy();
    expect(updates[0].values.last_error).toBeNull();
  });

  it('updates last_error on ingest failure when connection resolved', async () => {
    const mock = makeGorgiasWebhookSupabase({ failCaseUpsert: true });
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      makeWebhookRequest(gorgiasTicket, {
        secret: CONNECTION_WEBHOOK_SECRET,
        accountId: GORGIAS_ACCOUNT_ID,
      })
    );
    expect(res.status).toBeGreaterThanOrEqual(400);

    const updates = mock.connectionUpdates();
    expect(updates).toHaveLength(1);
    expect(updates[0].values.last_error).toBeTruthy();
  });

  it('allows dev merchant header fallback when no connection matches', async () => {
    const mock = makeGorgiasWebhookSupabase({ connections: [] });
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      makeWebhookRequest(gorgiasTicket, {
        secret: GLOBAL_WEBHOOK_SECRET,
        merchantId: MERCHANT_ID,
      })
    );
    expect(res.status).toBe(200);
    expect(mock.lastCasePayload().provider_connection_id).toBeNull();
  });

  it('prefers connection routing over dev merchant header when both provided', async () => {
    const mock = makeGorgiasWebhookSupabase();
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      makeWebhookRequest(gorgiasTicket, {
        secret: CONNECTION_WEBHOOK_SECRET,
        accountId: GORGIAS_ACCOUNT_ID,
        merchantId: OTHER_MERCHANT_ID,
      })
    );
    expect(res.status).toBe(200);
    expect(mock.lastCasePayload().merchant_id).toBe(MERCHANT_ID);
  });

  it('keeps one case row and appends two events for duplicate ticket', async () => {
    const mock = makeGorgiasWebhookSupabase();
    createServiceClient.mockReturnValue(mock.supabase);

    const first = await POST(
      makeWebhookRequest(gorgiasTicket, {
        secret: CONNECTION_WEBHOOK_SECRET,
        accountId: GORGIAS_ACCOUNT_ID,
        eventType: 'ticket_created',
      })
    );
    const second = await POST(
      makeWebhookRequest(gorgiasTicket, {
        secret: CONNECTION_WEBHOOK_SECRET,
        accountId: GORGIAS_ACCOUNT_ID,
        eventType: 'ticket_updated',
      })
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(mock.caseUpserts()).toBe(2);
    expect(mock.eventInserts()).toBe(4);
  });

  it('accepts x-gorgias-webhook-secret header via direct handler', async () => {
    const mock = makeGorgiasWebhookSupabase();
    createServiceClient.mockReturnValue(mock.supabase);

    expect(verifyGlobalGorgiasSupportWebhookSecret(GLOBAL_WEBHOOK_SECRET)).toBe(true);

    const headers = new Headers({
      'content-type': 'application/json',
      [GORGIAS_SUPPORT_SECRET_HEADERS[1]]: CONNECTION_WEBHOOK_SECRET,
      [GORGIAS_ACCOUNT_ID_HEADER]: GORGIAS_ACCOUNT_ID,
    });

    const result = await ingestGorgiasSupportWebhook({
      headers,
      body: gorgiasTicket,
    });

    expect(result.provider).toBe('gorgias');
  });

  it('route does not expose service role', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/gorgias/support-webhook/route.ts'),
      'utf-8'
    );
    expect(content).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(content).toContain('ingestGorgiasSupportWebhook');
  });

  it('infers ticket_updated when timestamps differ', () => {
    expect(
      inferGorgiasEventType({
        created_datetime: '2026-05-28T09:00:00.000Z',
        updated_datetime: '2026-05-28T09:30:00.000Z',
      })
    ).toBe('ticket_updated');
  });

  it('extracts wrapped ticket payloads', () => {
    const ticket = extractGorgiasTicketPayload({ ticket: gorgiasTicket });
    expect(ticket.id).toBe('g-500');
  });

  it('accepts connection-specific webhook secret', async () => {
    const mock = makeGorgiasWebhookSupabase();
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      makeWebhookRequest(gorgiasTicket, {
        secret: CONNECTION_WEBHOOK_SECRET,
        accountId: GORGIAS_ACCOUNT_ID,
      })
    );
    expect(res.status).toBe(200);
    expect(verifyGorgiasWebhookSecret(CONNECTION_WEBHOOK_SECRET, CONNECTION_SECRET_HASH)).toBe(
      true
    );
  });

  it('rejects global env secret when connection has stored hash', async () => {
    const mock = makeGorgiasWebhookSupabase();
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      makeWebhookRequest(gorgiasTicket, {
        secret: GLOBAL_WEBHOOK_SECRET,
        accountId: GORGIAS_ACCOUNT_ID,
      })
    );
    expect(res.status).toBe(401);
  });

  it('rejects connection without stored hash in production mode', async () => {
    jest.spyOn(resolveMerchantModule, 'isGorgiasProductionIngestMode').mockReturnValue(true);
    const mock = makeGorgiasWebhookSupabase({
      connections: [{ ...activeConnection, webhook_secret_hash: null }],
    });
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      makeWebhookRequest(gorgiasTicket, {
        secret: GLOBAL_WEBHOOK_SECRET,
        accountId: GORGIAS_ACCOUNT_ID,
      })
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('gorgias_connection_secret_missing');
  });

  it('allows global env fallback in dev when connection has no stored hash', async () => {
    const mock = makeGorgiasWebhookSupabase({
      connections: [{ ...activeConnection, webhook_secret_hash: null }],
    });
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      makeWebhookRequest(gorgiasTicket, {
        secret: GLOBAL_WEBHOOK_SECRET,
        accountId: GORGIAS_ACCOUNT_ID,
      })
    );
    expect(res.status).toBe(200);
  });

  it('does not use global secret in production even when GORGIAS_SUPPORT_ALLOW_GLOBAL_SECRET is unset', () => {
    jest.spyOn(resolveMerchantModule, 'isGorgiasProductionIngestMode').mockReturnValue(true);
    expect(
      verifyGorgiasWebhookAuth({
        headerSecret: GLOBAL_WEBHOOK_SECRET,
        connection: activeConnection,
        hasResolvedConnection: true,
      })
    ).toEqual({ ok: false, status: 401, code: 'unauthorized' });
  });
});

describe('Gorgias webhook secret helpers', () => {
  it('generates secrets with sufficient entropy', () => {
    const secret = generateGorgiasWebhookSecret();
    expect(isGorgiasWebhookSecretSufficientLength(secret)).toBe(true);
    expect(secret.startsWith('gorgias_whsec_')).toBe(true);
  });

  it('hashes secrets deterministically without storing plaintext', () => {
    const secret = generateGorgiasWebhookSecret();
    const hash = hashGorgiasWebhookSecret(secret);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(secret);
    expect(verifyGorgiasWebhookSecret(secret, hash)).toBe(true);
    expect(verifyGorgiasWebhookSecret('wrong', hash)).toBe(false);
  });

  it('upsertGorgiasSupportConnection passes only hash to store layer', async () => {
    const plaintext = generateGorgiasWebhookSecret();
    const expectedHash = hashGorgiasWebhookSecret(plaintext);
    let capturedPayload: Record<string, unknown> | null = null;

    const mockSupabase = {
      from: () => ({
        upsert: (payload: Record<string, unknown>) => {
          capturedPayload = payload;
          return {
            select: () => ({
              single: async () => ({
                data: {
                  id: CONNECTION_ID,
                  merchant_id: MERCHANT_ID,
                  provider: 'gorgias',
                  provider_account_id: GORGIAS_ACCOUNT_ID,
                  provider_base_url: `https://${GORGIAS_DOMAIN}`,
                  status: 'active',
                  token_expires_at: null,
                  scopes: [],
                  last_sync_at: null,
                  last_error: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          };
        },
      }),
    };

    await upsertGorgiasSupportConnection(mockSupabase, {
      merchant_id: MERCHANT_ID,
      provider_account_id: GORGIAS_ACCOUNT_ID,
      webhookSecretPlaintext: plaintext,
    });

    expect(capturedPayload?.webhook_secret_hash).toBe(expectedHash);
    expect(capturedPayload?.webhook_secret_plaintext).toBeUndefined();
    expect(JSON.stringify(capturedPayload)).not.toContain(plaintext);
  });
});
