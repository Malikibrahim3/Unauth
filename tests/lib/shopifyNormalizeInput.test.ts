import { normalizeShopInput } from '@/lib/shopify/normalizeShopInput';

describe('normalizeShopInput', () => {
  describe('admin.shopify.com URLs', () => {
    it('accepts admin.shopify.com/store/merchant-a', () => {
      expect(normalizeShopInput('admin.shopify.com/store/merchant-a')).toEqual({
        domain: 'merchant-a.myshopify.com',
        error: null,
      });
    });

    it('accepts admin.shopify.com/store/skims', () => {
      expect(normalizeShopInput('admin.shopify.com/store/skims')).toEqual({ domain: 'skims.myshopify.com', error: null });
    });

    it('accepts https://admin.shopify.com/store/skims', () => {
      expect(normalizeShopInput('https://admin.shopify.com/store/skims')).toEqual({ domain: 'skims.myshopify.com', error: null });
    });

    it('accepts trailing slash on admin URL', () => {
      expect(normalizeShopInput('https://admin.shopify.com/store/skims/')).toEqual({ domain: 'skims.myshopify.com', error: null });
    });

    it('accepts mixed case admin URL', () => {
      expect(normalizeShopInput('https://Admin.Shopify.com/store/SKIMS')).toEqual({ domain: 'skims.myshopify.com', error: null });
    });

    it('accepts admin URL with trailing path segments', () => {
      expect(normalizeShopInput('admin.shopify.com/store/skims/orders')).toEqual({ domain: 'skims.myshopify.com', error: null });
    });
  });

  describe('.myshopify.com URLs', () => {
    it('accepts merchant-a.myshopify.com', () => {
      expect(normalizeShopInput('merchant-a.myshopify.com')).toEqual({
        domain: 'merchant-a.myshopify.com',
        error: null,
      });
    });

    it('accepts skims.myshopify.com', () => {
      expect(normalizeShopInput('skims.myshopify.com')).toEqual({ domain: 'skims.myshopify.com', error: null });
    });

    it('accepts https://skims.myshopify.com', () => {
      expect(normalizeShopInput('https://skims.myshopify.com')).toEqual({ domain: 'skims.myshopify.com', error: null });
    });

    it('accepts https://skims.myshopify.com/', () => {
      expect(normalizeShopInput('https://skims.myshopify.com/')).toEqual({ domain: 'skims.myshopify.com', error: null });
    });

    it('accepts mixed case .myshopify.com', () => {
      expect(normalizeShopInput('SKIMS.myshopify.com')).toEqual({ domain: 'skims.myshopify.com', error: null });
    });

    it('accepts store names with hyphens', () => {
      expect(normalizeShopInput('my-brand-store.myshopify.com')).toEqual({ domain: 'my-brand-store.myshopify.com', error: null });
    });
  });

  describe('bare slug fallback', () => {
    it('accepts bare store slug', () => {
      expect(normalizeShopInput('skims')).toEqual({ domain: 'skims.myshopify.com', error: null });
    });

    it('accepts hyphenated bare slug', () => {
      expect(normalizeShopInput('my-brand')).toEqual({ domain: 'my-brand.myshopify.com', error: null });
    });
  });

  describe('public domain rejection', () => {
    it('rejects skims.com', () => {
      expect(normalizeShopInput('skims.com')).toEqual({ domain: null, error: 'public_domain' });
    });

    it('rejects www.skims.com', () => {
      expect(normalizeShopInput('www.skims.com')).toEqual({ domain: null, error: 'public_domain' });
    });

    it('rejects https://skims.com', () => {
      expect(normalizeShopInput('https://skims.com')).toEqual({ domain: null, error: 'public_domain' });
    });

    it('rejects shop.brand.com', () => {
      expect(normalizeShopInput('shop.brand.com')).toEqual({ domain: null, error: 'public_domain' });
    });
  });

  describe('empty/invalid inputs', () => {
    it('rejects empty string', () => {
      expect(normalizeShopInput('')).toEqual({ domain: null, error: 'empty' });
    });

    it('rejects whitespace-only string', () => {
      expect(normalizeShopInput('   ')).toEqual({ domain: null, error: 'empty' });
    });
  });

  describe('redirect URL generation', () => {
    it('generates correct install URL for admin.shopify.com input', () => {
      const result = normalizeShopInput('admin.shopify.com/store/skims');
      expect(result.error).toBeNull();
      if (result.error === null) {
        const url = `/api/shopify/install?shop=${encodeURIComponent(result.domain)}`;
        expect(url).toBe('/api/shopify/install?shop=skims.myshopify.com');
      }
    });
  });
});
