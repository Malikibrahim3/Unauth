import type { SupabaseClient } from '@supabase/supabase-js';
import { performV1Lookup } from '@/lib/api/v1/lookup';

function mockService(rpcRows: unknown[]): SupabaseClient {
  return {
    rpc: jest.fn(async (name: string) => {
      if (name === 'increment_lookup_count') {
        return { data: 1, error: null };
      }
      if (name === 'search_customer_profiles') {
        return { data: rpcRows, error: null };
      }
      return { data: null, error: null };
    }),
    from: jest.fn((table: string) => {
      if (table === 'access_audit_log') {
        return { insert: jest.fn().mockResolvedValue({ error: null }) };
      }
      return { insert: jest.fn().mockResolvedValue({ error: null }) };
    }),
  } as unknown as SupabaseClient;
}

describe('performV1Lookup k-anonymity defense in depth', () => {
  it('returns 404 same as no-match when profile is below k threshold', async () => {
    const service = mockService([
      {
        id: 'profile-sub-k',
        primary_email: 'a@example.com',
        risk_score: 80,
        fraud_flags: ['refundRate'],
        total_merchants_seen_at: 2,
        merchant_ids: ['m1', 'm2'],
        total_refund_claims: 1,
      },
    ]);

    const result = await performV1Lookup(
      service,
      { merchantId: 'merchant-a', apiKeyId: 'key-1', requestIp: '127.0.0.1' },
      {
        rawEmail: 'test@example.com',
        rawName: '',
        rawAddress: '',
        rawCard: '',
        rawIp: '',
      }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
      expect(result.error).toBe('No matching identity found');
    }
  });
});
