import { resolveClaimSourceCustomerId } from '@/lib/claims/customerContext';

describe('resolveClaimSourceCustomerId', () => {
  it('resolves the source customer through the claim order within the merchant scope', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { source_customer_id: 'source-customer-1' },
      error: null,
    });
    const merchantEq = jest.fn(() => ({ maybeSingle }));
    const orderEq = jest.fn(() => ({ eq: merchantEq }));
    const select = jest.fn(() => ({ eq: orderEq }));
    const from = jest.fn(() => ({ select }));

    await expect(resolveClaimSourceCustomerId(
      { from } as never,
      'merchant-1',
      'order-1',
    )).resolves.toBe('source-customer-1');

    expect(from).toHaveBeenCalledWith('source_orders');
    expect(select).toHaveBeenCalledWith('source_customer_id');
    expect(orderEq).toHaveBeenCalledWith('id', 'order-1');
    expect(merchantEq).toHaveBeenCalledWith('merchant_id', 'merchant-1');
  });

  it('does not query when the case has no source order', async () => {
    const from = jest.fn();
    await expect(resolveClaimSourceCustomerId(
      { from } as never,
      'merchant-1',
      null,
    )).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });
});
