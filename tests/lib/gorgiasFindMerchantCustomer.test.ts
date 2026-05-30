import { findMerchantCustomerByEmail } from '@/lib/gorgias/findMerchantCustomerByEmail';

function makeSupabase(profiles: Array<Record<string, unknown>>) {
  return {
    from: (table: string) => {
      if (table !== 'customer_profiles') throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: async (_col: string, email: string) => ({
            data: profiles.filter((p) => p.primary_email === email),
            error: null,
          }),
        }),
      };
    },
    rpc: async (fn: string, args: { p_email?: string | null }) => {
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
  };
}

describe('findMerchantCustomerByEmail', () => {
  it('matches primary_email with merchant scope in TypeScript', async () => {
    const profiles = [
      {
        id: 'profile-1',
        risk_level: 'medium',
        risk_score: 28.3,
        fraud_flags: ['velocity', 'paymentChurn'],
        identity_confidence_grade: null,
        primary_email: 'simeonmurray123@gmail.com',
        emails: ['simeonmurray123@hotmail.com', 'simeonmurray123@gmail.com'],
        merchant_ids: ['merchant-1'],
      },
    ];

    const { customer } = await findMerchantCustomerByEmail(
      makeSupabase(profiles) as never,
      'merchant-1',
      'simeonmurray123@gmail.com'
    );

    expect(customer).toEqual({
      id: 'profile-1',
      risk_level: 'medium',
      risk_score: 28.3,
      fraud_flags: ['velocity', 'paymentChurn'],
      identity_confidence_grade: null,
    });
  });

  it('matches email only in emails array when primary_email differs', async () => {
    const profiles = [
      {
        id: 'profile-2',
        risk_level: 'low',
        risk_score: 10,
        fraud_flags: [],
        identity_confidence_grade: null,
        primary_email: 'simeonmurray123@hotmail.com',
        emails: ['simeonmurray123@hotmail.com', 'simeonmurray123@gmail.com'],
        merchant_ids: ['merchant-1'],
      },
    ];

    const { customer } = await findMerchantCustomerByEmail(
      makeSupabase(profiles) as never,
      'merchant-1',
      'simeonmurray123@gmail.com'
    );

    expect(customer?.id).toBe('profile-2');
  });

  it('excludes profiles for other merchants', async () => {
    const profiles = [
      {
        id: 'profile-other',
        risk_level: 'high',
        risk_score: 99,
        fraud_flags: [],
        identity_confidence_grade: null,
        primary_email: 'simeonmurray123@gmail.com',
        emails: ['simeonmurray123@gmail.com'],
        merchant_ids: ['other-merchant'],
      },
    ];

    const { customer, diagnostics } = await findMerchantCustomerByEmail(
      makeSupabase(profiles) as never,
      'merchant-1',
      'simeonmurray123@gmail.com'
    );

    expect(customer).toBeNull();
    expect(diagnostics.merchantScopedRows).toBe(0);
  });
});
