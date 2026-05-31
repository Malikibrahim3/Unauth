import { deriveCanonicalCommerceOrderStats } from '@/lib/customers/commerceOrders';

describe('deriveCanonicalCommerceOrderStats', () => {
  it('uses verified Shopify rows before audit/profile counts', () => {
    const stats = deriveCanonicalCommerceOrderStats({
      shopifyOrderCount: 10,
      shopifyTotalValue: 10334.51,
      auditTransactions: Array.from({ length: 14 }, (_, i) => ({
        order_id: `T-${i + 1}`,
        order_value: 100,
      })),
      profileTotalOrders: 14,
    });

    expect(stats).toEqual({
      orderCount: 10,
      totalValue: 10334.51,
      source: 'shopify',
    });
  });

  it('falls back to distinct CSV/audit order rows when no integration count exists', () => {
    const stats = deriveCanonicalCommerceOrderStats({
      shopifyOrderCount: 0,
      shopifyTotalValue: 0,
      auditTransactions: [
        { order_id: 'WC-1001', order_value: 40 },
        { order_id: 'WC-1001', order_value: 40 },
        { order_id: 'WC-1002', order_value: 60 },
      ],
      profileTotalOrders: 9,
    });

    expect(stats).toEqual({
      orderCount: 2,
      totalValue: 100,
      source: 'audit_transactions',
    });
  });
});
