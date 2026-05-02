import { inrAbuse } from '@/lib/engine/signals/inrAbuse';
import type { NormalisedOrder, ScoringContext } from '@/lib/engine/types';

function makeOrder(overrides: Partial<NormalisedOrder> = {}): NormalisedOrder {
  return {
    orderId: 'ORD-001',
    orderDate: new Date('2025-01-01T10:00:00Z'),
    emailHash: 'hash-a',
    addressHash: null,
    phoneHash: null,
    customerNameNorm: 'test user',
    orderTotal: 50,
    currency: 'GBP',
    orderStatus: 'refunded',
    refundStatus: 'full',
    refundReason: 'inr',
    refundDate: new Date('2025-01-03T10:00:00Z'),
    refundAmount: 50,
    paymentMethod: 'card',
    ...overrides,
  };
}

function makeContext(orders: NormalisedOrder[]): ScoringContext {
  const map = new Map<string, NormalisedOrder[]>();
  for (const o of orders) {
    const arr = map.get(o.emailHash) ?? [];
    arr.push(o);
    map.set(o.emailHash, arr);
  }
  return { allOrders: orders, customerOrderHistory: map };
}

describe('inrAbuse signal', () => {
  it('does not fire with 0 INR claims', () => {
    const orders = [makeOrder({ refundReason: 'damaged' })];
    const ctx = makeContext(orders);
    expect(inrAbuse(orders[0], ctx).fired).toBe(false);
  });

  it('does not fire with exactly 1 INR claim', () => {
    const orders = [makeOrder({ orderId: '1' })];
    const ctx = makeContext(orders);
    expect(inrAbuse(orders[0], ctx).fired).toBe(false);
  });

  it('fires with 2 INR claims at score 40', () => {
    const orders = [
      makeOrder({ orderId: '1' }),
      makeOrder({ orderId: '2' }),
    ];
    const ctx = makeContext(orders);
    const result = inrAbuse(orders[0], ctx);
    expect(result.fired).toBe(true);
    expect(result.score).toBe(40);
  });

  it('fires with 3 INR claims at score 70', () => {
    const orders = Array.from({ length: 3 }, (_, i) => makeOrder({ orderId: String(i) }));
    const ctx = makeContext(orders);
    const result = inrAbuse(orders[0], ctx);
    expect(result.fired).toBe(true);
    expect(result.score).toBe(70);
  });

  it('fires with 4+ INR claims at score 95', () => {
    const orders = Array.from({ length: 5 }, (_, i) => makeOrder({ orderId: String(i) }));
    const ctx = makeContext(orders);
    const result = inrAbuse(orders[0], ctx);
    expect(result.fired).toBe(true);
    expect(result.score).toBe(95);
  });
});
