import {
  writeIdentifierGraphFromScoredBatch,
  writeIdentifierGraphFromSupportTicket,
} from '@/lib/identity/writeIdentifierGraph';
import { hashIdentifier } from '@/lib/identity/hash';
import { normaliseEmail } from '@/lib/identity/normalise';
import type { ScoredOrder } from '@/lib/engine/types';
import type { SupabaseClient } from '@supabase/supabase-js';

const MERCHANT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const EMAIL_HASH = hashIdentifier(normaliseEmail('dual-write-test@example.test')!);
const PHONE_HASH = hashIdentifier('+15551234567');
const ADDRESS_HASH = hashIdentifier('1 verification lane');

function makeScoredOrder(): ScoredOrder {
  return {
    order: {
      orderId: 'verify-order-1',
      orderDate: new Date('2026-06-08'),
      customerNameNorm: 'verify',
      emailHash: EMAIL_HASH,
      phoneHash: PHONE_HASH,
      addressHash: ADDRESS_HASH,
      billingAddressHash: null,
      ipHash: hashIdentifier('203.0.113.99'),
      cardLast4: hashIdentifier('4242'),
      orderTotal: 10,
      currency: 'USD',
      orderStatus: 'completed',
      refundStatus: 'none',
      refundReason: null,
      refundDate: null,
      refundAmount: null,
      paymentMethod: 'visa',
    } as ScoredOrder['order'],
    totalScore: 0,
    flagged: false,
    signals: [],
  };
}

function createMockServiceClient() {
  const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const client = {
    rpc: jest.fn(async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      return { data: null, error: null };
    }),
    _rpcCalls: rpcCalls,
  };
  return client as unknown as SupabaseClient & { _rpcCalls: typeof rpcCalls };
}

const HEX64 = /^[0-9a-f]{64}$/;

describe('writeIdentifierGraphFromScoredBatch', () => {
  it('writes HMAC identifiers and merchant-scoped edges via service RPCs', async () => {
    const client = createMockServiceClient();
    const result = await writeIdentifierGraphFromScoredBatch([makeScoredOrder()], client, {
      merchantId: MERCHANT_ID,
      sourceProvider: 'csv',
    });

    expect(result.identifiers).toBeGreaterThan(0);
    expect(result.edges).toBeGreaterThan(0);

    const idCall = client._rpcCalls.find((c) => c.fn === 'bulk_upsert_identity_identifiers');
    const edgeCall = client._rpcCalls.find((c) => c.fn === 'bulk_upsert_identifier_co_occurrence_edges');

    expect(idCall).toBeDefined();
    expect(edgeCall).toBeDefined();
    expect(idCall!.args.p_source_provider).toBe('csv');
    expect(edgeCall!.args.p_merchant_id).toBe(MERCHANT_ID);
    expect(edgeCall!.args.p_source_provider).toBe('csv');

    const identifiers = idCall!.args.p_identifiers as Array<{
      identifier_type: string;
      identifier_hash: string;
      raw_vs_hashed_storage: string;
    }>;
    expect(identifiers.some((id) => id.identifier_type === 'normalized_email_hash')).toBe(true);
    expect(identifiers.every((id) => id.raw_vs_hashed_storage === 'hashed' || id.identifier_type.includes('platform'))).toBe(true);

    for (const id of identifiers) {
      if (id.raw_vs_hashed_storage === 'hashed') {
        expect(id.identifier_hash).toMatch(HEX64);
        expect(id.identifier_hash).not.toContain('@');
      }
    }

    const edges = edgeCall!.args.p_edges as Array<{
      left_type: string;
      left_hash: string;
      right_type: string;
      right_hash: string;
      count_delta: number;
    }>;
    expect(edges.length).toBeGreaterThan(0);
    for (const edge of edges) {
      expect(`${edge.left_type}:${edge.left_hash}` < `${edge.right_type}:${edge.right_hash}`).toBe(true);
      expect(edge.count_delta).toBeGreaterThanOrEqual(1);
    }

    // ip/card excluded from v1 graph
    expect(identifiers.some((id) => id.identifier_hash === hashIdentifier('203.0.113.99'))).toBe(false);
  });

  it('returns zero writes for empty batch', async () => {
    const client = createMockServiceClient();
    const result = await writeIdentifierGraphFromScoredBatch([], client, {
      merchantId: MERCHANT_ID,
      sourceProvider: 'csv',
    });
    expect(result).toEqual({ identifiers: 0, edges: 0 });
    expect(client.rpc).not.toHaveBeenCalled();
  });
});

describe('writeIdentifierGraphFromSupportTicket', () => {
  it('writes gorgias provider edges with real merchant_id and canonical pairs', async () => {
    const client = createMockServiceClient();
    await writeIdentifierGraphFromSupportTicket(client, {
      merchantId: MERCHANT_ID,
      supportCaseId: '00000000-0000-4000-8000-000000000001',
      helpdeskTicketId: 'ticket-100',
      helpdeskCustomerId: 'cust-200',
      customerEmailHash: EMAIL_HASH,
      platformOrderId: 'shopify-order-300',
      sourceProvider: 'gorgias',
    });

    const edgeCall = client._rpcCalls.find((c) => c.fn === 'bulk_upsert_identifier_co_occurrence_edges');
    expect(edgeCall?.args.p_merchant_id).toBe(MERCHANT_ID);
    expect(edgeCall?.args.p_source_provider).toBe('gorgias');

    const edges = edgeCall!.args.p_edges as Array<{
      left_type: string;
      left_hash: string;
      right_type: string;
      right_hash: string;
    }>;
    expect(edges.length).toBe(3);
    expect(edges.every((e) => `${e.left_type}:${e.left_hash}` < `${e.right_type}:${e.right_hash}`)).toBe(true);
    expect(edges.some((e) => e.left_type === 'normalized_email_hash' && e.left_hash === EMAIL_HASH)).toBe(true);
  });

  it('never writes plaintext email to identifier_hash', async () => {
    const client = createMockServiceClient();
    await writeIdentifierGraphFromSupportTicket(client, {
      merchantId: MERCHANT_ID,
      supportCaseId: '00000000-0000-4000-8000-000000000002',
      helpdeskTicketId: 'ticket-101',
      helpdeskCustomerId: null,
      customerEmailHash: EMAIL_HASH,
      platformOrderId: null,
      sourceProvider: 'gorgias',
    });

    const idCall = client._rpcCalls.find((c) => c.fn === 'bulk_upsert_identity_identifiers');
    const identifiers = idCall!.args.p_identifiers as Array<{ identifier_hash: string }>;
    expect(identifiers.every((id) => !id.identifier_hash.includes('@'))).toBe(true);
    expect(identifiers.every((id) => id.identifier_hash === EMAIL_HASH || id.identifier_hash === 'ticket-101')).toBe(true);
  });
});
