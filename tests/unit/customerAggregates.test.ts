import {
  CustomerAggregateMismatch,
  aggregateCustomerOrders,
  assertAggregatesAgree,
} from '@/lib/customers/aggregates';

describe('customer aggregates', () => {
  it('derives every figure from the same linked orders', () => {
    const aggregates = aggregateCustomerOrders([
      { orderId: 'a', totalMinor: 8450, currency: 'GBP', processedAt: '2026-06-11T12:00:00.000Z' },
      { orderId: 'b', totalMinor: 10000, currency: 'GBP', processedAt: '2026-07-06T12:00:00.000Z' },
    ]);
    expect(aggregates).toMatchObject({
      orderCount: 2,
      lifetimeValueMinor: 18450,
      averageOrderValueMinor: 9225,
      currency: 'GBP',
      lastOrderAt: '2026-07-06T12:00:00.000Z',
    });
  });

  it('reports unavailable rather than zero for a customer with no orders', () => {
    const aggregates = aggregateCustomerOrders([]);
    expect(aggregates).toMatchObject({
      orderCount: 0,
      lifetimeValueMinor: null,
      averageOrderValueMinor: null,
      lastOrderAt: null,
    });
  });

  it('refuses a single lifetime value when orders span currencies', () => {
    const aggregates = aggregateCustomerOrders([
      { orderId: 'a', totalMinor: 1000, currency: 'GBP', processedAt: '2026-07-01T00:00:00.000Z' },
      { orderId: 'b', totalMinor: 2000, currency: 'EUR', processedAt: '2026-07-02T00:00:00.000Z' },
    ]);
    expect(aggregates.mixedCurrency).toBe(true);
    expect(aggregates.lifetimeValueMinor).toBeNull();
    expect(aggregates.orderCount).toBe(2);
  });

  it('counts orders without observed totals but excludes them from money', () => {
    const aggregates = aggregateCustomerOrders([
      { orderId: 'a', totalMinor: 5000, currency: 'GBP', processedAt: '2026-07-01T00:00:00.000Z' },
      { orderId: 'b', totalMinor: null, currency: 'GBP', processedAt: '2026-07-02T00:00:00.000Z' },
    ]);
    expect(aggregates.orderCount).toBe(2);
    expect(aggregates.lifetimeValueMinor).toBe(5000);
    expect(aggregates.excludedFromTotals).toBe(1);
  });

  it('detects registry/detail disagreements', () => {
    const registry = { orderCount: 7, lifetimeValueMinor: 1000, lastOrderAt: null };
    const detail = { orderCount: 3, lifetimeValueMinor: 1000, lastOrderAt: null };
    expect(() => assertAggregatesAgree('hero', registry, detail)).toThrow(CustomerAggregateMismatch);
  });
});
