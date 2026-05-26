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
    orderTotal: 120,
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

describe('postDeliveryClaimRate signal', () => {
  it('1) 10 delivered orders, 4 post-delivery INR claims -> high signal', () => {
    const e = 'pd1';
    const orders: NormalisedOrder[] = [];
    for (let i = 0; i < 10; i++) {
      const inr = i < 4;
      orders.push(mk(`S1-${i}`, e, `2025-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`, {
        refundReason: inr ? 'inr' : null,
        refundRequested: inr ? true : false,
        refundStatus: inr ? 'full' : 'none',
        refundDate: inr ? new Date(`2025-01-${String(i + 1).padStart(2, '0')}T16:00:00Z`) : null,
      }));
    }
    const scored = scoreOrders(orders);
    const sig = scored[9].signals.find((s) => s.name === 'postDeliveryClaimRate');
    expect(sig?.fired).toBe(true);
    expect((sig?.score ?? 0) >= 60).toBe(true);
  });

  it('2) 1 delivered order, 1 INR claim -> not high due to smoothing/min evidence', () => {
    const scored = scoreOrders([
      mk('S2-1', 'pd2', '2025-02-01T10:00:00Z', {
        refundReason: 'inr',
        refundRequested: true,
        refundStatus: 'full',
        refundDate: new Date('2025-02-01T18:00:00Z'),
      }),
    ]);
    const sig = scored[0].signals.find((s) => s.name === 'postDeliveryClaimRate');
    expect(sig?.fired).toBe(false);
    expect(scored[0].riskTier === 'low' || scored[0].riskTier === 'medium').toBe(true);
  });

  it('3) claims without delivery evidence are excluded', () => {
    const e = 'pd3';
    const orders = [
      mk('S3-1', e, '2025-03-01T10:00:00Z', { refundReason: 'inr', refundRequested: true, refundStatus: 'full', deliveryStatus: 'unknown', deliveredAt: null }),
      mk('S3-2', e, '2025-03-02T10:00:00Z', { refundReason: 'inr', refundRequested: true, refundStatus: 'full', deliveryStatus: 'unknown', deliveredAt: null }),
      mk('S3-3', e, '2025-03-03T10:00:00Z', { deliveryStatus: 'unknown', deliveredAt: null }),
    ];
    const scored = scoreOrders(orders);
    const sig = scored[2].signals.find((s) => s.name === 'postDeliveryClaimRate');
    expect(sig?.fired).toBe(false);
  });

  it('4) loyal delivered-heavy customer with 1 INR stays low', () => {
    const e = 'pd4';
    const orders: NormalisedOrder[] = [];
    for (let i = 0; i < 30; i++) {
      const inr = i === 0;
      orders.push(mk(`S4-${i}`, e, `2024-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}T10:00:00Z`, {
        refundReason: inr ? 'inr' : null,
        refundRequested: inr ? true : false,
        refundStatus: inr ? 'full' : 'none',
      }));
    }
    const scored = scoreOrders(orders);
    expect(scored[29].riskTier !== 'high' && scored[29].riskTier !== 'critical').toBe(true);
  });

  it('5) repeated post-delivery INR + linked address evidence -> high/critical', () => {
    const ringA = 'ringA';
    const ringB = 'ringB';
    const orders: NormalisedOrder[] = [];
    for (let i = 0; i < 5; i++) {
      orders.push(mk(`S5A-${i}`, ringA, `2025-04-${String(i + 1).padStart(2, '0')}T10:00:00Z`, {
        addressHash: 'shared-addr',
        refundReason: 'inr',
        refundRequested: true,
        refundStatus: 'full',
        refundDate: new Date(`2025-04-${String(i + 1).padStart(2, '0')}T20:00:00Z`),
      }));
    }
    for (let i = 0; i < 3; i++) {
      orders.push(mk(`S5B-${i}`, ringB, `2025-04-${String(i + 6).padStart(2, '0')}T10:00:00Z`, {
        addressHash: 'shared-addr',
      }));
    }
    const scored = scoreOrders(orders);
    const target = scored.find((s) => s.order.orderId === 'S5A-4')!;
    expect(['high', 'critical']).toContain(target.riskTier);
  });
});
