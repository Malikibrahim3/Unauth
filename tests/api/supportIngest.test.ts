import { NextRequest } from 'next/server';
import { TABLES } from '@/lib/supabase/tables';
import {
  SUPPORT_INGEST_SECRET_HEADER,
  verifySupportIngestSecret,
} from '@/lib/support/intake/ingestAuth';
import { ingestSupportCase } from '@/lib/support/intake/ingestSupportCase';
import { POST } from '@/app/api/internal/support/ingest/route';
import {
  resolveSupportLinkingTable,
  supportCaseIntakeTableWithLinking,
  supportLinkingLookupTables,
} from '@/tests/lib/supportIngestLinkingMock';

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}));

const MERCHANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_MERCHANT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CONNECTION_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SUPPORT_CASE_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const INGEST_SECRET = 'test-internal-support-ingest-secret-32chars-min';

const { createServiceClient } = jest.requireMock('@/lib/supabase/server') as {
  createServiceClient: jest.Mock;
};

function makeSupportIngestSupabase(options?: {
  connection?: { id: string; merchant_id: string; provider_base_url?: string | null } | null;
  supportCaseId?: string;
}) {
  let caseUpserts = 0;
  let eventInserts = 0;
  const supportCaseId = options?.supportCaseId ?? SUPPORT_CASE_ID;
  const lastCasePayloads: Record<string, unknown>[] = [];
  const lastEventPayloads: Record<string, unknown>[] = [];
  const linkingTables = supportLinkingLookupTables();

  const supabase = {
    from: (table: string) => {
      if (table === TABLES.SUPPORT_PROVIDER_CONNECTIONS) {
        return {
          select: () => ({
            eq: (_column: string, value: string) => ({
              maybeSingle: async () => {
                const connection = options?.connection;
                if (!connection || connection.id !== value) {
                  return { data: null, error: null };
                }
                return { data: connection, error: null };
              },
            }),
          }),
        };
      }

      if (table === TABLES.SUPPORT_CASE_INTAKE) {
        return supportCaseIntakeTableWithLinking({
          supportCaseId,
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
                lastEventPayloads.push(payload);
                return {
                  data: {
                    id: `eeeeeeee-eeee-eeee-eeee-${String(eventInserts).padStart(12, '0')}`,
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
    lastEventPayload: () => lastEventPayloads[lastEventPayloads.length - 1],
  };
}

function makeRequest(body: unknown, secret?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (secret !== undefined) {
    headers[SUPPORT_INGEST_SECRET_HEADER] = secret;
  }
  return new NextRequest('http://localhost/api/internal/support/ingest', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  } as RequestInit);
}

const zendeskBody = {
  merchant_id: MERCHANT_ID,
  provider: 'zendesk' as const,
  event_type: 'ticket_created',
  shop_domain: 'unauth-test.myshopify.com',
  raw: {
    id: 99101,
    subject: 'Missing parcel ORD-2025-00341',
    description: 'Customer reports parcel not received.',
    status: 'open',
    tags: ['missing_parcel'],
    requester: { email: 'buyer@example.com' },
    created_at: '2026-05-28T10:00:00.000Z',
    updated_at: '2026-05-28T11:00:00.000Z',
  },
};

const gorgiasBody = {
  merchant_id: MERCHANT_ID,
  provider: 'gorgias' as const,
  event_type: 'ticket_updated',
  raw: {
    id: 'g-500',
    subject: 'Refund for Shopify order #1007',
    status: 'open',
    tags: ['refund'],
    customer: { email: 'shopper@example.com' },
    messages: [{ body: 'Please refund Shopify order #1007', from_agent: false }],
    created_datetime: '2026-05-28T09:00:00.000Z',
    updated_datetime: '2026-05-28T09:30:00.000Z',
  },
};

describe('support ingest auth', () => {
  it('accepts configured secret', () => {
    expect(verifySupportIngestSecret(INGEST_SECRET)).toBe(true);
  });

  it('rejects invalid secret', () => {
    expect(verifySupportIngestSecret('wrong-secret-value-32chars-minimum!')).toBe(false);
  });
});

describe('POST /api/internal/support/ingest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects missing secret', async () => {
    const res = await POST(makeRequest(zendeskBody));
    expect(res.status).toBe(401);
  });

  it('rejects invalid secret', async () => {
    const res = await POST(makeRequest(zendeskBody, 'not-the-secret'));
    expect(res.status).toBe(401);
  });

  it('rejects invalid provider', async () => {
    const mock = makeSupportIngestSupabase();
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      makeRequest({ ...zendeskBody, provider: 'deskforce' }, INGEST_SECRET)
    );
    expect(res.status).toBe(400);
  });

  it('rejects missing merchant_id', async () => {
    const res = await POST(
      makeRequest(
        {
          provider: 'zendesk',
          event_type: 'ticket_created',
          raw: { id: 1 },
        },
        INGEST_SECRET
      )
    );
    expect(res.status).toBe(400);
  });

  it('rejects missing raw payload', async () => {
    const res = await POST(
      makeRequest(
        {
          merchant_id: MERCHANT_ID,
          provider: 'zendesk',
          event_type: 'ticket_created',
        },
        INGEST_SECRET
      )
    );
    expect(res.status).toBe(400);
  });

  it('ingests valid Zendesk fixture', async () => {
    const mock = makeSupportIngestSupabase();
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(makeRequest(zendeskBody, INGEST_SECRET));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.provider).toBe('zendesk');
    expect(json.support_case_id).toBe(SUPPORT_CASE_ID);
    expect(json.external_case_id).toBe('99101');
    expect(json.order_ref).toBe('ORD-2025-00341');
    expect(json.claim_reason).toBe('missing_parcel');
    expect(json.link_status).toBe('not_found');
    expect(mock.caseUpserts()).toBe(1);
    expect(mock.eventInserts()).toBe(2);

    const casePayload = mock.lastCasePayload();
    expect(casePayload.customer_email).toBeUndefined();
    expect(casePayload.raw_payload).toBeUndefined();
    expect(casePayload.customer_email_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(casePayload.raw_payload_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(json)).not.toContain('buyer@example.com');
  });

  it('ingests valid Gorgias fixture', async () => {
    const mock = makeSupportIngestSupabase();
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(makeRequest(gorgiasBody, INGEST_SECRET));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.provider).toBe('gorgias');
    expect(json.order_ref).toBe('1007');
    expect(json.claim_reason).toBe('refund_request');
    expect(json.link_status).toBe('not_found');
  });

  it('keeps one case row on duplicate ticket but appends events', async () => {
    const mock = makeSupportIngestSupabase();
    createServiceClient.mockReturnValue(mock.supabase);

    const first = await POST(makeRequest(zendeskBody, INGEST_SECRET));
    const second = await POST(
      makeRequest({ ...zendeskBody, event_type: 'ticket_updated' }, INGEST_SECRET)
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const firstJson = await first.json();
    const secondJson = await second.json();
    expect(firstJson.support_case_id).toBe(secondJson.support_case_id);
    expect(mock.caseUpserts()).toBe(2);
    expect(mock.eventInserts()).toBe(4);
    expect(firstJson.event_id).not.toBe(secondJson.event_id);
  });

  it('rejects provider_connection_id for another merchant', async () => {
    const mock = makeSupportIngestSupabase({
      connection: {
        id: CONNECTION_ID,
        merchant_id: OTHER_MERCHANT_ID,
        provider_base_url: 'https://other.zendesk.com',
      },
    });
    createServiceClient.mockReturnValue(mock.supabase);

    const res = await POST(
      makeRequest(
        {
          ...zendeskBody,
          provider_connection_id: CONNECTION_ID,
        },
        INGEST_SECRET
      )
    );
    expect(res.status).toBe(403);
  });
});

describe('ingestSupportCase (unit)', () => {
  it('rejects provider_connection_id from wrong merchant', async () => {
    const mock = makeSupportIngestSupabase({
      connection: {
        id: CONNECTION_ID,
        merchant_id: OTHER_MERCHANT_ID,
      },
    });

    await expect(
      ingestSupportCase(mock.supabase, {
        ...zendeskBody,
        provider_connection_id: CONNECTION_ID,
      })
    ).rejects.toMatchObject({ status: 403 });
  });
});
