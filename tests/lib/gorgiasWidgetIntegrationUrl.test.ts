import {
  buildGorgiasWidgetIntegrationUrl,
  gorgiasWidgetUrlCacheBust,
  withWidgetUrlCacheBust,
} from '@/lib/support/gorgias/registerSidebarWidget';

jest.mock('@/lib/utils/env', () => ({
  env: { NEXT_PUBLIC_APP_URL: 'https://app.unauth.test' },
}));

describe('gorgias widget integration URL', () => {
  const originalSha = process.env.VERCEL_GIT_COMMIT_SHA;

  afterEach(() => {
    if (originalSha === undefined) {
      delete process.env.VERCEL_GIT_COMMIT_SHA;
    } else {
      process.env.VERCEL_GIT_COMMIT_SHA = originalSha;
    }
  });

  it('buildGorgiasWidgetIntegrationUrl keeps the email placeholder unencoded', () => {
    process.env.VERCEL_GIT_COMMIT_SHA = 'abcdef1234567890';
    const url = buildGorgiasWidgetIntegrationUrl('https://app.unauth.test/', 'unauth_wt_x');
    expect(url).toContain('email={{ticket.sender.email}}');
    expect(url).toContain('customer_email={{ticket.customer.email}}');
    expect(url).toContain('ticket_id={{ticket.id}}');
    expect(url).not.toContain('%7B%7B');
    expect(url).toContain('_cb=abcdef1');
  });

  it('withWidgetUrlCacheBust replaces an existing _cb without touching the email placeholder', () => {
    const base =
      'https://app.unauth.test/api/gorgias/widget?widget_token=t&email={{ticket.customer.email}}';
    expect(withWidgetUrlCacheBust(`${base}&_cb=old`, 'newbust')).toBe(`${base}&_cb=newbust`);
    expect(gorgiasWidgetUrlCacheBust()).toBe('dev');
  });
});
