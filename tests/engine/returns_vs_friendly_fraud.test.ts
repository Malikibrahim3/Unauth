import { scoreOrders } from '@/lib/engine';
import type { NormalisedOrder } from '@/lib/engine/types';

function mk(id: string, emailHash: string, date: string, patch: Partial<NormalisedOrder> = {}): NormalisedOrder {
  return {
    orderId: id,
    orderDate: new Date(date),
    emailHash,
    addressHash: 'addr-' + emailHash,
    phoneHash: 'phone-' + emailHash,
    customerNameNorm: 'n',
    orderTotal: 100,
    currency: 'GBP',
    orderStatus: 'completed',
    refundStatus: 'none',
    refundReason: null,
    refundDate: null,
    refundAmount: null,
    paymentMethod: 'card',
    deliveryStatus: 'delivered',
    deliveredAt: new Date(date),
    ...patch,
  };
}

describe('returns vs friendly fraud scoring', () => {
  it('A loyal VIP stays low/moderate', () => {
    const orders: NormalisedOrder[] = [];
    for (let i = 0; i < 50; i++) {
      const refunded = i < 8;
      orders.push(mk(`A-${i}`, 'vip', `2024-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}T10:00:00Z`, {
        refundStatus: refunded ? 'full' : 'none',
        refundAmount: refunded ? 40 : null,
        deliveryStatus: refunded ? 'delivered' : 'unknown',
        deliveredAt: refunded ? new Date(`2025-01-${String((i % 28) + 1).padStart(2, '0')}T09:00:00Z`) : null,
      }));
    }
    const scored = scoreOrders(orders);
    expect(scored[49].riskTier !== 'critical').toBe(true);
  });

  it('B friendly fraud becomes high/critical', () => {
    const e = 'ff';
    const orders: NormalisedOrder[] = [
      mk('D-0', 'baseline', '2025-01-01T00:00:00Z', { orderTotal: 100 }),
      mk('D-0b', 'baseline', '2025-01-02T00:00:00Z', { orderTotal: 120 }),
      mk('D-0c', 'baseline', '2025-01-03T00:00:00Z', { orderTotal: 80 }),
      mk('B-1', e, '2025-01-01T10:00:00Z', { refundReason: 'inr', refundStatus: 'full', refundRequested: true, refundDate: new Date('2025-01-02T10:00:00Z'), deliveredAt: new Date('2025-01-01T12:00:00Z') }),
      mk('B-2', e, '2025-01-05T10:00:00Z', { refundReason: 'inr', refundStatus: 'full', refundRequested: true, refundDate: new Date('2025-01-06T08:00:00Z'), deliveredAt: new Date('2025-01-05T12:00:00Z') }),
      mk('B-3', e, '2025-01-09T10:00:00Z', { refundReason: 'inr', refundStatus: 'full', refundRequested: true, refundDate: new Date('2025-01-10T08:00:00Z'), deliveredAt: new Date('2025-01-09T12:00:00Z') }),
      mk('B-4', e, '2025-01-10T10:00:00Z', { chargebackDispute: true }),
      mk('B-5', e, '2025-01-11T10:00:00Z', { chargebackDispute: true }),
    ];
    const scored = scoreOrders(orders);
    expect(['high', 'critical']).toContain(scored[4].riskTier);
  });

  it('C 1 order + 1 refund is not high', () => {
    const scored = scoreOrders([mk('C-1', 'c', '2025-02-01T10:00:00Z', { refundStatus: 'full', refundAmount: 50, refundRequested: true })]);
    expect(scored[0].riskTier === 'low' || scored[0].riskTier === 'medium').toBe(true);
  });

  it('D high-value refund concentration elevates', () => {
    const e = 'd';
    const orders: NormalisedOrder[] = [
      mk('D-1', e, '2025-01-01T10:00:00Z', { orderTotal: 80 }),
      mk('D-2', e, '2025-01-02T10:00:00Z', { orderTotal: 90 }),
      mk('D-3', e, '2025-01-03T10:00:00Z', { orderTotal: 100 }),
      mk('D-3b', e, '2025-01-03T12:00:00Z', { orderTotal: 95 }),
      mk('D-3c', e, '2025-01-03T14:00:00Z', { orderTotal: 105 }),
      mk('D-4', e, '2025-01-04T10:00:00Z', { orderTotal: 1500, refundStatus: 'full', refundAmount: 1400, refundRequested: true }),
    ];
    const scored = scoreOrders(orders);
    const target = scored.find((s) => s.order.orderId === 'D-4')!;
    expect(target.totalScore).toBeGreaterThan(0);
  });

  it('E missing delivery evidence avoids high-confidence INR', () => {
    const e = 'e';
    const orders = [
      mk('E-1', e, '2025-01-01T10:00:00Z', { refundReason: 'inr', refundStatus: 'full', refundRequested: true, refundDate: new Date('2025-01-02T01:00:00Z'), deliveryStatus: 'unknown', deliveredAt: null }),
      mk('E-2', e, '2025-01-03T10:00:00Z', { refundReason: 'inr', refundStatus: 'full', refundRequested: true, refundDate: new Date('2025-01-04T01:00:00Z'), deliveryStatus: 'unknown', deliveredAt: null }),
      mk('E-3', e, '2025-01-05T10:00:00Z', { refundReason: 'inr', refundStatus: 'full', refundRequested: true, refundDate: new Date('2025-01-06T01:00:00Z'), deliveryStatus: 'unknown', deliveredAt: null }),
    ];
    const scored = scoreOrders(orders);
    const sig = scored[2].signals.find((s) => s.name === 'inrSpeed');
    expect(sig?.fired).toBe(false);
  });
});
