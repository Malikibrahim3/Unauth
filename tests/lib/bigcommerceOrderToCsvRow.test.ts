import { bigcommerceOrderToCsvRow } from '@/lib/commerce/bigcommerce/bigcommerceOrderToCsvRow';

describe('bigcommerceOrderToCsvRow', () => {
  it('maps a minimal order with billing email', () => {
    const row = bigcommerceOrderToCsvRow(
      {
        id: 2001,
        date_created: 'Mon, 01 Jun 2024 12:00:00 +0000',
        total_inc_tax: '99.00',
        currency_code: 'USD',
        status: 'Awaiting Fulfillment',
        billing_address: { email: 'buyer@example.com', phone: '555-0100' },
      },
      null,
    );

    expect(row).toMatchObject({
      order_id: '2001',
      customer_email: 'buyer@example.com',
      order_total: '99.00',
      currency: 'USD',
    });
  });

  it('returns null without email', () => {
    expect(
      bigcommerceOrderToCsvRow(
        { id: 1, date_created: 'Mon, 01 Jun 2024 12:00:00 +0000', billing_address: { email: '' } },
        null,
      ),
    ).toBeNull();
  });
});
