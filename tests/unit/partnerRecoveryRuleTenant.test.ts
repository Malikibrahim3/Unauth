import { createPartnerRecoveryRule } from '@/lib/partners/store';

function query(result: { data: unknown; error: { message: string } | null }) {
  const chain = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue(result),
    insert: jest.fn(),
    single: jest.fn().mockResolvedValue(result),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  return chain;
}

const input = {
  merchant_id: '00000000-0000-0000-0000-000000000001',
  partner_id: '00000000-0000-0000-0000-000000000002',
  rule_name: 'Carrier claims',
  recovery_type: 'carrier_claim' as const,
  applies_to_claim_type: 'item_not_received' as const,
};

describe('partner recovery-rule tenant boundary', () => {
  it('rejects a partner that is not owned by the rule merchant', async () => {
    const partnerQuery = query({ data: null, error: null });
    const client = { from: jest.fn().mockReturnValue(partnerQuery) };

    await expect(createPartnerRecoveryRule(client as never, input)).rejects.toThrow(
      'Recovery partner does not belong to this merchant',
    );
    expect(partnerQuery.eq).toHaveBeenCalledWith('merchant_id', input.merchant_id);
  });

  it('creates the rule after validating the merchant-scoped partner', async () => {
    const partnerQuery = query({ data: { id: input.partner_id }, error: null });
    const created = { id: 'rule-id', ...input };
    const ruleQuery = query({ data: created, error: null });
    const client = {
      from: jest
        .fn()
        .mockReturnValueOnce(partnerQuery)
        .mockReturnValueOnce(ruleQuery),
    };

    await expect(createPartnerRecoveryRule(client as never, input)).resolves.toEqual(created);
    expect(ruleQuery.insert).toHaveBeenCalledTimes(1);
  });
});
