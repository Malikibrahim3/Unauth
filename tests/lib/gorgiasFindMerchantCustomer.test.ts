import { findMerchantCustomerByEmail } from '@/lib/gorgias/findMerchantCustomerByEmail';

describe('findMerchantCustomerByEmail', () => {
  it('matches primary_email or emails array with merchant_ids scope', async () => {
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

    const supabase = {
      from: () => ({
        select: () => ({
          contains: (_col: string, merchantIds: string[]) => {
            expect(merchantIds).toEqual(['merchant-1']);
            return {
              or: (filter: string) => {
                expect(filter).toContain('primary_email.eq.simeonmurray123@gmail.com');
                expect(filter).toContain('emails.cs.');
                return {
                  order: () => ({
                    limit: async () => ({
                      data: profiles.filter((p) => p.merchant_ids.some((id) => merchantIds.includes(id))),
                      error: null,
                    }),
                  }),
                };
              },
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
});
