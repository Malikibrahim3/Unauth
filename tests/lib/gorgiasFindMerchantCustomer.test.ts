import { readFileSync } from 'fs';
import path from 'path';
import { findMerchantCustomerByEmail } from '@/lib/gorgias/findMerchantCustomerByEmail';
import { gorgiasWidgetModelToJson } from '@/lib/gorgias/widgetJson';

const KNOWN_MERCHANT_ID = 'af070af9-df1a-46ba-89f8-29409926ef61';
const KNOWN_EMAIL = 'simeonmurray123@gmail.com';

function makeSupabase(profiles: Array<Record<string, unknown>>) {
  const containsCalls: Array<{ column: string; value: unknown }> = [];
  const rpcCalls: string[] = [];

  const client = {
    from: (table: string) => {
      if (table !== 'customer_profiles') throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: async (_col: string, email: string) => ({
            data: profiles.filter((p) => p.primary_email === email),
            error: null,
          }),
          contains: async (column: string, value: unknown) => {
            containsCalls.push({ column, value });
            return { data: [], error: null };
          },
        }),
      };
    },
    rpc: async (fn: string, args: { p_email?: string | null }) => {
      rpcCalls.push(fn);
      if (fn !== 'search_customer_profiles') throw new Error(`unexpected rpc ${fn}`);
      const email = args.p_email ?? '';
      return {
        data: profiles.filter(
          (p) =>
            Array.isArray(p.emails) &&
            (p.emails as string[]).some((entry) => entry === email)
        ),
        error: null,
      };
    },
    _containsCalls: containsCalls,
    _rpcCalls: rpcCalls,
  };

  return client;
}

describe('findMerchantCustomerByEmail', () => {
  it('does not use PostgREST contains on emails jsonb in lookup source', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'lib/gorgias/findMerchantCustomerByEmail.ts'),
      'utf8'
    );
    expect(source).not.toMatch(/\.contains\s*\(\s*['"]emails['"]/);
  });

  it('matches primary_email with merchant scope and maps to Gorgias merchant_profile JSON', async () => {
    const profiles = [
      {
        id: '6ac24686-2fd4-4a27-9eb3-cb1751a9548c',
        risk_level: 'medium',
        risk_score: 28.30909090908227,
        fraud_flags: ['velocity', 'paymentChurn'],
        identity_confidence_grade: null,
        primary_email: KNOWN_EMAIL,
        emails: ['simeonmurray123@hotmail.com', KNOWN_EMAIL],
        merchant_ids: [KNOWN_MERCHANT_ID],
      },
    ];

    const supabase = makeSupabase(profiles);
    const { customer } = await findMerchantCustomerByEmail(
      supabase as never,
      KNOWN_MERCHANT_ID,
      KNOWN_EMAIL
    );

    expect(customer).toEqual({
      id: '6ac24686-2fd4-4a27-9eb3-cb1751a9548c',
      risk_level: 'medium',
      risk_score: 28.30909090908227,
      fraud_flags: ['velocity', 'paymentChurn'],
      identity_confidence_grade: null,
    });

    expect(supabase._rpcCalls).toContain('search_customer_profiles');
    expect(supabase._containsCalls).toHaveLength(0);

    const json = gorgiasWidgetModelToJson({
      state: 'merchant_profile',
      profileId: customer!.id,
      riskLevel: customer!.risk_level,
      riskScore: customer!.risk_score,
      fraudFlags: customer!.fraud_flags,
      identityConfidenceGrade: customer!.identity_confidence_grade,
      profileUrl: null,
    });

    expect(json).toEqual({
      risk_level: 'MEDIUM',
      identity_confidence_grade: 'N/A',
      match_score: '28',
      fraud_flags: 'velocity, paymentChurn',
    });
  });

  it('matches email only in emails array via search_customer_profiles RPC when primary_email differs', async () => {
    const profiles = [
      {
        id: 'profile-2',
        risk_level: 'low',
        risk_score: 10,
        fraud_flags: [],
        identity_confidence_grade: null,
        primary_email: 'simeonmurray123@hotmail.com',
        emails: ['simeonmurray123@hotmail.com', KNOWN_EMAIL],
        merchant_ids: [KNOWN_MERCHANT_ID],
      },
    ];

    const supabase = makeSupabase(profiles);
    const { customer } = await findMerchantCustomerByEmail(
      supabase as never,
      KNOWN_MERCHANT_ID,
      KNOWN_EMAIL
    );

    expect(customer?.id).toBe('profile-2');
    expect(supabase._rpcCalls).toContain('search_customer_profiles');
    expect(supabase._containsCalls).toHaveLength(0);
  });

  it('excludes profiles for other merchants', async () => {
    const profiles = [
      {
        id: 'profile-other',
        risk_level: 'high',
        risk_score: 99,
        fraud_flags: [],
        identity_confidence_grade: null,
        primary_email: KNOWN_EMAIL,
        emails: [KNOWN_EMAIL],
        merchant_ids: ['other-merchant'],
      },
    ];

    const supabase = makeSupabase(profiles);
    const { customer, diagnostics } = await findMerchantCustomerByEmail(
      supabase as never,
      KNOWN_MERCHANT_ID,
      KNOWN_EMAIL
    );

    expect(customer).toBeNull();
    expect(diagnostics.merchantScopedRows).toBe(0);
    expect(supabase._containsCalls).toHaveLength(0);
  });
});
