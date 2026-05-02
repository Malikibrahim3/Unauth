import { addressClustering } from '@/lib/engine/signals/addressClustering';
import type { NormalisedOrder, ScoringContext } from '@/lib/engine/types';

function makeOrder(emailHash: string, addressHash: string | null, orderId = 'ORD'): NormalisedOrder {
  return {
    orderId,
    orderDate: new Date('2025-01-01'),
    emailHash,
    addressHash,
    phoneHash: null,
    customerNameNorm: 'test',
    orderTotal: 50,
    currency: 'GBP',
    orderStatus: 'completed',
    refundStatus: 'none',
    refundReason: null,
    refundDate: null,
    refundAmount: null,
    paymentMethod: null,
  };
}

function makeCtx(orders: NormalisedOrder[]): ScoringContext {
  return { allOrders: orders, customerOrderHistory: new Map() };
}

describe('addressClustering signal', () => {
  it('does not fire without an address hash', () => {
    const order = makeOrder('email-a', null);
    const ctx = makeCtx([order]);
    expect(addressClustering(order, ctx).fired).toBe(false);
  });

  it('does not fire when fewer than 3 distinct emails share address', () => {
    const orders = [
      makeOrder('email-a', 'addr-1', '1'),
      makeOrder('email-b', 'addr-1', '2'),
    ];
    const ctx = makeCtx(orders);
    expect(addressClustering(orders[0], ctx).fired).toBe(false);
  });

  it('fires when 3+ distinct emails share an address', () => {
    const orders = [
      makeOrder('email-a', 'addr-1', '1'),
      makeOrder('email-b', 'addr-1', '2'),
      makeOrder('email-c', 'addr-1', '3'),
    ];
    const ctx = makeCtx(orders);
    const result = addressClustering(orders[0], ctx);
    expect(result.fired).toBe(true);
    expect(result.score).toBe(30);
  });

  it('increases score with more distinct emails', () => {
    const orders = Array.from({ length: 6 }, (_, i) =>
      makeOrder(`email-${i}`, 'addr-1', String(i))
    );
    const ctx = makeCtx(orders);
    const result = addressClustering(orders[0], ctx);
    expect(result.fired).toBe(true);
    expect(result.score).toBe(60);
  });
});
