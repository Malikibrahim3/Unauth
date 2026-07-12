import { NextRequest } from 'next/server';
import { TABLES } from '@/lib/supabase/tables';
import { hashZendeskWebhookSecret } from '@/lib/support/zendesk/webhookSecret';
import type { ZendeskSupportConnectionRow } from '@/lib/support/zendesk/resolveConnection';
import { POST } from '@/app/api/zendesk/support-webhook/route';
import {
  resolveSupportLinkingTable,
  supportCaseIntakeTableWithLinking,
  supportLinkingLookupTables,
} from '@/tests/lib/supportIngestLinkingMock';

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/support/zendesk/fetchTicket', () => ({
  fetchZendeskTicketWithComments: jest.fn(),
}));

jest.mock('@/lib/support/zendesk/merchantApiAccess', () => ({
  getActiveZendeskMerchantApiAccess: jest.fn(),
}));

const MERCHANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CONNECTION_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SUPPORT_CASE_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const ZENDESK_SUBDOMAIN = 'acme';
const CONNECTION_WEBHOOK_SECRET =
  'zendesk_whsec_abcdefghijklmnopqrstuvwxyz0123456789ABCD';
const CONNECTION_SECRET_HASH = hashZendeskWebhookSecret(CONNECTION_WEBHOOK_SECRET);

const { createServiceClient } = jest.requireMock('@/lib/supabase/server') as {
  createServiceClient: jest.Mock;
};

const claimTicket = {
  id: 42,
  subject: 'Refund for order #1007 - package never arrived',
  description: 'My order #1007 never arrived, I would like a refund please.',
  status: 'open',
  tags: ['refund-request'],
  requester: { id: 900, email: 'shopper@example.com' },
  created_at: '2026-05-28T09:00:00.000Z',
  updated_at: '2026-05-28T09:30:00.000Z',
};

const nonClaimTicket = {
  id: 77,
  subject: 'Question about your loyalty programme',
  description: 'Hi team, how do I join the loyalty programme? Thanks!',
  status: 'open',
  tags: [],
  requester: { id: 901, email: 'curious@example.com' },
  created_at: '2026-05-28T10:00:00.000Z',
  updated_at: '2026-05-28T10:00:00.000Z',
};

const activeConnection: ZendeskSupportConnectionRow = {
  id: CONNECTION_ID,
  merchant_id: MERCHANT_ID,
  provider_account_id: ZENDESK_SUBDOMAIN,
  provider_base_url: `https://${ZENDESK_SUBDOMAIN}.zendesk.com`,
  status: 'active',
  webhook_secret_hash: CONNECTION_SECRET_HASH,
};

function makeZendeskWebhookSupabase(options?: {
  connections?: ZendeskSupportConnectionRow[];
}) {
  let caseUpserts = 0;
  let eventInserts = 0;
  const lastCasePayloads: Record<string, unknown>[] = [];
  const connectionUpdates: Array<{ id: string; values: Record<string, unknown> }> = [];
  const connections = options?.connections ?? [activeConnection];
  const linkingTables = supportLinkingLookupTables();

  const supabase = {
    from: (table: string) => {
      if (table === TABLES.MERCHANT_SHOPIFY_CONNECTIONS) {
        return {
          select: () => ({
            eq: (column: string, value: string | boolean) => ({
              maybeSingle: async () => ({
                data:
                  column === 'merchant_id' && value === MERCHANT_ID
                    ? {
                        merchant_id: MERCHANT_ID,
                        shop_domain: 'unauth-test.myshopify.com',
                        active: true,
                      }
                    : null,
                error: null,
              }),
              eq: () => ({
                order: () => ({
                  limit: async () => ({
                    data: [
                      {
                        merchant_id: MERCHANT_ID,
                        shop_domain: 'unauth-test.myshopify.com',
                        active: true,
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'shopify_merchants') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { access_token: 'test-token', uninstalled_at: null },
                error: null,
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
                  maybeSingle: async () => ({
                    data: connections.find((c) => c.id === value) ?? null,
                    error: null,
                  }),
                };
              }
              if (column === 'provider' && value === 'zendesk') {
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
    casePayloads: () => lastCasePayloads,
  };
}

function webhookUrl(secret?: string): string {
  const base = `http://localhost/api/zendesk/support-webhook?zendesk_subdomain=${ZENDESK_SUBDOMAIN}`;
  return secret ? `${base}&unauth_whsec=${encodeURIComponent(secret)}` : base;
}

describe('Zendesk support webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.unauth.test';
    process.env.NODE_ENV = 'test';
    createServiceClient.mockReturnValue(makeZendeskWebhookSupabase().supabase);
  });

  it('rejects a missing webhook secret with 401', async () => {
    const res = await POST(
      new NextRequest(webhookUrl(), {
        method: 'POST',
        body: JSON.stringify({ ticket: claimTicket }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('rejects a bad webhook secret with 401', async () => {
    const mock = makeZendeskWebhookSupabase();
    createServiceClient.mockReturnValue(mock.supabase);
    const res = await POST(
      new NextRequest(webhookUrl('zendesk_whsec_wrongwrongwrongwrongwrongwrongwrong00'), {
        method: 'POST',
        body: JSON.stringify({ ticket: claimTicket }),
      })
    );
    expect(res.status).toBe(401);
    expect(mock.caseUpserts()).toBe(0);
  });

  it('ingests a claim ticket with a valid secret', async () => {
    const mock = makeZendeskWebhookSupabase();
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      new NextRequest(webhookUrl(CONNECTION_WEBHOOK_SECRET), {
        method: 'POST',
        body: JSON.stringify({ ticket: claimTicket }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.provider).toBe('zendesk');
    expect(json.external_case_id).toBe('42');
    expect(json.is_claim).toBe(true);
    expect(mock.caseUpserts()).toBe(1);
  });

  it('ingests a non-claim ticket without creating a payout case', async () => {
    const mock = makeZendeskWebhookSupabase();
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      new NextRequest(webhookUrl(CONNECTION_WEBHOOK_SECRET), {
        method: 'POST',
        body: JSON.stringify({ ticket: nonClaimTicket }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.external_case_id).toBe('77');
    expect(json.is_claim).toBe(false);
    // The support case row is still recorded, but no payout case is opened
    // (is_claim=false in the response is the claim gate outcome).
    expect(mock.caseUpserts()).toBe(1);
    expect(json.claim_type ?? null).toBeNull();
  });

  it('deduplicates duplicate deliveries onto the same support case', async () => {
    const mock = makeZendeskWebhookSupabase();
    createServiceClient.mockReturnValue(mock.supabase);

    const deliver = () =>
      POST(
        new NextRequest(webhookUrl(CONNECTION_WEBHOOK_SECRET), {
          method: 'POST',
          body: JSON.stringify({ ticket: claimTicket }),
        })
      );

    const first = await deliver();
    const second = await deliver();
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const firstJson = await first.json();
    const secondJson = await second.json();

    // Idempotency: both deliveries upsert on the same (merchant, provider,
    // external_case_id) conflict key, resolving to a single support case.
    expect(firstJson.support_case_id).toBe(SUPPORT_CASE_ID);
    expect(secondJson.support_case_id).toBe(SUPPORT_CASE_ID);
    expect(mock.casePayloads()).toHaveLength(2);
    expect(mock.casePayloads()[0]?.external_case_id).toBe(
      mock.casePayloads()[1]?.external_case_id
    );
  });
});
