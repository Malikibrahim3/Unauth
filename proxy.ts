import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { enforceRateLimit, getClientIp, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';
import { createRequestId, merchantIdHeader, requestIdHeader } from '@/lib/log';
import { captureServerException, initSentryServer } from '@/lib/sentry';

function isPhoneUserAgent(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  const isTablet =
    ua.includes('ipad') ||
    ua.includes('tablet') ||
    ua.includes('kindle') ||
    ua.includes('silk') ||
    ua.includes('playbook') ||
    ua.includes('nexus 7') ||
    ua.includes('nexus 9') ||
    ua.includes('sm-t') ||
    ua.includes('tab');

  const isPhone =
    ua.includes('iphone') ||
    (ua.includes('android') && ua.includes('mobile')) ||
    ua.includes('windows phone') ||
    ua.includes('opera mini') ||
    ua.includes('blackberry') ||
    ua.includes('bb10');

  return isPhone && !isTablet;
}

export async function proxy(request: NextRequest) {
  initSentryServer();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(requestIdHeader, request.headers.get(requestIdHeader) ?? createRequestId());
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api');
  const isAssetRoute =
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname === '/favicon.ico';
  const isMobileUnsupportedRoute = pathname === '/mobile-unsupported';

  // Public/marketing routes — always accessible on mobile.
  // App routes (dashboard, upload, inbox, etc.) remain blocked.
  const isMobileAllowedRoute =
    pathname === '/' ||
    pathname === '/landing' ||
    pathname === '/demo' ||
    pathname === '/apply' ||
    pathname === '/signup' ||
    pathname.startsWith('/audit') ||
    pathname.startsWith('/legal') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/reset') ||
    pathname.startsWith('/mobile-unsupported');

  if (!isApiRoute && !isAssetRoute && !isMobileAllowedRoute) {
    const userAgent = request.headers.get('user-agent') ?? '';
    if (isPhoneUserAgent(userAgent)) {
      const url = request.nextUrl.clone();
      url.pathname = '/mobile-unsupported';
      const response = NextResponse.redirect(url);
      response.headers.set(requestIdHeader, requestHeaders.get(requestIdHeader)!);
      return response;
    }
  }

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/callback');

  if (isAuthRoute && request.method === 'POST') {
    const limited = await enforceRateLimit(
      rateLimitKey('auth', getClientIp(request.headers)),
      limitFromEnv('RL_AUTH_PER_MINUTE', 5, 60, 'RL_AUTH_WINDOW_SECONDS')
    );
    if (limited) return limited;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set(name, value);
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          supabaseResponse.cookies.set(name, value, options);
        },
        remove(name: string, _options: any) {
          request.cookies.delete(name);
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          supabaseResponse.cookies.delete(name);
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute =
    pathname === '/' ||
    pathname === '/landing' ||
    pathname === '/demo' ||
    pathname === '/mobile-unsupported' ||
    pathname === '/legal' ||
    pathname.startsWith('/legal/');
  const isInternalRoute =
    pathname === '/eval' ||
    pathname.startsWith('/eval/') ||
    pathname === '/network-metrics' ||
    pathname.startsWith('/network-metrics/');

  if (!user && !isAuthRoute && !isApiRoute && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const response = NextResponse.redirect(url);
    response.headers.set(requestIdHeader, requestHeaders.get(requestIdHeader)!);
    return response;
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    const response = NextResponse.redirect(url);
    response.headers.set(requestIdHeader, requestHeaders.get(requestIdHeader)!);
    return response;
  }

  if (user && isApiRoute) {
    try {
      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const merchantId = (merchant as { id?: string } | null)?.id;
      if (merchantId) {
        requestHeaders.set(merchantIdHeader, merchantId);
        supabaseResponse = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }
    } catch (error) {
      captureServerException(error, {
        requestId: requestHeaders.get(requestIdHeader),
        route: pathname,
        method: request.method,
      });
    }
  }

  if (user && isInternalRoute) {
    const { data: merchant } = await supabase
      .from('merchants')
      .select('is_internal')
      .eq('user_id', user.id)
      .single();

    if (!merchant?.is_internal) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      const response = NextResponse.redirect(url);
      response.headers.set(requestIdHeader, requestHeaders.get(requestIdHeader)!);
      return response;
    }
  }

  supabaseResponse.headers.set(requestIdHeader, requestHeaders.get(requestIdHeader)!);
  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};