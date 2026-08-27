import { providerResponseSchema } from '@/lib/recoveries/providerResponses';

describe('provider response recording contract', () => {
  it('rejects credited money because provider position is not receipt authority', () => {
    const result = providerResponseSchema.safeParse({
      recovery_case_id: '11111111-1111-4111-8111-111111111111',
      provider: 'Northline Courier',
      liability_position: 'accepted',
      compensation_state: 'credited',
      approved_amount_minor: 1000,
      credited_amount_minor: 1000,
    });
    expect(result.success).toBe(false);
  });

  it('keeps no-admission distinct from acceptance and does not require a provider API reference', () => {
    const result = providerResponseSchema.safeParse({
      recovery_case_id: '11111111-1111-4111-8111-111111111111',
      provider: 'Northline Courier',
      liability_position: 'no_admission',
      compensation_state: 'not_decided',
    });
    expect(result.success).toBe(true);
  });
});
