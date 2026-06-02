import { getAppUrl } from '@/lib/utils/appUrl';

export function bigCommerceOAuthCookieOptions(maxAge: number) {
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

export function clearBigCommerceOAuthCookieOptions() {
  return bigCommerceOAuthCookieOptions(0);
}
