import {
  shopifyOrderToCsvRow,
  type ShopifyOrderSignalRow,
} from '@/lib/shopify/shopifyOrderToCsvRow';

describe('shopifyOrderToCsvRow', () => {
  const baseSignal: ShopifyOrderSignalRow = {
    shop_domain: 'acme.myshopify.com',
    shopify_order_id: '12345',
    created_at_shopify: '2026-05-26T16:48:08+00:00',
    total_price: 99.5,
    currency: 'USD',
    financial_status: 'paid',
    fulfillment_status: 'fulfilled',
    refunds_count: 0,
    payment_gateway_names: ['shopify_payments'],
    shipping_country: 'US',
  };

  it('maps signal + identity to CSV row shape', () => {
    const row = shopifyOrderToCsvRow(baseSignal, {
      email: 'buyer@example.com',
      shipping_address: '1 Main St, London, GB',
      billing_address: '1 Main St, London, GB',
      customer_id: '9988',
    });

    expect(row).not.toBeNull();
    expect(row?.order_id).toBe('12345');
    expect(row?.customer_email).toBe('buyer@example.com');
    expect(row?.order_total).toBe('99.5');
    expect(row?.currency).toBe('USD');
    expect(row?.order_status).toBe('completed');
    expect(row?.delivery_status).toBe('delivered');
    expect(row?.payment_method).toBe('shopify_payments');
    expect(row?.account_id).toBe('9988');
  });

  it('returns null without customer email', () => {
    expect(shopifyOrderToCsvRow(baseSignal, { email: null })).toBeNull();
  });

  it('maps refunded financial status', () => {
    const row = shopifyOrderToCsvRow(
      { ...baseSignal, financial_status: 'refunded', refunds_count: 1 },
      { email: 'buyer@example.com' }
    );
    expect(row?.order_status).toBe('refunded');
    expect(row?.refund_status).toBe('full');
  });
});
