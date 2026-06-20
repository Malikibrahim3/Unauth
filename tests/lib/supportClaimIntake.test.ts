import { TABLES } from '@/lib/supabase/tables';
import { ingestSupportCase } from '@/lib/support/intake/ingestSupportCase';
import { hashSupportEmail } from '@/lib/support/intake/store';
import {
  recomputeCustomerClaimSummary,
} from '@/lib/support/intake/claimSummary';
import { createMemoryClient, rowsOf, type MemoryClient } from '@/tests/lib/supabaseMemoryClient';

const MERCHANT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MERCHANT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

type TicketOverrides = {
  id?: string;
  subject?: string;
  body?: string;
  email?: string;
  status?: string;
  tags?: string[];
  macros?: string[];
  channel?: string;
  attachments?: unknown[];
  customer?: Record<string, unknown>;
  created_datetime?: string;
  order?: Record<string, unknown>;
};

function gorgiasTicket(over: TicketOverrides = {}): Record<string, unknown> {
  const ticket: Record<string, unknown> = {
    id: over.id ?? 'g-1',
    subject: over.subject ?? 'Order issue',
    status: over.status ?? 'open',
    tags: over.tags ?? [],
    created_datetime: over.created_datetime ?? '2026-05-10T12:00:00Z',
    updated_datetime: over.created_datetime ?? '2026-05-10T12:00:00Z',
    customer: over.customer ?? { email: over.email ?? 'shopper@example.com' },
    messages: [{ body: over.body ?? 'Please help with my order', from_agent: false }],
  };
  if (over.macros) ticket.macros = over.macros;
  if (over.channel) ticket.channel = over.channel;
  if (over.attachments !== undefined) ticket.attachments = over.attachments;
  if (over.order) ticket.integrations = { shopify: { order: over.order } };
  return ticket;
}

function body(merchantId: string, ticket: Record<string, unknown>) {
  return {
    merchant_id: merchantId,
    provider: 'gorgias' as const,
    shop_domain: 'unit-test.myshopify.com',
    event_type: 'ticket_created',
    raw: ticket,
  };
}

function caseRows(client: MemoryClient) {
  return rowsOf(client, TABLES.SUPPORT_CASE_INTAKE);
}

function seedShopifyOrder(client: MemoryClient, order: { id: string; orderNumber?: string; customerId?: string | null }) {
  const rows = rowsOf(client, 'source_orders');
  rows.push({
    id: `00000000-0000-4000-8000-${order.id.padStart(12, '0').slice(-12)}`,
    merchant_id: MERCHANT_A,
    source: 'shopify',
    external_id: order.id,
    order_number: order.orderNumber ?? order.id,
    source_customer_id: order.customerId ?? null,
  });
  client.__store.set('source_orders', rows);
}

describe('ingestSupportCase — v2 support payout intake', () => {
  it('inserts a valid support ticket and support payout case', async () => {
    const client = createMemoryClient();
    const result = await ingestSupportCase(
      client,
      body(
        MERCHANT_A,
        gorgiasTicket({
          id: 'g-100',
          subject: 'Where is order #1007',
          body: 'my package never arrived',
          email: 'alice@example.com',
          tags: ['refund-requested'],
          order: { id: '1007', total_price: 90, payment_method: 'credit_card', customer: { orders_count: 1 } },
        })
      )
    );

    expect(result.is_claim).toBe(true);
    expect(result.claim_type).toBe('INR');
    expect(result.case_reason).toBe('refund_request');
    expect(result.requested_action).toBe('refund');
    expect(result.payout_exposure).toEqual({ amount: 90, currency: null });

    const intake = caseRows(client);
    expect(intake).toHaveLength(1);
    expect(intake[0]).toMatchObject({
      merchant_id: MERCHANT_A,
      provider: 'gorgias',
      external_id: 'g-100',
      linked_order_external_ids: ['1007'],
    });

    const payoutCases = rowsOf(client, TABLES.MERCHANT_CLAIMS);
    expect(payoutCases).toHaveLength(1);
    expect(payoutCases[0]).toMatchObject({
      merchant_id: MERCHANT_A,
      source_ticket_id: result.support_case_id,
      claim_type: 'item_not_received',
      status: 'open',
      detection_method: 'tag',
      reason_normalized: 'refund_request',
      requested_action: 'refund',
      amount_at_risk: 90,
      total_estimated_loss: 90,
      requires_review: true,
    });
    expect(result.merchant_claim_id).toBe(payoutCases[0].id);

    expect(rowsOf(client, 'claim_events')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          claim_id: result.merchant_claim_id,
          event_type: 'created',
        }),
      ]),
    );
  });

  it('creates a review-required payout case for keyword fallback requests', async () => {
    const client = createMemoryClient();
    const result = await ingestSupportCase(
      client,
      body(
        MERCHANT_A,
        gorgiasTicket({
          id: 'g-keyword-summary',
          body: 'my package never arrived',
          email: 'fallback@example.com',
          order: { id: '1008', customer: { orders_count: 2 } },
        })
      )
    );

    expect(result.is_claim).toBe(true);
    expect(result.detection_method).toBe('keyword_fallback');
    expect(result.requires_merchant_review).toBe(true);
    expect(rowsOf(client, TABLES.MERCHANT_CLAIMS)[0]).toMatchObject({
      source_ticket_id: result.support_case_id,
      detection_method: 'keyword',
      requires_review: true,
    });
  });

  it('clears claim_type metadata when tags do not confirm a claim', async () => {
    const client = createMemoryClient();

    const result = await ingestSupportCase(
      client,
      body(
        MERCHANT_A,
        gorgiasTicket({
          id: 'g-non-claim',
          subject: 'Account update',
          body: 'Please update my account email',
          email: 'not-claimed@example.com',
          tags: ['account-update'],
          order: { id: '1009', customer: { orders_count: 1 } },
        })
      )
    );

    expect(result.is_claim).toBe(false);
    expect(result.claim_type).toBeNull();
    expect(result.claim_type_confidence).toBeNull();
    expect(result.merchant_claim_id).not.toBeNull();
    expect(rowsOf(client, TABLES.MERCHANT_CLAIMS)).toHaveLength(1);
    expect(rowsOf(client, TABLES.MERCHANT_CLAIMS)[0]).toMatchObject({
      status: 'new',
      claim_type: 'other',
      requires_review: true,
    });
  });

  it('upserts a duplicate ticket id instead of duplicating', async () => {
    const client = createMemoryClient();
    const ticket = gorgiasTicket({ id: 'g-dup', body: 'my package never arrived' });
    await ingestSupportCase(client, body(MERCHANT_A, ticket));
    await ingestSupportCase(client, body(MERCHANT_A, { ...ticket, subject: 'Updated subject' }));

    const intake = caseRows(client);
    expect(intake).toHaveLength(1);
  });

  it('writes a non-claim ticket to intake and creates a needs-classification payout case', async () => {
    const client = createMemoryClient();
    const result = await ingestSupportCase(
      client,
      body(
        MERCHANT_A,
        gorgiasTicket({ id: 'g-200', subject: 'Sizing question', body: 'what size should I order?' })
      )
    );

    expect(result.is_claim).toBe(false);
    expect(caseRows(client)).toHaveLength(1);
    expect(caseRows(client)[0]).toMatchObject({ subject: 'Sizing question' });
    expect(rowsOf(client, TABLES.MERCHANT_CLAIMS)).toHaveLength(1);
    expect(rowsOf(client, TABLES.MERCHANT_CLAIMS)[0]).toMatchObject({
      status: 'new',
      claim_type: 'other',
      requires_review: true,
    });
  });

  it('links a payout case to a source order when order context is available', async () => {
    const client = createMemoryClient();
    seedShopifyOrder(client, { id: '1001', orderNumber: '1001' });
    const result = await ingestSupportCase(
      client,
      body(
        MERCHANT_A,
        gorgiasTicket({
          id: 'g-linked',
          subject: 'Order #1001',
          body: 'my package never arrived',
          tags: ['refund-requested'],
          order: { id: '1001' },
        })
      )
    );

    expect(result.link_status).toBe('linked');
    expect(result.shopify_order_id).toBe('1001');
    expect(rowsOf(client, TABLES.MERCHANT_CLAIMS)[0]).toMatchObject({
      source_order_id: '00000000-0000-4000-8000-000000001001',
    });
    expect(caseRows(client)[0]).toMatchObject({
      linked_order_external_ids: ['1001'],
    });
  });

  it('creates separate payout cases for different support tickets', async () => {
    const client = createMemoryClient();

    await ingestSupportCase(
      client,
      body(MERCHANT_A, gorgiasTicket({ id: 'g-order-1', email: 'same@example.com', body: 'never arrived', tags: ['refund-requested'], order: { id: '1001' } }))
    );
    await ingestSupportCase(
      client,
      body(MERCHANT_A, gorgiasTicket({ id: 'g-order-2', email: 'same@example.com', body: 'item not received', tags: ['refund-requested'], order: { id: '1002' } }))
    );

    expect(rowsOf(client, TABLES.MERCHANT_CLAIMS)).toHaveLength(2);
  });

  it('creates a ticket-anchored payout case even when no order can be linked', async () => {
    const client = createMemoryClient();
    await ingestSupportCase(
      client,
      body(MERCHANT_A, gorgiasTicket({ id: 'g-unlinked', tags: ['chargeback'], body: 'I will file a chargeback' }))
    );

    expect(rowsOf(client, TABLES.MERCHANT_CLAIMS)).toHaveLength(1);
    expect(rowsOf(client, TABLES.MERCHANT_CLAIMS)[0]).toMatchObject({
      source_order_id: null,
      source_ticket_id: caseRows(client)[0].id,
    });
  });

  it('re-adding a claim tag on the same ticket does not duplicate the payout case', async () => {
    const client = createMemoryClient();
    const ticket = gorgiasTicket({ id: 'g-readd', subject: 'Order #1003', tags: ['chargeback'], order: { id: '1003' } });

    await ingestSupportCase(client, body(MERCHANT_A, ticket));
    await ingestSupportCase(client, body(MERCHANT_A, { ...ticket, tags: [] }));
    await ingestSupportCase(client, body(MERCHANT_A, ticket));

    expect(rowsOf(client, TABLES.MERCHANT_CLAIMS)).toHaveLength(1);
    const claimEvents = rowsOf(client, 'claim_events');
    expect(claimEvents.map((event) => event.event_type)).toEqual(['created']);
  });
});

describe('claim summary compatibility', () => {
  it('retries summary reads without requires_merchant_review when the live schema cache lacks that column', async () => {
    const rows = [
      {
        claim_type: 'INR',
        created_at_provider: '2026-05-10T12:00:00.000Z',
        updated_at_provider: '2026-05-10T12:00:00.000Z',
      },
    ];
    let attempts = 0;
    const summaryUpserts: Record<string, unknown>[] = [];

    const supabase = {
      from: (table: string) => {
        if (table === TABLES.SUPPORT_CASE_INTAKE) {
          return {
            select: (_columns: string) => ({
              eq: (_col1: string, _val1: string) => ({
                eq: (_col2: string, _val2: string) => ({
                  eq: async (_col3: string, _val3: boolean) => {
                    attempts += 1;
                    if (attempts === 1) {
                      return {
                        data: null,
                        error: {
                          message:
                            "Could not find the 'requires_merchant_review' column of 'support_case_intake' in the schema cache",
                        },
                      };
                    }
                    return { data: rows, error: null };
                  },
                }),
              }),
            }),
          };
        }

        if (table === TABLES.CUSTOMER_CLAIM_SUMMARY) {
          return {
            upsert: (payload: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  summaryUpserts.push(payload);
                  return { error: null };
                },
              }),
            }),
          };
        }

        throw new Error(`unexpected table: ${table}`);
      },
    };

    const result = await recomputeCustomerClaimSummary(supabase, {
      merchantId: MERCHANT_A,
      emailHash: hashSupportEmail('compat@example.com'),
      knownOrderCount: 2,
    });

    expect(attempts).toBe(2);
    expect(result?.total_claims).toBe(1);
    expect(summaryUpserts).toHaveLength(1);
  });

  it('retries summary reads without requires_merchant_review when Postgres reports the column missing directly', async () => {
    const rows = [
      {
        claim_type: 'INR',
        created_at_provider: '2026-05-10T12:00:00.000Z',
        updated_at_provider: '2026-05-10T12:00:00.000Z',
      },
    ];
    let attempts = 0;

    const supabase = {
      from: (table: string) => {
        if (table === TABLES.SUPPORT_CASE_INTAKE) {
          return {
            select: (_columns: string) => ({
              eq: (_col1: string, _val1: string) => ({
                eq: (_col2: string, _val2: string) => ({
                  eq: async (_col3: string, _val3: boolean) => {
                    attempts += 1;
                    if (attempts === 1) {
                      return {
                        data: null,
                        error: {
                          message:
                            'column support_case_intake.requires_merchant_review does not exist',
                        },
                      };
                    }
                    return { data: rows, error: null };
                  },
                }),
              }),
            }),
          };
        }

        if (table === TABLES.CUSTOMER_CLAIM_SUMMARY) {
          return {
            upsert: (_payload: Record<string, unknown>) => ({
              select: () => ({
                single: async () => ({ error: null }),
              }),
            }),
          };
        }

        throw new Error(`unexpected table: ${table}`);
      },
    };

    const result = await recomputeCustomerClaimSummary(supabase, {
      merchantId: MERCHANT_A,
      emailHash: hashSupportEmail('compat-sql@example.com'),
      knownOrderCount: 2,
    });

    expect(attempts).toBe(2);
    expect(result?.total_claims).toBe(1);
  });
});
