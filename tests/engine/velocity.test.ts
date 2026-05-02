import { velocity } from '@/lib/engine/signals/velocity';
import type { NormalisedOrder, ScoringContext } from '@/lib/engine/types';

function makeOrder(overrides: Partial<NormalisedOrder> = {}): NormalisedOrder {
  return {
    orderId: 'ORD-001',
    orderDate: new Date('2025-01-01T10:00:00Z'),
    emailHash: 'hash-a',
    addressHash: 'addr-a',
    phoneHash: null,
    customerNameNorm: 'test user',
    orderTotal: 50,
    currency: 'GBP',
    orderStatus: 'completed',
    refundStatus: 'none',
    refundReason: null,
    refundDate: null,
    refundAmount: null,
    paymentMethod: 'card',
    ...overrides,
  };
}

function makeContext(orders: NormalisedOrder[]): ScoringContext {
  const customerOrderHistory = new Map<string, NormalisedOrder[]>();
  for (const o of orders) {
    const arr = customerOrderHistory.get(o.emailHash) ?? [];
    arr.push(o);
    customerOrderHistory.set(o.emailHash, arr);
  }
  return { allOrders: orders, customerOrderHistory };
}

describe('velocity signal', () => {
  it('does not fire for fewer than 3 orders', () => {
    const orders = [
      makeOrder({ orderId: '1', orderDate: new Date('2025-01-01T10:00:00Z') }),
      makeOrder({ orderId: '2', orderDate: new Date('2025-01-01T12:00:00Z') }),
    ];
    const ctx = makeContext(orders);
    const result = velocity(orders[0], ctx);
    expect(result.fired).toBe(false);
  });

  it('fires when 3+ orders are placed within 24 hours', () => {
    const base = new Date('2025-01-01T10:00:00Z');
    const orders = [
      makeOrder({ orderId: '1', orderDate: new Date(base.getTime() + 0) }),
      makeOrder({ orderId: '2', orderDate: new Date(base.getTime() + 1000 * 60 * 60 * 2) }),
      makeOrder({ orderId: '3', orderDate: new Date(base.getTime() + 1000 * 60 * 60 * 4) }),
    ];
    const ctx = makeContext(orders);
    const result = velocity(orders[0], ctx);
    expect(result.fired).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  it('does not fire when orders are spread over multiple days', () => {
    const orders = [
      makeOrder({ orderId: '1', orderDate: new Date('2025-01-01T10:00:00Z') }),
      makeOrder({ orderId: '2', orderDate: new Date('2025-01-03T10:00:00Z') }),
      makeOrder({ orderId: '3', orderDate: new Date('2025-01-05T10:00:00Z') }),
    ];
    const ctx = makeContext(orders);
    const result = velocity(orders[0], ctx);
    expect(result.fired).toBe(false);
  });

  it('score caps at 90 for very high velocity', () => {
    const base = new Date('2025-01-01T10:00:00Z');
    const orders = Array.from({ length: 20 }, (_, i) =>
      makeOrder({ orderId: String(i), orderDate: new Date(base.getTime() + i * 1000 * 60) })
    );
    const ctx = makeContext(orders);
    const result = velocity(orders[0], ctx);
    expect(result.fired).toBe(true);
    expect(result.score).toBeLessThanOrEqual(90);
  });
});
