import {
  normalizeSupportTicket,
  normalizeClaimReasonFromText,
  normalizeZendeskTicket,
  normalizeGorgiasTicket,
  normalizeIntercomConversation,
  normalizeFreshdeskTicket,
  truncateSupportSummary,
  toSupportCaseIntakeUpsertInput,
  SUPPORT_SUMMARY_MAX_LENGTH,
  type NormalizeSupportTicketContext,
} from '@/lib/support/intake/normalizeTicket';
import {
  appendSupportCaseEvent,
  hashRawPayload,
  hashSupportEmail,
  upsertSupportCaseIntake,
} from '@/lib/support/intake/store';

const MERCHANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CONNECTION_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const baseContext: NormalizeSupportTicketContext = {
  merchant_id: MERCHANT_ID,
  provider_connection_id: CONNECTION_ID,
  shop_domain: 'unauth-test.myshopify.com',
  provider_base_url: 'https://acme.zendesk.com',
};

function makeUpsertSupabase() {
  const calls: Array<{ table: string; payload: Record<string, unknown>; onConflict: string }> = [];
  const supabase = {
    from: (table: string) => ({
      upsert: (payload: Record<string, unknown>, opts: { onConflict: string }) => ({
        select: () => ({
          single: async () => {
            calls.push({ table, payload, onConflict: opts.onConflict });
            return { data: payload, error: null };
          },
        }),
      }),
    }),
  };
  return { supabase, calls };
}

function makeInsertSupabase() {
  const inserts: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const supabase = {
    from: (table: string) => ({
      insert: (payload: Record<string, unknown>) => {
        inserts.push({ table, payload });
        return {
          select: () => ({
            single: async () => ({
              data: { id: 'event-uuid', ...payload },
              error: null,
            }),
          }),
        };
      },
    }),
  };
  return { supabase, inserts };
}

describe('support ticket normalizer', () => {
  it('normalizes Zendesk missing parcel ticket', () => {
    const raw = {
      id: 99101,
      url: 'https://acme.zendesk.com/agent/tickets/99101',
      subject: 'Missing parcel ORD-2025-00341',
      description: 'Customer reports parcel not received.',
      status: 'open',
      tags: ['missing_parcel', 'shopify'],
      requester: { email: 'buyer@example.com' },
      comments: [{ body: 'Still waiting on ORD-2025-00341', public: true }],
      custom_fields: [{ id: 'order_number', value: 'ORD-2025-00341' }],
      created_at: '2026-05-28T10:00:00Z',
      updated_at: '2026-05-28T11:00:00Z',
      attachments: [],
    };

    const normalized = normalizeZendeskTicket(raw, baseContext);

    expect(normalized.provider).toBe('zendesk');
    expect(normalized.external_case_id).toBe('99101');
    expect(normalized.order_ref).toBe('ORD-2025-00341');
    expect(normalized.claim_reason).toBe('missing_parcel');
    expect(normalized.customer_email_hash).toBe(hashSupportEmail('buyer@example.com'));
    expect(normalized).not.toHaveProperty('customer_email');
    expect(normalized).not.toHaveProperty('raw_payload');
    expect(JSON.stringify(normalized)).not.toContain('buyer@example.com');
    expect(normalized.raw_payload_hash).toBe(hashRawPayload(raw));
  });

  it('builds a Zendesk agent URL instead of storing the provider API URL', () => {
    const raw = {
      id: 99102,
      url: 'https://acme.zendesk.com/api/v2/tickets/99102.json',
      subject: 'Missing parcel',
      description: 'Customer reports parcel not received.',
      requester: { email: 'buyer@example.com' },
      created_at: '2026-05-28T10:00:00Z',
      updated_at: '2026-05-28T11:00:00Z',
    };

    const normalized = normalizeZendeskTicket(raw, baseContext);
    expect(normalized.external_url).toBe('https://acme.zendesk.com/agent/tickets/99102');
  });

  it('normalizes Gorgias refund ticket with Shopify order #1007', () => {
    const raw = {
      id: 'g-500',
      uri: 'https://acme.gorgias.com/app/ticket/500',
      subject: 'Refund request',
      status: 'open',
      tags: ['refund', 'shopify'],
      customer: { email: 'shopper@example.com' },
      messages: [
        {
          body: 'Please refund Shopify order #1007 — item arrived damaged.',
          from_agent: false,
        },
        {
          body: 'A'.repeat(600),
          from_agent: true,
        },
      ],
      created_datetime: '2026-05-28T09:00:00Z',
      updated_datetime: '2026-05-28T09:30:00Z',
      attachments: [],
    };

    const normalized = normalizeGorgiasTicket(raw, {
      ...baseContext,
      provider_base_url: 'https://acme.gorgias.com',
    });

    expect(normalized.provider).toBe('gorgias');
    expect(normalized.order_ref).toBe('1007');
    expect(normalized.claim_reason).toBe('refund_request');
    expect(normalized.tags).toEqual(['refund', 'shopify']);
    expect(normalized.customer_message_summary).not.toContain('A'.repeat(600));
    expect(normalized.agent_notes_summary?.length).toBeLessThanOrEqual(SUPPORT_SUMMARY_MAX_LENGTH);
  });

  it('builds a Gorgias app ticket URL instead of storing the provider API URL', () => {
    const raw = {
      id: '63091193',
      uri: 'https://acme.gorgias.com/api/tickets/63091193',
      subject: 'Order #1008 not received',
      customer: { email: 'shopper@example.com' },
      messages: [{ body: 'Still not received.', from_agent: false }],
      created_datetime: '2026-05-28T09:00:00Z',
      updated_datetime: '2026-05-28T09:30:00Z',
    };

    const normalized = normalizeGorgiasTicket(raw, {
      ...baseContext,
      provider_base_url: 'https://acme.gorgias.com',
    });
    expect(normalized.external_url).toBe('https://acme.gorgias.com/app/ticket/63091193');
  });

  // Regression for the real Gorgias INR ticket (external case 63091193) that was
  // ingested with is_claim=false / claim_type=null / order_ref=null. Uses the
  // exact wording, including the curly apostrophes a mail client actually sends.
  it('classifies the real "Order #1008 not received" INR ticket end to end', () => {
    const raw = {
      id: 'g-63091193',
      subject: 'Order #1008 not received',
      status: 'open',
      tags: [],
      customer: { email: 'shopper@example.com' },
      messages: [
        {
          body: 'Hi, I still haven’t received order #1008. I’d like a refund please.',
          from_agent: false,
        },
      ],
      created_datetime: '2026-05-28T09:00:00Z',
      updated_datetime: '2026-05-28T09:30:00Z',
    };

    const normalized = normalizeGorgiasTicket(raw, baseContext);

    expect(normalized.is_claim).toBe(true);
    expect(normalized.claim_type).toBe('INR');
    expect(normalized.claim_type_confidence ?? 0).toBeGreaterThan(0.8);
    expect(normalized.order_ref).toBe('1008');
  });

  it('classifies an inbound customer message whose text is only in body_text', () => {
    // API-created / some inbound email messages leave stripped_text empty and
    // carry the content in body_text. The classifier must still see it.
    const raw = {
      id: 'g-bodytext',
      subject: 'Order #1008 not received',
      status: 'open',
      tags: [],
      customer: { email: 'shopper@example.com' },
      messages: [
        {
          from_agent: false,
          stripped_text: '',
          body_text: "Hi, I still haven't received order #1008. I'd like a refund please.",
        },
      ],
      created_datetime: '2026-05-30T21:00:00Z',
      updated_datetime: '2026-05-30T21:00:00Z',
    };

    const normalized = normalizeGorgiasTicket(raw, baseContext);
    expect(normalized.is_claim).toBe(true);
    expect(normalized.claim_type).toBe('INR');
    expect(normalized.order_ref).toBe('1008');
  });

  it('detects a claim buried in an early message of a long Gorgias thread', () => {
    const raw = {
      id: 'g-longthread',
      subject: 'Order #1008',
      status: 'open',
      tags: [],
      customer: { email: 'shopper@example.com' },
      messages: [
        { body: 'Hi, I still haven’t received order #1008. I’d like a refund please.', from_agent: false },
        { body: 'So sorry to hear that — let me look into it for you.', from_agent: true },
        { body: 'Any update?', from_agent: false },
        { body: 'Thanks for checking.', from_agent: false },
        { body: 'We are still investigating with the carrier.', from_agent: true },
        { body: 'Ok, appreciate it.', from_agent: false },
      ],
      created_datetime: '2026-05-28T09:00:00Z',
      updated_datetime: '2026-05-29T09:30:00Z',
    };

    const normalized = normalizeGorgiasTicket(raw, baseContext);
    expect(normalized.is_claim).toBe(true);
    expect(normalized.claim_type).toBe('INR');
    expect(normalized.order_ref).toBe('1008');
  });

  it('does not flag a long neutral Gorgias thread as a claim', () => {
    const raw = {
      id: 'g-neutral',
      subject: 'Question about sizing',
      status: 'open',
      tags: [],
      customer: { email: 'shopper@example.com' },
      messages: [
        { body: 'Hi, what size should I order for a medium fit?', from_agent: false },
        { body: 'We recommend sizing up — happy to help!', from_agent: true },
        { body: 'Great, thank you so much.', from_agent: false },
      ],
      created_datetime: '2026-05-28T09:00:00Z',
      updated_datetime: '2026-05-28T10:30:00Z',
    };

    const normalized = normalizeGorgiasTicket(raw, baseContext);
    expect(normalized.is_claim).toBe(false);
  });

  it('does not flag a ticket where only the agent mentions a refund (customer-driven)', () => {
    const raw = {
      id: 'g-agentrefund',
      subject: 'Order question',
      status: 'open',
      tags: [],
      customer: { email: 'shopper@example.com' },
      messages: [
        { body: 'Hi, can you tell me when my order will arrive?', from_agent: false },
        { body: 'If it does not arrive we can issue a refund for you.', from_agent: true },
        { body: 'Ok, thanks for letting me know.', from_agent: false },
      ],
      created_datetime: '2026-05-28T09:00:00Z',
      updated_datetime: '2026-05-28T10:30:00Z',
    };

    const normalized = normalizeGorgiasTicket(raw, baseContext);
    expect(normalized.is_claim).toBe(false);
  });

  it('normalizes Intercom conversation with SM-0090-001', () => {
    const raw = {
      id: 'ic-77',
      state: 'open',
      tags: ['delivery'],
      source: { body: 'Initial message' },
      contacts: [{ email: 'intercom-user@example.com' }],
      conversation_parts: [
        { body: 'I never received order SM-0090-001', author: { type: 'user' } },
      ],
      created_at: '2026-05-28T08:00:00Z',
      updated_at: '2026-05-28T08:15:00Z',
    };

    const normalized = normalizeIntercomConversation(raw, {
      ...baseContext,
      provider_base_url: 'https://app.intercom.com',
    });

    expect(normalized.order_ref).toBe('SM-0090-001');
    expect(normalized.claim_reason).toBe('missing_parcel');
    expect(normalized.provider).toBe('intercom');
  });

  it('normalizes Freshdesk damaged item ticket and status', () => {
    const raw = {
      id: 42,
      subject: 'Damaged product received',
      description_text: 'The item arrived broken and unusable.',
      status: 2,
      tags: ['damaged'],
      requester: { email: 'fd-user@example.com' },
      created_at: '2026-05-28T07:00:00Z',
      updated_at: '2026-05-28T07:20:00Z',
      attachments: [],
    };

    const normalized = normalizeFreshdeskTicket(raw, {
      ...baseContext,
      provider_base_url: 'https://acme.freshdesk.com',
    });

    expect(normalized.claim_reason).toBe('damaged_item');
    expect(normalized.case_status).toBe('open');
    expect(normalized.provider).toBe('freshdesk');
  });

  it('rejects invalid provider', () => {
    expect(() =>
      normalizeSupportTicket('deskpro', { id: 1 }, baseContext)
    ).toThrow();
  });

  it('returns attachment metadata only', () => {
    const raw = {
      id: 1,
      subject: 'Attachment test',
      status: 'open',
      requester: { email: 'a@example.com' },
      attachments: [
        {
          id: 'att-1',
          file_name: 'photo.jpg',
          content_type: 'image/jpeg',
          size: 1200,
          url: 'https://cdn.example.com/photo.jpg',
          body: 'BASE64_SHOULD_NOT_APPEAR',
        },
      ],
      created_at: '2026-05-28T06:00:00Z',
      updated_at: '2026-05-28T06:00:00Z',
    };

    const normalized = normalizeZendeskTicket(raw, baseContext);
    expect(normalized.attachments_metadata).toHaveLength(1);
    expect(normalized.attachments_metadata[0]).toMatchObject({
      provider_attachment_id: 'att-1',
      filename: 'photo.jpg',
      content_type: 'image/jpeg',
      size: 1200,
      url: 'https://cdn.example.com/photo.jpg',
    });
    expect(normalized.attachments_metadata[0]).not.toHaveProperty('body');
  });

  it('does not infer decision/outcome from support text', () => {
    const raw = {
      id: 9,
      subject: 'Approved refund for customer',
      description: 'We approved the refund and outcome is loss for merchant.',
      status: 'solved',
      tags: ['refund-approved'],
      requester: { email: 'x@example.com' },
      custom_fields: [],
      created_at: '2026-05-28T05:00:00Z',
      updated_at: '2026-05-28T05:30:00Z',
    };

    const normalized = normalizeZendeskTicket(raw, baseContext);
    expect(normalized.decision).toBeNull();
    expect(normalized.outcome).toBeNull();
  });

  it('sets decision/outcome only from explicit provider fields', () => {
    const raw = {
      id: 10,
      subject: 'Explicit fields',
      status: 'open',
      requester: { email: 'x@example.com' },
      custom_fields: [
        { id: 'decision', value: 'approved' },
        { id: 'outcome', value: 'loss' },
      ],
      tags: [],
      created_at: '2026-05-28T04:00:00Z',
      updated_at: '2026-05-28T04:10:00Z',
    };

    const normalized = normalizeZendeskTicket(raw, baseContext);
    expect(normalized.decision).toBe('approved');
    expect(normalized.outcome).toBe('loss');
  });

  it('has deterministic email hashing', () => {
    const hashA = hashSupportEmail('same@example.com');
    const hashB = hashSupportEmail('same@example.com');
    const hashC = hashSupportEmail('other@example.com');
    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashC);
  });

  it('caps summaries to safe length', () => {
    const long = 'x'.repeat(800);
    expect(truncateSupportSummary(long).length).toBeLessThanOrEqual(SUPPORT_SUMMARY_MAX_LENGTH);
  });

  it('changes raw_payload_hash when payload changes', () => {
    const a = { id: 1, subject: 'A' };
    const b = { id: 1, subject: 'B' };
    expect(hashRawPayload(a)).not.toBe(hashRawPayload(b));
  });

  it('normalizeClaimReasonFromText maps common labels', () => {
    expect(normalizeClaimReasonFromText('Item not received', [])).toBe('missing_parcel');
    expect(normalizeClaimReasonFromText('order_number: 1007 refund please', [])).toBe(
      'refund_request'
    );
  });

  it('extracts order_number and Shopify order patterns', () => {
    const normalized = normalizeZendeskTicket(
      {
        id: 88,
        subject: 'Help',
        description: 'order_number: 1007',
        status: 'open',
        requester: { email: 'z@example.com' },
        created_at: '2026-05-28T03:00:00Z',
        updated_at: '2026-05-28T03:00:00Z',
      },
      baseContext
    );
    expect(normalized.order_ref).toBe('1007');
  });
});

describe('normalizer + store integration (mocked)', () => {
  it('writes normalized Zendesk case and event without raw email/payload', async () => {
    const raw = {
      id: 7001,
      subject: 'Missing parcel ORD-2025-00341',
      description: 'Where is my order?',
      status: 'open',
      tags: ['missing_parcel'],
      requester: { email: 'normalized@example.com' },
      created_at: '2026-05-28T12:00:00Z',
      updated_at: '2026-05-28T12:30:00Z',
    };

    const normalized = normalizeZendeskTicket(raw, baseContext);
    const upsertInput = toSupportCaseIntakeUpsertInput(normalized);

    const { supabase: upsertClient, calls } = makeUpsertSupabase();
    await upsertSupportCaseIntake(upsertClient, upsertInput);

    expect(calls).toHaveLength(1);
    const payload = calls[0].payload;
    expect(payload.customer_email).toBeUndefined();
    expect(payload.raw_payload).toBeUndefined();
    expect(payload.customer_email_hash).toBe(normalized.customer_email_hash);
    expect(payload.raw_payload_hash).toBe(normalized.raw_payload_hash);
    expect(JSON.stringify(payload)).not.toContain('normalized@example.com');

    const { supabase: insertClient, inserts } = makeInsertSupabase();
    await appendSupportCaseEvent(insertClient, {
      merchant_id: MERCHANT_ID,
      support_case_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      provider: 'zendesk',
      event_type: 'ticket_ingested',
      event_summary: 'Ticket normalized and ingested',
      actor_type: 'system',
      actor_identifier: 'support-normalizer',
      raw_payload_hash: normalized.raw_payload_hash,
    });

    expect(inserts[0].payload.raw_payload).toBeUndefined();
    expect(inserts[0].payload.raw_payload_hash).toBe(normalized.raw_payload_hash);
  });
});
