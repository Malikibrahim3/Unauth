import { TABLES } from '@/lib/supabase/tables';
import { ingestSupportCase } from '@/lib/support/intake/ingestSupportCase';
import { hashSupportEmail } from '@/lib/support/intake/store';
import {
  getNetworkClaimSummary,
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
  const rows = rowsOf(client, 'shopify_order_signals');
  rows.push({
    id: `sig-${order.id}`,
    shop_domain: 'unit-test.myshopify.com',
    shopify_order_id: order.id,
    order_number: order.orderNumber ?? order.id,
    customer_id: order.customerId ?? null,
  });
  client.__store.set('shopify_order_signals', rows);
}

function seedClaimTagConfig(
  client: MemoryClient,
  merchantId: string,
  options: { triggerTags?: string[]; keywordFallbackEnabled?: boolean } = {}
) {
  const rows = rowsOf(client, 'merchant_claim_tag_configs');
  rows.push({
    id: `${merchantId}-claim-tag-config`,
    merchant_id: merchantId,
    helpdesk_platform: 'gorgias',
    claim_trigger_tags: options.triggerTags ?? ['parcel-claim'],
    outcome_tags: {},
    void_tags: [],
    keyword_fallback_enabled: options.keywordFallbackEnabled ?? true,
  });
  client.__store.set('merchant_claim_tag_configs', rows);
}

describe('ingestSupportCase — claim intelligence', () => {
  it('inserts a valid claim into intake, order context, and claim summary', async () => {
    const client = createMemoryClient();
    seedClaimTagConfig(client, MERCHANT_A);
    const result = await ingestSupportCase(
      client,
      body(
        MERCHANT_A,
        gorgiasTicket({
          id: 'g-100',
          subject: 'Where is my order',
          body: 'my package never arrived',
          email: 'alice@example.com',
          tags: ['parcel-claim'],
          order: { id: '1007', total_price: 90, payment_method: 'credit_card', customer: { orders_count: 1 } },
        })
      )
    );

    expect(result.is_claim).toBe(true);
    expect(result.claim_type).toBe('INR');

    const intake = caseRows(client);
    expect(intake).toHaveLength(1);
    expect(intake[0].is_claim).toBe(true);
    expect(intake[0].claim_type).toBe('INR');

    const orderCtx = rowsOf(client, TABLES.ORDER_CLAIM_CONTEXT);
    expect(orderCtx).toHaveLength(1);
    expect(orderCtx[0].support_case_id).toBe(result.support_case_id);

    const summary = rowsOf(client, TABLES.CUSTOMER_CLAIM_SUMMARY);
    expect(summary).toHaveLength(1);
    expect(summary[0].total_claims).toBe(1);
    expect(summary[0].total_orders).toBe(1);
    expect(summary[0].claim_rate).toBe(1.0);
    expect(summary[0].primary_reason).toBe('INR');
  });

  it('does not count unconfirmed keyword fallback claims in the confirmed summary', async () => {
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
    const summary = rowsOf(client, TABLES.CUSTOMER_CLAIM_SUMMARY);
    expect(summary).toHaveLength(1);
    expect(summary[0].total_claims).toBe(0);
    expect(summary[0].total_orders).toBe(2);
    expect(summary[0].claim_rate).toBe(0);
  });

  it('clears claim_type metadata when tags do not confirm a claim', async () => {
    const client = createMemoryClient();
    seedClaimTagConfig(client, MERCHANT_A, {
      triggerTags: ['chargeback'],
      keywordFallbackEnabled: false,
    });

    const result = await ingestSupportCase(
      client,
      body(
        MERCHANT_A,
        gorgiasTicket({
          id: 'g-non-claim',
          body: 'my package never arrived',
          email: 'not-claimed@example.com',
          tags: ['refund-requested'],
          order: { id: '1009', customer: { orders_count: 1 } },
        })
      )
    );

    expect(result.is_claim).toBe(false);
    expect(result.claim_type).toBeNull();
    expect(result.claim_type_confidence).toBeNull();

    const intake = caseRows(client)[0];
    expect(intake.is_claim).toBe(false);
    expect(intake.claim_type).toBeNull();
    expect(intake.claim_type_confidence).toBeNull();
  });

  it('upserts a duplicate ticket id instead of duplicating', async () => {
    const client = createMemoryClient();
    const ticket = gorgiasTicket({ id: 'g-dup', body: 'my package never arrived' });
    await ingestSupportCase(client, body(MERCHANT_A, ticket));
    await ingestSupportCase(client, body(MERCHANT_A, { ...ticket, subject: 'Updated subject' }));

    const intake = caseRows(client);
    expect(intake).toHaveLength(1);
  });

  it('writes a non-claim ticket to intake but not to order context / summary', async () => {
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
    expect(rowsOf(client, TABLES.ORDER_CLAIM_CONTEXT)).toHaveLength(0);
    expect(rowsOf(client, TABLES.CUSTOMER_CLAIM_SUMMARY)).toHaveLength(0);
  });

  it('increments the summary and recalculates claim_rate as claims grow', async () => {
    const client = createMemoryClient();
    seedClaimTagConfig(client, MERCHANT_A);
    const email = 'grow@example.com';

    await ingestSupportCase(
      client,
      body(MERCHANT_A, gorgiasTicket({ id: 'g-1', email, body: 'never arrived', tags: ['parcel-claim'], order: { id: '1', customer: { orders_count: 4 } } }))
    );
    let summary = rowsOf(client, TABLES.CUSTOMER_CLAIM_SUMMARY)[0];
    expect(summary.total_claims).toBe(1);
    expect(summary.total_orders).toBe(4);
    expect(summary.claim_rate).toBe(0.25);

    await ingestSupportCase(
      client,
      body(MERCHANT_A, gorgiasTicket({ id: 'g-2', email, body: 'package never arrived again', tags: ['parcel-claim'], order: { id: '2', customer: { orders_count: 4 } } }))
    );
    summary = rowsOf(client, TABLES.CUSTOMER_CLAIM_SUMMARY)[0];
    expect(summary.total_claims).toBe(2);
    expect(summary.claim_rate).toBe(0.5);
    expect(rowsOf(client, TABLES.CUSTOMER_CLAIM_SUMMARY)).toHaveLength(1);
  });

  it('flags chargeback_threatened, provided_evidence=false, and days_since_delivery on one claim', async () => {
    const client = createMemoryClient();
    const result = await ingestSupportCase(
      client,
      body(
        MERCHANT_A,
        gorgiasTicket({
          id: 'g-cb',
          body: "my package never arrived, I'll just dispute with my bank",
          attachments: [],
          created_datetime: '2026-05-10T12:00:00Z',
          order: { id: '5', delivered_at: '2026-05-09T12:00:00Z', delivery_status: 'delivered' },
        })
      )
    );

    const intake = caseRows(client)[0];
    expect(intake.chargeback_threatened).toBe(true);
    expect(intake.provided_evidence).toBe(false);

    const orderCtx = rowsOf(client, TABLES.ORDER_CLAIM_CONTEXT)[0];
    expect(orderCtx.days_since_delivery_at_claim).toBe(1);
    expect(result.claim_type).toBe('INR');
  });

  it('computes days_since_delivery_at_claim = 1 for a guest day-1 INR claim', async () => {
    const client = createMemoryClient();
    await ingestSupportCase(
      client,
      body(
        MERCHANT_A,
        gorgiasTicket({
          id: 'g-guest',
          body: 'item not received',
          created_datetime: '2026-05-10T00:00:00Z',
          customer: { email: 'guest@example.com', account_type: 'guest' },
          order: { id: '9', delivered_at: '2026-05-09T00:00:00Z' },
        })
      )
    );

    const orderCtx = rowsOf(client, TABLES.ORDER_CLAIM_CONTEXT)[0];
    expect(orderCtx.days_since_delivery_at_claim).toBe(1);

    const identity = rowsOf(client, TABLES.CUSTOMER_IDENTITY_SIGNALS)[0];
    expect(identity.customer_account_type).toBe('guest');
  });

  it('stores a BNPL payment method in order_claim_context', async () => {
    const client = createMemoryClient();
    await ingestSupportCase(
      client,
      body(MERCHANT_A, gorgiasTicket({ id: 'g-bnpl', body: 'never arrived', order: { id: '11', payment_method: 'klarna' } }))
    );
    expect(rowsOf(client, TABLES.ORDER_CLAIM_CONTEXT)[0].payment_method).toBe('klarna');
  });

  it('infers claim outcome = approved from a "Refund Approved" macro', async () => {
    const client = createMemoryClient();
    await ingestSupportCase(
      client,
      body(MERCHANT_A, gorgiasTicket({ id: 'g-macro', body: 'never arrived', macros: ['Refund Approved'] }))
    );
    expect(caseRows(client)[0].outcome).toBe('approved');
  });

  it('records an address_match link candidate across two merchants', async () => {
    const client = createMemoryClient();
    const sharedAddress = { address1: '10 King St', city: 'Leeds', zip: 'LS1 1AA', country: 'UK' };

    await ingestSupportCase(
      client,
      body(MERCHANT_A, gorgiasTicket({ id: 'g-a', email: 'one@example.com', body: 'never arrived', order: { id: 'a1', shipping_address: sharedAddress } }))
    );
    await ingestSupportCase(
      client,
      body(MERCHANT_B, gorgiasTicket({ id: 'g-b', email: 'two@example.com', body: 'never arrived', order: { id: 'b1', shipping_address: sharedAddress } }))
    );

    const candidates = rowsOf(client, TABLES.IDENTITY_LINK_CANDIDATES);
    const addressMatches = candidates.filter((c) => c.link_type === 'address_match');
    expect(addressMatches.length).toBeGreaterThanOrEqual(1);
    expect(addressMatches[0].merchant_id_a).toBe(MERCHANT_B);
    expect(addressMatches[0].merchant_id_b).toBe(MERCHANT_A);
  });

  it('reflects cross-merchant network totals (4 orders / 2 merchants / 3 claims => 0.75)', async () => {
    const client = createMemoryClient();
    seedClaimTagConfig(client, MERCHANT_A);
    seedClaimTagConfig(client, MERCHANT_B);
    const email = 'network@example.com';

    // Merchant A: 2 claims, 2 orders at A.
    await ingestSupportCase(client, body(MERCHANT_A, gorgiasTicket({ id: 'a-1', email, body: 'never arrived', tags: ['parcel-claim'], order: { id: 'a1', customer: { orders_count: 2 } } })));
    await ingestSupportCase(client, body(MERCHANT_A, gorgiasTicket({ id: 'a-2', email, body: 'item not received', tags: ['parcel-claim'], order: { id: 'a2', customer: { orders_count: 2 } } })));
    // Merchant B: 1 claim, 2 orders at B.
    await ingestSupportCase(client, body(MERCHANT_B, gorgiasTicket({ id: 'b-1', email, body: 'package never arrived', tags: ['parcel-claim'], order: { id: 'b1', customer: { orders_count: 2 } } })));

    const network = await getNetworkClaimSummary(client, hashSupportEmail(email));
    expect(network.total_orders).toBe(4);
    expect(network.total_claims).toBe(3);
    expect(network.claim_rate).toBe(0.75);
    expect(network.primary_reason).toBe('INR');
    expect(network.merchant_count).toBe(2);
  });

  it('dedupes multiple helpdesk tickets for the same Shopify order into one claim', async () => {
    const client = createMemoryClient();
    seedShopifyOrder(client, { id: '1001', orderNumber: '1001' });

    await ingestSupportCase(
      client,
      body(MERCHANT_A, gorgiasTicket({ id: 'g-dupe-1', subject: 'Order #1001', tags: ['chargeback'], order: { id: '1001' } }))
    );
    await ingestSupportCase(
      client,
      body(MERCHANT_A, gorgiasTicket({ id: 'g-dupe-2', subject: 'Order #1001', tags: ['chargeback'], order: { id: '1001' } }))
    );

    expect(rowsOf(client, 'merchant_claims')).toHaveLength(1);
    expect(rowsOf(client, 'merchant_claims')[0]).toMatchObject({
      merchant_id: MERCHANT_A,
      shopify_order_id: '1001',
      detection_method: 'tag',
      trigger_tag: 'chargeback',
    });
  });

  it('creates separate claims for different orders from the same customer', async () => {
    const client = createMemoryClient();
    seedShopifyOrder(client, { id: '1001', orderNumber: '1001' });
    seedShopifyOrder(client, { id: '1002', orderNumber: '1002' });

    await ingestSupportCase(
      client,
      body(MERCHANT_A, gorgiasTicket({ id: 'g-order-1', email: 'same@example.com', subject: 'Order #1001', tags: ['chargeback'], order: { id: '1001' } }))
    );
    await ingestSupportCase(
      client,
      body(MERCHANT_A, gorgiasTicket({ id: 'g-order-2', email: 'same@example.com', subject: 'Order #1002', tags: ['chargeback'], order: { id: '1002' } }))
    );

    expect(rowsOf(client, 'merchant_claims')).toHaveLength(2);
  });

  it('does not create a merchant claim when no order can be linked', async () => {
    const client = createMemoryClient();
    await ingestSupportCase(
      client,
      body(MERCHANT_A, gorgiasTicket({ id: 'g-unlinked', tags: ['chargeback'], body: 'I will file a chargeback' }))
    );

    expect(rowsOf(client, 'merchant_claims')).toHaveLength(0);
    expect(caseRows(client)[0].is_claim).toBe(true);
    expect(caseRows(client)[0].merchant_claim_id).toBeNull();
  });

  it('tag re-add on the same ticket is a no-op for claims and logs another claim event', async () => {
    const client = createMemoryClient();
    seedShopifyOrder(client, { id: '1003', orderNumber: '1003' });
    const ticket = gorgiasTicket({ id: 'g-readd', subject: 'Order #1003', tags: ['chargeback'], order: { id: '1003' } });

    await ingestSupportCase(client, body(MERCHANT_A, ticket));
    await ingestSupportCase(client, body(MERCHANT_A, { ...ticket, tags: [] }));
    await ingestSupportCase(client, body(MERCHANT_A, ticket));

    expect(rowsOf(client, 'merchant_claims')).toHaveLength(1);
    const claimEvents = rowsOf(client, 'claim_events');
    expect(claimEvents.length).toBeGreaterThanOrEqual(2);
    expect(claimEvents.map((event) => event.event_type)).toEqual(
      expect.arrayContaining(['claim_created', 'claim_updated'])
    );
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
