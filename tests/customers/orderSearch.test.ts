import { isOrderReferenceSearchTerm, orderReferenceIlike } from '@/lib/customers/orderSearch';

describe('customer order-reference search helpers', () => {
  it('detects full and partial order references without treating names as orders', () => {
    expect(isOrderReferenceSearchTerm('ORD-2025-00341')).toBe(true);
    expect(isOrderReferenceSearchTerm('00341')).toBe(true);
    expect(isOrderReferenceSearchTerm('Mehta')).toBe(false);
    expect(isOrderReferenceSearchTerm('tom.walsh')).toBe(false);
  });

  it('strips wildcard characters before building the scoped ilike pattern', () => {
    expect(orderReferenceIlike(' ORD-2025-%00341_ ')).toBe('%ORD-2025-00341%');
  });
});
