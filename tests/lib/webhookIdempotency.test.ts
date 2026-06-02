import { buildWebhookIdempotencyKey } from '@/lib/commerce/webhookIdempotency';

describe('buildWebhookIdempotencyKey', () => {
  it('builds platform:store:native id', () => {
    expect(buildWebhookIdempotencyKey('woocommerce', 'store.example.com', '42')).toBe(
      'woocommerce:store.example.com:42',
    );
  });

  it('throws when parts are empty', () => {
    expect(() => buildWebhookIdempotencyKey('', 'store.example.com', '1')).toThrow(
      'webhook_idempotency_key_invalid',
    );
  });
});
