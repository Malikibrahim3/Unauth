import { NextRequest, NextResponse } from 'next/server';
import { performWidgetContextUnlock } from '@/lib/api/gorgias/performWidgetContextUnlock';
import { validateWidgetToken } from '@/lib/api/widgetTokens';
import type { ContextUnlockType } from '@/lib/billing/contextCredits';
import { renderWidgetUnlockHtml } from '@/lib/gorgias/renderWidgetUnlockHtml';
import type { FormattedContextResult } from '@/lib/api/lookup/contextLookupCore';
import { getClientIp } from '@/lib/ratelimit';
import { createServiceClient } from '@/lib/supabase/server';
import { GORGIAS_WIDGET_TOKEN_HEADER } from '@/lib/support/gorgias/registerSidebarWidget';
import { withRequestLogging } from '@/lib/log';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UNLOCK_TYPES: ContextUnlockType[] = [
  'basic_context',
  'full_context',
  'evidence_summary',
];

function resolveWidgetToken(request: NextRequest): string {
  const headerToken = request.headers.get(GORGIAS_WIDGET_TOKEN_HEADER)?.trim() ?? '';
  if (headerToken) return headerToken;
  return request.nextUrl.searchParams.get('widget_token')?.trim() ?? '';
}

function wantsJson(request: NextRequest): boolean {
  return request.nextUrl.searchParams.get('format') === 'json';
}

async function GETHandler(request: NextRequest) {
  const widgetToken = resolveWidgetToken(request);
  if (!widgetToken) {
    const html = renderWidgetUnlockHtml({
      contextType: 'basic_context',
      results: [],
      creditsSpent: 0,
      remainingCredits: 0,
      ticketRef: null,
      orderRef: null,
      error: 'Missing widget token.',
    });
    return new NextResponse(html, { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const authResult = await validateWidgetToken(widgetToken);
  if ('status' in authResult) {
    const html = renderWidgetUnlockHtml({
      contextType: 'basic_context',
      results: [],
      creditsSpent: 0,
      remainingCredits: 0,
      ticketRef: null,
      orderRef: null,
      error: 'Invalid widget token.',
    });
    return new NextResponse(html, { status: authResult.status === 500 ? 500 : 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const contextType = String(request.nextUrl.searchParams.get('contextType') ?? '') as ContextUnlockType;
  if (!UNLOCK_TYPES.includes(contextType)) {
    return NextResponse.json(
      { error: 'contextType must be basic_context, full_context, or evidence_summary' },
      { status: 400 },
    );
  }

  const service = createServiceClient();
  const result = await performWidgetContextUnlock(service, {
    merchantId: authResult.merchantId,
    apiKeyId: authResult.apiKeyId,
    requestIp: getClientIp(request.headers),
    contextType,
    rawEmail: request.nextUrl.searchParams.get('email')?.trim() ?? '',
    rawName: request.nextUrl.searchParams.get('name')?.trim() ?? '',
    ticketRef: request.nextUrl.searchParams.get('ticketRef') ?? request.nextUrl.searchParams.get('ticket_id'),
    orderRef: request.nextUrl.searchParams.get('orderRef') ?? request.nextUrl.searchParams.get('order_id'),
    claimId: request.nextUrl.searchParams.get('claimId'),
  });

  if (wantsJson(request)) {
    return NextResponse.json(result.json, { status: result.status });
  }

  const json = result.json;
  const results = (json.results ?? []) as FormattedContextResult[];
  const html = renderWidgetUnlockHtml({
    contextType,
    results,
    creditsSpent: typeof json.creditsSpent === 'number' ? json.creditsSpent : 0,
    remainingCredits: typeof json.remainingCredits === 'number' ? json.remainingCredits : 0,
    ticketRef: typeof json.ticketRef === 'string' ? json.ticketRef : null,
    orderRef: typeof json.orderRef === 'string' ? json.orderRef : null,
    claimId: typeof json.claimId === 'string' ? json.claimId : null,
    error: typeof json.error === 'string' ? json.error : undefined,
    insufficientCredits: result.status === 402,
    planGate: result.status === 403,
    requiredCredits: typeof json.requiredCredits === 'number' ? json.requiredCredits : undefined,
  });

  return new NextResponse(html, {
    status: result.status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export const GET = withRequestLogging('/api/gorgias/widget/unlock/action', GETHandler);
