import { classifyDesktopSupport, safeDesktopReturnUrl, isResponsiveMarketingPath } from '@/lib/device/desktopSupport';

describe('desktop support classification', () => {
  it('limits responsive support to marketing paths', () => {
    for(const path of ['/', '/landing','/landing/data','/pricing','/legal/privacy'])expect(isResponsiveMarketingPath(path)).toBe(true);
    for(const path of ['/login','/signup','/demo','/onboarding','/overview','/legalish'])expect(isResponsiveMarketingPath(path)).toBe(false);
  });
  it('preserves valid plan and safe destination without credentials', () => {
    expect(safeDesktopReturnUrl({origin:'https://app.example.test',pathname:'/signup',search:'?plan=pro&next=%2Fcases%3Ftoken%3Dsecret&access_token=secret'})).toBe('https://app.example.test/signup?plan=pro&next=%2Fcases');
    expect(safeDesktopReturnUrl({origin:'https://app.example.test',pathname:'/login',search:'?plan=made-up&next=https%3A%2F%2Fevil.test'})).toBe('https://app.example.test/login?next=%2Foverview');
  });
  it.each([
    ['iPhone portrait', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile', 'iPhone', 5, 390],
    ['Android landscape', 'Mozilla/5.0 (Linux; Android 15; Pixel) Mobile', 'Linux armv8l', 5, 915],
    ['iPad landscape', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/18 Safari', 'MacIntel', 5, 1180],
  ])('blocks known portable device: %s', (_label, userAgent, platform, maxTouchPoints, viewportWidth) => {
    expect(classifyDesktopSupport({ userAgent, platform, maxTouchPoints, viewportWidth })).toBe('unsupported-portable');
  });

  it('keeps a resized touch-capable desktop usable instead of classifying on width or touch alone', () => {
    expect(classifyDesktopSupport({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', platform: 'Win32', maxTouchPoints: 10, viewportWidth: 800 })).toBe('narrow-desktop');
  });

  it('supports the desktop width floor', () => {
    expect(classifyDesktopSupport({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 0, viewportWidth: 1024 })).toBe('supported-desktop');
  });

  it('retains safe view context without copying searches, tokens or nested returns', () => {
    expect(safeDesktopReturnUrl({ origin: 'https://app.example.test', pathname: '/cases', search: '?status=open&range=30d&q=private%40example.test&token=secret&return=%2Fsettings' })).toBe('https://app.example.test/cases?status=open&range=30d');
  });
});
