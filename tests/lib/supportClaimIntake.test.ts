import { TABLES } from '@/lib/supabase/tables';
import { ingestSupportCase } from '@/lib/support/intake/ingestSupportCase';
import { hashSupportEmail } from '@/lib/support/intake/store';
import { getNetworkClaimSummary } from '@/lib/support/intake/claimSummary';
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
    event_type: 'ticket_created',
    raw: ticket,
  };
}

function caseRows(client: MemoryClient) {
  return rowsOf(client, TABLES.SUPPORT_CASE_INTAKE);
}

describe('ingestSupportCase — claim intelligence', () => {
  it('inserts a valid claim into intake, order context, and claim summary', async () => {
    const client = createMemoryClient();
    const result = await ingestSupportCase(
      client,
      body(
        MERCHANT_A,
        gorgiasTicket({
          id: 'g-100',
          subject: 'Where is my order',
          body: 'my package never arrived',
          email: 'alice@example.com',
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
    const email = 'grow@example.com';

    await ingestSupportCase(
      client,
      body(MERCHANT_A, gorgiasTicket({ id: 'g-1', email, body: 'never arrived', order: { id: '1', customer: { orders_count: 4 } } }))
    );
    let summary = rowsOf(client, TABLES.CUSTOMER_CLAIM_SUMMARY)[0];
    expect(summary.total_claims).toBe(1);
    expect(summary.total_orders).toBe(4);
    expect(summary.claim_rate).toBe(0.25);

    await ingestSupportCase(
      client,
      body(MERCHANT_A, gorgiasTicket({ id: 'g-2', email, body: 'package never arrived again', order: { id: '2', customer: { orders_count: 4 } } }))
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
    const email = 'network@example.com';

    // Merchant A: 2 claims, 2 orders at A.
    await ingestSupportCase(client, body(MERCHANT_A, gorgiasTicket({ id: 'a-1', email, body: 'never arrived', order: { id: 'a1', customer: { orders_count: 2 } } })));
    await ingestSupportCase(client, body(MERCHANT_A, gorgiasTicket({ id: 'a-2', email, body: 'item not received', order: { id: 'a2', customer: { orders_count: 2 } } })));
    // Merchant B: 1 claim, 2 orders at B.
    await ingestSupportCase(client, body(MERCHANT_B, gorgiasTicket({ id: 'b-1', email, body: 'package never arrived', order: { id: 'b1', customer: { orders_count: 2 } } })));

    const network = await getNetworkClaimSummary(client, hashSupportEmail(email));
    expect(network.total_orders).toBe(4);
    expect(network.total_claims).toBe(3);
    expect(network.claim_rate).toBe(0.75);
    expect(network.primary_reason).toBe('INR');
    expect(network.merchant_count).toBe(2);
  });
});
