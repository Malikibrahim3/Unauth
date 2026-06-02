import {
  storeHashFromOAuthContext,
  storeHashFromWebhookProducer,
} from '@/lib/commerce/bigcommerce/normalizeStoreHash';

describe('normalizeStoreHash', () => {
  it('parses OAuth context', () => {
    expect(storeHashFromOAuthContext('stores/abc123xyz')).toBe('abc123xyz');
  });

  it('parses webhook producer', () => {
    expect(storeHashFromWebhookProducer('stores/abc123xyz')).toBe('abc123xyz');
  });

  it('returns null for invalid context', () => {
    expect(storeHashFromOAuthContext('invalid')).toBeNull();
  });
});
