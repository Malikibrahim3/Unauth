import { parseRequestedPlanId } from '@/lib/billing/plans';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';

export type DesktopSupportState = 'supported-desktop' | 'narrow-desktop' | 'unsupported-portable';

/** Presentation support only; never an authentication or permission check. */
export function isResponsiveMarketingPath(pathname: string): boolean {
  return pathname === '/' || pathname === '/landing' || pathname === '/landing/data' || pathname === '/pricing' || pathname.startsWith('/legal/');
}

export function isPublicDesktopPath(pathname: string): boolean {
  return ['/login', '/signup', '/reset', '/reset/update', '/demo'].includes(pathname);
}

export type DesktopSupportSignals = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  viewportWidth: number;
};

const PORTABLE_USER_AGENT = /android|ipad|iphone|ipod|kindle|silk|mobile|tablet|playbook|webos/i;

/**
 * Product support classification, not an authentication or security boundary.
 * Width and touch are deliberately insufficient on their own: a resized or
 * magnified desktop remains a desktop, and a wide landscape tablet remains a
 * portable device.
 */
export function classifyDesktopSupport(signals: DesktopSupportSignals): DesktopSupportState {
  const iPadDesktopUserAgent = /mac/i.test(signals.platform) && signals.maxTouchPoints > 1;
  if (PORTABLE_USER_AGENT.test(signals.userAgent) || iPadDesktopUserAgent) {
    return 'unsupported-portable';
  }
  return signals.viewportWidth < 1024 ? 'narrow-desktop' : 'supported-desktop';
}

const SAFE_RETURN_KEYS = new Set([
  'compare',
  'currency',
  'page',
  'range',
  'sort',
  'stage',
  'status',
  'step',
  'tab',
  'view',
]);

/** Keep useful view context without copying credentials, search terms or nested returns. */
export function safeDesktopReturnUrl(input: { origin: string; pathname: string; search: string }): string {
  const pathname = input.pathname.startsWith('/') && !input.pathname.startsWith('//') ? input.pathname : '/';
  const output = new URL(pathname, input.origin);
  const incoming = new URLSearchParams(input.search);
  for (const [key, value] of incoming) {
    if (isPublicDesktopPath(pathname) && key === 'plan') {
      const plan = parseRequestedPlanId(value);
      if (plan) output.searchParams.set('plan', plan);
      continue;
    }
    if (isPublicDesktopPath(pathname) && key === 'billingInterval') {
      if (value === 'monthly' || value === 'annual') output.searchParams.set('billingInterval', value);
      continue;
    }
    if (isPublicDesktopPath(pathname) && key === 'next') {
      const next = new URL(safeRedirectPath(value), input.origin);
      // Nested return paths and sensitive query values are never copied.
      const clean = new URL(safeDesktopReturnUrl({ origin: input.origin, pathname: next.pathname, search: '' }));
      output.searchParams.set('next', clean.pathname);
      continue;
    }
    if (pathname === '/demo' && key === 'case' && ['legitimate', 'duplicate', 'recoverable', 'not-received'].includes(value)) {
      output.searchParams.set(key, value);
      continue;
    }
    if (!SAFE_RETURN_KEYS.has(key) || value.length > 100) continue;
    output.searchParams.append(key, value);
  }
  return output.toString();
}
