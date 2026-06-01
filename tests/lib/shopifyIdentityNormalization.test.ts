import { normalizeAddress, normalizeEmail, normalizePhone } from '@/lib/shopify/identity';

describe('Shopify identity normalization', () => {
  it('uses the shared Gmail email canonical form at ingest time', () => {
    expect(normalizeEmail('M.A.L.I.K+shopping@Gmail.com')).toBe('malik@gmail.com');
    expect(normalizeEmail('first.last+team@example.com')).toBe('first.last+team@example.com');
  });

  it('stores phones in E.164 form', () => {
    expect(normalizePhone('(+1) 555-123-4567')).toBe('+15551234567');
    expect(normalizePhone('07700 900123')).toBe('+447700900123');
  });

  it('canonicalizes secondary unit address variants without recipient names', () => {
    const unit = normalizeAddress({
      name: 'Jane Customer',
      address1: '123 Main St Apt 4',
      city: 'Austin',
      province: 'TX',
      zip: '78701',
      country: 'US',
    });
    const hash = normalizeAddress({
      name: 'Another Person',
      address1: '123 Main Street #4',
      city: 'Austin',
      province: 'TX',
      zip: '78701',
      country: 'US',
    });

    expect(unit).toBe(hash);
    expect(unit).not.toContain('jane');
    expect(unit).not.toContain('another');
  });
});
