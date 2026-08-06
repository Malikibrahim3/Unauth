import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { TABLES } from './lib/supabase/tables';
import { enforceRateLimit, getClientIp, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';
import { createRequestId, merchantIdHeader, requestIdHeader } from '@/lib/log';

export async function proxy(request: NextRequest) {
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
  const isDevelopmentHarness =
    pathname === '/dev/design-system' ||
    pathname === '/integrations/dev-preview';
  if (process.env.NODE_ENV === 'production' && isDevelopmentHarness) {
    const response = new NextResponse('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
    response.headers.set(requestIdHeader, requestHeaders.get(requestIdHeader)!);
    return response;
  }
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/reset') ||
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
    pathname.startsWith('/landing/') ||
    pathname === '/audit-demo' ||
    pathname.startsWith('/audit-demo/') ||
    pathname === '/demo' ||
    pathname === '/pricing' ||
    pathname === '/signup' ||
    pathname.startsWith('/reset') ||
    pathname === '/legal' ||
    pathname.startsWith('/legal/');

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

  /*
   * Route aliases must be real HTTP redirects. App Router's streamed
   * `redirect()` fallback is correct for direct module execution, but a
   * client-applied redirect drops the source fragment because fragments never
   * reach the server. A Location header without a fragment lets the browser
   * carry the original fragment forward per URL redirect semantics.
   */
  let aliasUrl: URL | null = null;
  if (pathname === '/') {
    aliasUrl = request.nextUrl.clone();
    aliasUrl.pathname = '/landing';
  } else if (user && [
    '/dashboard',
    '/claims',
    '/inbox',
    '/losses',
    '/recoveries',
    '/reports',
    '/integrations',
    '/rules',
    '/flows',
    '/settings',
  ].includes(pathname)) {
    const canonicalByAlias: Record<string, string> = {
      '/dashboard': '/overview',
      '/claims': '/cases',
      '/inbox': '/cases',
      '/losses': '/financials/losses',
      '/recoveries': '/financials/recovery',
      '/reports': '/financials/reports',
      '/integrations': '/sources/connected',
      '/rules': '/controls/rules',
      '/flows': '/controls/flows',
      '/settings': '/settings/workspace/account',
    };
    aliasUrl = request.nextUrl.clone();
    aliasUrl.pathname = canonicalByAlias[pathname];
  } else if (user && pathname === '/exceptions') {
    aliasUrl = request.nextUrl.clone();
    aliasUrl.pathname = '/work';
    aliasUrl.searchParams.set('view', 'integration-exceptions');
  } else if (user) {
    const customerClaims = pathname.match(/^\/customers\/([^/]+)\/claims$/);
    if (customerClaims) {
      aliasUrl = request.nextUrl.clone();
      const claimId = aliasUrl.searchParams.get('claimId');
      aliasUrl.searchParams.delete('claimId');
      if (claimId) {
        aliasUrl.pathname = `/claims/${encodeURIComponent(claimId)}`;
      } else {
        aliasUrl.pathname = `/customers/${encodeURIComponent(customerClaims[1])}`;
        aliasUrl.hash = 'cases';
      }
    }
  }
  if (aliasUrl) {
    const response = NextResponse.redirect(aliasUrl);
    response.headers.set(requestIdHeader, requestHeaders.get(requestIdHeader)!);
    return response;
  }

  if (user && isApiRoute) {
    try {
      const selectedMerchantId = request.cookies.get('unauth_active_merchant')?.value;
      let membershipQuery = supabase.from(TABLES.MERCHANT_MEMBERS).select('merchant_id').eq('user_id', user.id).eq('invite_status', 'active');
      if (selectedMerchantId) membershipQuery = membershipQuery.eq('merchant_id', selectedMerchantId);
      const { data: membership } = await membershipQuery.order('created_at', { ascending: true }).limit(1).maybeSingle();

      const merchantId = (membership as { merchant_id?: string } | null)?.merchant_id;
      if (merchantId) {
        requestHeaders.set(merchantIdHeader, merchantId);
        supabaseResponse = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }
    } catch (error) {
      console.error('proxy merchant lookup failed', {
        error,
        requestId: requestHeaders.get(requestIdHeader),
        route: pathname,
        method: request.method,
      });
    }
  }

  supabaseResponse.headers.set(requestIdHeader, requestHeaders.get(requestIdHeader)!);
  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)'],
};
