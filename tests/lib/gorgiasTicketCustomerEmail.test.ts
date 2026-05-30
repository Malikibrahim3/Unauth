import { resolveGorgiasTicketCustomerEmail } from '@/lib/support/gorgias/ticketCustomerEmail';
import { normalizeGorgiasTicket } from '@/lib/support/intake/normalizeTicket';
import { hashSupportEmail } from '@/lib/support/intake/store';

const merchantId = 'af070af9-df1a-46ba-89f8-29409926ef61';

describe('resolveGorgiasTicketCustomerEmail', () => {
  it('prefers non-agent message sender over ticket.customer (support inbox)', () => {
    const ticket = {
      id: 9001,
      subject: 'Order #1008 not received',
      status: 'open',
      customer: { email: 'support@unauth.gorgias.com', name: 'Unauth Support' },
      messages: [
        {
          from_agent: false,
          body: "Hi, I still haven't received order #1008. I'd like a refund please.",
          sender: { email: 'simeonmurray123@gmail.com' },
          source: {
            type: 'email',
            from: { address: 'simeonmurray123@gmail.com' },
          },
        },
      ],
    };

    const resolved = resolveGorgiasTicketCustomerEmail(ticket, {
      excludeEmails: new Set(['support@unauth.gorgias.com']),
    });

    expect(resolved?.normEmail).toBe('simeonmurray123@gmail.com');
    expect(resolved?.source).toBe('message_sender');
  });
});

describe('normalizeGorgiasTicket claim detection', () => {
  it('classifies INR refund request from inbound message body', () => {
    const raw = {
      id: '9002',
      subject: 'Order #1008 not received',
      status: 'open',
      channel: 'email',
      customer: { email: 'support@unauth.gorgias.com' },
      messages: [
        {
          from_agent: false,
          body: "Hi, I still haven't received order #1008. I'd like a refund please.",
          sender: { email: 'simeonmurray123@gmail.com' },
        },
      ],
      created_datetime: '2026-05-30T21:00:00Z',
      updated_datetime: '2026-05-30T21:00:00Z',
    };

    const normalized = normalizeGorgiasTicket(raw, {
      merchant_id: merchantId,
      provider_connection_id: null,
      shop_domain: 'unauth-test.myshopify.com',
    });

    expect(normalized.order_ref).toBe('1008');
    expect(normalized.is_claim).toBe(true);
    expect(normalized.claim_type).toBe('INR');
    expect(normalized.customer_email_hash).toBe(hashSupportEmail('simeonmurray123@gmail.com'));
  });
});
