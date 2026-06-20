import { createMemoryClient, rowsOf } from '@/tests/lib/supabaseMemoryClient';
import { resolveTicketOrderLink } from '@/lib/support/intake/resolveTicketOrderLink';
import { reconcilePayoutCasesFromTickets } from '@/lib/support/intake/reconcilePayoutCasesFromTickets';
import { resolveClaimForTicketDecision } from '@/lib/claims/decision/resolveClaim';
import { TABLES } from '@/lib/supabase/tables';
import { ingestSupportCase } from '@/lib/support/intake/ingestSupportCase';

const MERCHANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('E2E order #1013 matching', () => {
  it('matches order by #1013 in subject text', async () => {
    const client = createMemoryClient();
    const orders = rowsOf(client, 'source_orders');
    orders.push({
      id: 'order-1013',
      merchant_id: MERCHANT,
      order_number: '1013',
      external_id: '16857807094129',
      email: 'simsorsno3@icloud.com',
      total_price: 185,
      currency: 'USD',
      placed_at: '2026-06-01T00:00:00Z',
    });
    client.__store.set('source_orders', orders);

    const result = await resolveTicketOrderLink(client as never, {
      merchantId: MERCHANT,
      subject: 'E2E refund request for order #1013 - item not received',
      customerEmail: 'simsorsno3@icloud.com',
    });

    expect(result.sourceOrderId).toBe('order-1013');
    expect(result.orderRef).toBe('1013');
    expect(result.matchMethod).toBe('order_ref');
    expect(result.totalPrice).toBe(185);
  });

  it('falls back to customer email when order ref missing', async () => {
    const client = createMemoryClient();
    client.__store.set('source_orders', [
      {
        id: 'order-1013',
        merchant_id: MERCHANT,
        order_number: '1013',
        external_id: '16857807094129',
        email: 'simsorsno3@icloud.com',
        total_price: 185,
        currency: 'USD',
        placed_at: '2026-06-01T00:00:00Z',
      },
    ]);

    const result = await resolveTicketOrderLink(client as never, {
      merchantId: MERCHANT,
      subject: 'Need help with my purchase',
      customerEmail: 'simsorsno3@icloud.com',
    });

    expect(result.sourceOrderId).toBe('order-1013');
    expect(result.matchMethod).toBe('email_fallback');
  });
});

describe('widget claim resolution by numeric external id', () => {
  it('resolves claim by Gorgias numeric ticket external_id', async () => {
    const client = createMemoryClient();
    client.__store.set('source_tickets', [
      { id: 'ticket-db', merchant_id: MERCHANT, external_id: '90001', provider: 'gorgias' },
    ]);
    client.__store.set(TABLES.MERCHANT_CLAIMS, [
      {
        id: 'claim-1',
        merchant_id: MERCHANT,
        source_ticket_id: 'ticket-db',
        status: 'open',
        claim_type: 'item_not_received',
        created_at: '2026-06-20T00:00:00Z',
      },
    ]);

    const result = await resolveClaimForTicketDecision(client as never, {
      merchantId: MERCHANT,
      ticketExternalId: '90001',
    });

    expect(result.status).toBe('resolved');
    expect(result.claimId).toBe('claim-1');
  });
});

describe('reconcile idempotent case generation with claim classification', () => {
  it('creates one INR-linked case for refund/INR subject ticket', async () => {
    const client = createMemoryClient();
    client.__store.set('source_orders', [
      {
        id: 'order-1013',
        merchant_id: MERCHANT,
        order_number: '1013',
        external_id: '16857807094129',
        email: 'shopper@example.com',
        total_price: 185,
        currency: 'USD',
        placed_at: '2026-06-01T00:00:00Z',
      },
    ]);
    client.__store.set(TABLES.SUPPORT_CASE_INTAKE, [
      {
        id: 'ticket-e2e',
        merchant_id: MERCHANT,
        provider: 'gorgias',
        external_id: 'e2e-1013',
        subject: 'E2E refund request for order #1013 - item not received',
        status: 'open',
        tags: [],
        linked_order_external_ids: [],
        source_customer_id: null,
        created_at_provider: '2026-06-20T12:00:00Z',
      },
    ]);

    await reconcilePayoutCasesFromTickets({ supabase: client as never, merchantId: MERCHANT });
    await reconcilePayoutCasesFromTickets({ supabase: client as never, merchantId: MERCHANT });

    const cases = rowsOf(client, TABLES.MERCHANT_CLAIMS);
    expect(cases).toHaveLength(1);
    expect(cases[0]).toMatchObject({
      source_ticket_id: 'ticket-e2e',
      source_order_id: 'order-1013',
      claim_type: 'item_not_received',
      status: 'open',
    });
  });
});

describe('ingest subject persistence for E2E ticket shape', () => {
  it('persists subject and creates claim case from INR/refund wording', async () => {
    const client = createMemoryClient();
    client.__store.set('source_orders', [
      {
        id: '00000000-0000-4000-8000-000000001013',
        merchant_id: MERCHANT,
        order_number: '1013',
        external_id: '1013',
      },
    ]);

    const result = await ingestSupportCase(client, {
      merchant_id: MERCHANT,
      provider: 'gorgias',
      event_type: 'e2e',
      raw: {
        id: 'e2e-ingest-1013',
        subject: 'E2E refund request for order #1013 - item not received',
        status: 'open',
        customer: { email: 'simsorsno3@icloud.com', firstname: 'simon', lastname: 'murphy' },
        messages: [{ body: 'Customer says item was not received. Please review refund eligibility.', from_agent: false }],
      },
    });

    expect(rowsOf(client, TABLES.SUPPORT_CASE_INTAKE)[0]).toMatchObject({
      subject: 'E2E refund request for order #1013 - item not received',
    });
    expect(result.is_claim).toBe(true);
    expect(rowsOf(client, TABLES.MERCHANT_CLAIMS)[0]).toMatchObject({
      claim_type: 'item_not_received',
      status: 'open',
    });
  });
});
