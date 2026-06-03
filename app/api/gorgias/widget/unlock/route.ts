import { NextRequest, NextResponse } from 'next/server';
import { performWidgetContextUnlock } from '@/lib/api/gorgias/performWidgetContextUnlock';
import { validateWidgetToken } from '@/lib/api/widgetTokens';
import type { ContextUnlockType } from '@/lib/billing/contextCredits';
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

async function POSTHandler(request: NextRequest) {
  const widgetToken = resolveWidgetToken(request);
  if (!widgetToken) {
    return NextResponse.json({ error: 'Missing widget token' }, { status: 401 });
  }

  const authResult = await validateWidgetToken(widgetToken);
  if ('status' in authResult) {
    return NextResponse.json(
      { error: authResult.status === 500 ? 'Widget token validation failed' : 'Invalid widget token' },
      { status: authResult.status === 500 ? 500 : 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const contextType = String(body.contextType ?? '') as ContextUnlockType;
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
    rawEmail: String(body.email ?? '').trim(),
    rawName: String(body.name ?? '').trim(),
    ticketRef: body.ticketRef != null ? String(body.ticketRef) : null,
    orderRef: body.orderRef != null ? String(body.orderRef) : null,
    claimId: body.claimId != null ? String(body.claimId) : null,
    customerRef: body.customerRef != null ? String(body.customerRef) : null,
  });

  return NextResponse.json(result.json, { status: result.status });
}

export const POST = withRequestLogging('/api/gorgias/widget/unlock', POSTHandler);
