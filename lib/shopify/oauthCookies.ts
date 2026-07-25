import { getAppUrl } from '@/lib/utils/appUrl';

export const SHOPIFY_OAUTH_RETURN_COOKIE = 'shopify_oauth_return_to';

export function normalizeShopifyOAuthReturnPath(value: string | null | undefined): string {
  return value === '/onboarding' ? '/onboarding' : '/integrations';
}

export function shopifyOAuthCookieOptions(maxAge: number) {
  const appUrl = getAppUrl();
  const secure = appUrl.startsWith('https://');
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function clearShopifyOAuthCookieOptions() {
  return shopifyOAuthCookieOptions(0);
}
