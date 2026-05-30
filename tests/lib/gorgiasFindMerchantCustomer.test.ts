import { findMerchantCustomerByEmail } from '@/lib/gorgias/findMerchantCustomerByEmail';

describe('findMerchantCustomerByEmail', () => {
  it('matches primary_email or emails array after merchant_ids jsonb contains', async () => {
    const profiles = [
      {
        id: 'profile-other',
        risk_level: 'high',
        risk_score: 90,
        fraud_flags: [],
        identity_confidence_grade: null,
        primary_email: 'other@example.com',
        emails: ['other@example.com'],
        merchant_ids: ['merchant-1'],
      },
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

    const supabase = {
      from: () => ({
        select: () => ({
          contains: (_col: string, merchantIds: string[]) => {
            expect(merchantIds).toEqual(['merchant-1']);
            return {
              order: async () => ({
                data: profiles.filter((p) =>
                  (p.merchant_ids as string[]).some((id) => merchantIds.includes(id))
                ),
                error: null,
              }),
            };
          },
        }),
      }),
    };

    const row = await findMerchantCustomerByEmail(
      supabase as never,
      'merchant-1',
      'simeonmurray123@gmail.com'
    );

    expect(row).toEqual({
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

    const supabase = {
      from: () => ({
        select: () => ({
          contains: () => ({
            order: async () => ({ data: profiles, error: null }),
          }),
        }),
      }),
    };

    const row = await findMerchantCustomerByEmail(
      supabase as never,
      'merchant-1',
      'simeonmurray123@gmail.com'
    );

    expect(row?.id).toBe('profile-2');
  });
});
