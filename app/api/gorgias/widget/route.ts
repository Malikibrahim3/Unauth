import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/ratelimit';
import { buildGorgiasWidgetModel } from '@/lib/gorgias/widgetData';
import { gorgiasWidgetModelToJson } from '@/lib/gorgias/widgetJson';
import { GORGIAS_FRAME_HEADERS, renderGorgiasWidgetHtml } from '@/lib/gorgias/renderWidgetHtml';
import { validateWidgetToken } from '@/lib/api/widgetTokens';
import { GORGIAS_WIDGET_TOKEN_HEADER } from '@/lib/support/gorgias/registerSidebarWidget';

export const dynamic = 'force-dynamic';

function htmlResponse(html: string, status = 200) {
  return new NextResponse(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...GORGIAS_FRAME_HEADERS,
    },
  });
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function wantsJsonResponse(request: NextRequest): boolean {
  const accept = request.headers.get('accept') ?? '';
  if (accept.includes('application/json')) return true;
  return request.nextUrl.searchParams.get('format') === 'json';
}

function isUnresolvedGorgiasVar(value: string): boolean {
  return value.includes('{{') || value.includes('}}');
}

function resolveWidgetToken(request: NextRequest): string {
  const headerToken = request.headers.get(GORGIAS_WIDGET_TOKEN_HEADER)?.trim() ?? '';
  if (headerToken) return headerToken;
  return request.nextUrl.searchParams.get('widget_token')?.trim() ?? '';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const widgetToken = resolveWidgetToken(request);
  const email = searchParams.get('email')?.trim() ?? '';
  const name = searchParams.get('name')?.trim() ?? '';
  const orderId = searchParams.get('order_id')?.trim() ?? '';
  const returnJson = wantsJsonResponse(request);

  const requestIp = getClientIp(request.headers);

  if (!widgetToken) {
    const model = { state: 'error' as const, message: 'Missing widget token in widget URL.' };
    if (returnJson) {
      return jsonResponse(gorgiasWidgetModelToJson(model), 401);
    }
    return htmlResponse(
      renderGorgiasWidgetHtml({
        model,
        profileUrl: null,
        widgetTokenJson: '""',
        emailJson: '""',
        orderIdJson: '""',
      })
    );
  }

  const authResult = await validateWidgetToken(widgetToken);
  if ('status' in authResult) {
    const model = {
      state: 'error' as const,
      message: 'Invalid widget token. Check Unauth \u2192 Settings \u2192 API & Integrations.',
    };
    if (returnJson) {
      return jsonResponse(gorgiasWidgetModelToJson(model), authResult.status === 500 ? 500 : 401);
    }
    return htmlResponse(
      renderGorgiasWidgetHtml({
        model,
        profileUrl: null,
        widgetTokenJson: '""',
        emailJson: '""',
        orderIdJson: '""',
      }),
      authResult.status === 500 ? 500 : 401
    );
  }

  if (!email || isUnresolvedGorgiasVar(email)) {
    const model = { state: 'error' as const, message: 'No customer email on this ticket yet.' };
    if (returnJson) {
      return jsonResponse(gorgiasWidgetModelToJson(model), 400);
    }
    return htmlResponse(
      renderGorgiasWidgetHtml({
        model,
        profileUrl: null,
        widgetTokenJson: '""',
        emailJson: '""',
        orderIdJson: '""',
      })
    );
  }

  const service = createServiceClient();
  const model = await buildGorgiasWidgetModel(
    service,
    {
      merchantId: authResult.merchantId,
      apiKeyId: authResult.apiKeyId,
      requestIp,
    },
    {
      rawEmail: email,
      rawName: isUnresolvedGorgiasVar(name) ? '' : name,
      orderId: isUnresolvedGorgiasVar(orderId) ? '' : orderId,
    }
  );

  if (returnJson) {
    return jsonResponse(gorgiasWidgetModelToJson(model));
  }

  const html = renderGorgiasWidgetHtml({
    model,
    profileUrl: 'profileUrl' in model ? (model.profileUrl ?? null) : null,
    widgetTokenJson: JSON.stringify(widgetToken),
    emailJson: JSON.stringify(email),
    orderIdJson: JSON.stringify(isUnresolvedGorgiasVar(orderId) ? '' : orderId),
  });

  return htmlResponse(html);
}
