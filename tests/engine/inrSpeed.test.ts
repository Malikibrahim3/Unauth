import { inrSpeed } from '@/lib/engine/signals/inrSpeed';
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
    refundDate: null,
    refundAmount: 50,
    paymentMethod: 'card',
    ...overrides,
  };
}

const emptyCtx: ScoringContext = { allOrders: [], customerOrderHistory: new Map() };

describe('inrSpeed signal', () => {
  it('does not fire when refund_reason is not inr', () => {
    const order = makeOrder({ refundReason: 'damaged', refundDate: new Date('2025-01-01T20:00:00Z') });
    expect(inrSpeed(order, emptyCtx).fired).toBe(false);
  });

  it('does not fire when no refund date', () => {
    const order = makeOrder({ refundDate: null });
    expect(inrSpeed(order, emptyCtx).fired).toBe(false);
  });

  it('fires when INR claimed within 48 hours of order', () => {
    const order = makeOrder({
      orderDate: new Date('2025-01-01T10:00:00Z'),
      refundDate: new Date('2025-01-02T09:00:00Z'),
    });
    const result = inrSpeed(order, emptyCtx);
    expect(result.fired).toBe(true);
    expect(result.score).toBe(80);
  });

  it('does not fire when INR claimed after 48 hours', () => {
    const order = makeOrder({
      orderDate: new Date('2025-01-01T10:00:00Z'),
      refundDate: new Date('2025-01-05T10:00:00Z'),
    });
    expect(inrSpeed(order, emptyCtx).fired).toBe(false);
  });
});
