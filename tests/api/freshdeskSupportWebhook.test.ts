import { NextRequest } from 'next/server';
import { TABLES } from '@/lib/supabase/tables';
import { hashFreshdeskWebhookSecret } from '@/lib/support/freshdesk/webhookSecret';
import type { FreshdeskSupportConnectionRow } from '@/lib/support/freshdesk/resolveConnection';
import { POST } from '@/app/api/freshdesk/support-webhook/route';
import {
  resolveSupportLinkingTable,
  supportCaseIntakeTableWithLinking,
  supportLinkingLookupTables,
} from '@/tests/lib/supportIngestLinkingMock';

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/support/freshdesk/freshdeskApi', () => ({
  fetchFreshdeskTicketById: jest.fn(),
  FreshdeskApiError: class FreshdeskApiError extends Error {
    status = 502;
  },
}));

jest.mock('@/lib/support/freshdesk/merchantApiAccess', () => ({
  getActiveFreshdeskMerchantApiAccess: jest.fn(),
}));

const MERCHANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CONNECTION_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SUPPORT_CASE_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const FRESHDESK_DOMAIN = 'acme.freshdesk.com';
const CONNECTION_WEBHOOK_SECRET =
  'freshdesk_whsec_abcdefghijklmnopqrstuvwxyz0123456789AB';
const CONNECTION_SECRET_HASH = hashFreshdeskWebhookSecret(CONNECTION_WEBHOOK_SECRET);

const { createServiceClient } = jest.requireMock('@/lib/supabase/server') as {
  createServiceClient: jest.Mock;
};

const freshdeskTicket = {
  id: 42,
  subject: 'Refund for order #1007',
  description_text: 'Please refund order #1007',
  status: 2,
  tags: ['refund-request'],
  requester: { email: 'shopper@example.com' },
  created_at: '2026-05-28T09:00:00.000Z',
  updated_at: '2026-05-28T09:30:00.000Z',
};

const activeConnection: FreshdeskSupportConnectionRow = {
  id: CONNECTION_ID,
  merchant_id: MERCHANT_ID,
  provider_account_id: FRESHDESK_DOMAIN,
  provider_base_url: `https://${FRESHDESK_DOMAIN}`,
  status: 'active',
  webhook_secret_hash: CONNECTION_SECRET_HASH,
};

function makeFreshdeskWebhookSupabase(options?: {
  connections?: FreshdeskSupportConnectionRow[];
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
            eq: () => ({
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
              if (column === 'provider' && value === 'freshdesk') {
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

  return { supabase, caseUpserts: () => caseUpserts, eventInserts: () => eventInserts };
}

describe('Freshdesk support webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.unauth.test';
    process.env.NODE_ENV = 'test';
    createServiceClient.mockReturnValue(makeFreshdeskWebhookSupabase().supabase);
  });

  it('rejects missing webhook secret', async () => {
    const res = await POST(
      new NextRequest(
        `http://localhost/api/freshdesk/support-webhook?freshdesk_domain=${FRESHDESK_DOMAIN}`,
        {
          method: 'POST',
          body: JSON.stringify({ ticket: freshdeskTicket }),
        }
      )
    );
    expect(res.status).toBe(401);
  });

  it('ingests ticket with valid secret in query', async () => {
    const url = `http://localhost/api/freshdesk/support-webhook?freshdesk_domain=${FRESHDESK_DOMAIN}&unauth_whsec=${encodeURIComponent(CONNECTION_WEBHOOK_SECRET)}`;
    const mock = makeFreshdeskWebhookSupabase();
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({ ticket: freshdeskTicket }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.provider).toBe('freshdesk');
    expect(json.external_case_id).toBe('42');
    expect(mock.caseUpserts()).toBeGreaterThan(0);
  });
});
