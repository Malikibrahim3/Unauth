import { woocommerceOrderToCsvRow } from '@/lib/commerce/woocommerce/woocommerceOrderToCsvRow';

describe('woocommerceOrderToCsvRow', () => {
  it('maps a minimal order with billing email', () => {
    const row = woocommerceOrderToCsvRow(
      {
        id: 1001,
        date_created: '2024-06-01T12:00:00',
        total: '49.99',
        currency: 'GBP',
        status: 'processing',
        billing: { email: 'buyer@example.com', phone: '+441234567890' },
      },
      null,
    );

    expect(row).toMatchObject({
      order_id: '1001',
      customer_email: 'buyer@example.com',
      order_total: '49.99',
      currency: 'GBP',
    });
  });

  it('returns null without email', () => {
    expect(
      woocommerceOrderToCsvRow(
        { id: 1, date_created: '2024-06-01T12:00:00', billing: { email: '' } },
        null,
      ),
    ).toBeNull();
  });
});
