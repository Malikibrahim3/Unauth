import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/ratelimit';
import { buildGorgiasWidgetModel } from '@/lib/gorgias/widgetData';
import { GORGIAS_FRAME_HEADERS, renderGorgiasWidgetHtml } from '@/lib/gorgias/renderWidgetHtml';
import { validateWidgetToken } from '@/lib/api/widgetTokens';

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

function isUnresolvedGorgiasVar(value: string): boolean {
  return value.includes('{{') || value.includes('}}');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const widgetToken = searchParams.get('widget_token')?.trim() ?? '';
  const email = searchParams.get('email')?.trim() ?? '';
  const name = searchParams.get('name')?.trim() ?? '';
  const orderId = searchParams.get('order_id')?.trim() ?? '';

  const requestIp = getClientIp(request.headers);

  if (!widgetToken) {
    return htmlResponse(
      renderGorgiasWidgetHtml({
        model: { state: 'error', message: 'Missing widget token in widget URL.' },
        profileUrl: null,
        widgetTokenJson: '""',
        emailJson: '""',
        orderIdJson: '""',
      })
    );
  }

  const authResult = await validateWidgetToken(widgetToken);
  if ('status' in authResult) {
    return htmlResponse(
      renderGorgiasWidgetHtml({
        model: {
          state: 'error',
          message:
            'Invalid widget token. Check Unauth → Settings → API & Integrations.',
        },
        profileUrl: null,
        widgetTokenJson: '""',
        emailJson: '""',
        orderIdJson: '""',
      }),
      authResult.status === 500 ? 500 : 401
    );
  }

  if (!email || isUnresolvedGorgiasVar(email)) {
    return htmlResponse(
      renderGorgiasWidgetHtml({
        model: {
          state: 'error',
          message: 'No customer email on this ticket yet.',
        },
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

  const html = renderGorgiasWidgetHtml({
    model,
    profileUrl: 'profileUrl' in model ? (model.profileUrl ?? null) : null,
    widgetTokenJson: JSON.stringify(widgetToken),
    emailJson: JSON.stringify(email),
    orderIdJson: JSON.stringify(isUnresolvedGorgiasVar(orderId) ? '' : orderId),
  });

  return htmlResponse(html);
}
