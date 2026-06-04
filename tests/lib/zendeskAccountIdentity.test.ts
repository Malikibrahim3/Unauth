import {
  normalizeZendeskSubdomain,
  zendeskBaseUrlFromSubdomain,
} from '@/lib/support/zendesk/accountIdentity';

describe('zendesk account identity', () => {
  it('normalizes full hostnames to subdomain', () => {
    expect(normalizeZendeskSubdomain('Acme.Zendesk.com')).toBe('acme');
    expect(zendeskBaseUrlFromSubdomain('acme')).toBe('https://acme.zendesk.com');
  });

  it('accepts bare subdomain', () => {
    expect(normalizeZendeskSubdomain('acme')).toBe('acme');
  });
});
