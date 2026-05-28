import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { validateApiKeyPlaintext } from '@/lib/api/validateApiKey';
import { getClientIp } from '@/lib/ratelimit';
import { buildGorgiasWidgetModel } from '@/lib/gorgias/widgetData';
import { GORGIAS_FRAME_HEADERS, renderGorgiasWidgetHtml } from '@/lib/gorgias/renderWidgetHtml';

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
  const apiKey = searchParams.get('api_key')?.trim() ?? '';
  const email = searchParams.get('email')?.trim() ?? '';
  const name = searchParams.get('name')?.trim() ?? '';
  const orderId = searchParams.get('order_id')?.trim() ?? '';

  const requestIp = getClientIp(request.headers);

  if (!apiKey) {
    return htmlResponse(
      renderGorgiasWidgetHtml({
        model: { state: 'error', message: 'Missing API key in widget URL.' },
        emailForProfileUrl: '',
        apiKeyJson: '""',
        emailJson: '""',
        orderIdJson: '""',
      })
    );
  }

  const authResult = await validateApiKeyPlaintext(apiKey, requestIp);
  if ('status' in authResult) {
    return htmlResponse(
      renderGorgiasWidgetHtml({
        model: {
          state: 'error',
          message:
            authResult.status === 429
              ? 'Daily or per-minute limit reached. Try again later.'
              : 'Invalid API key. Check Unauth → Settings → API & Integrations.',
        },
        emailForProfileUrl: '',
        apiKeyJson: '""',
        emailJson: '""',
        orderIdJson: '""',
      }),
      authResult.status === 429 ? 429 : 401
    );
  }

  if (!email || isUnresolvedGorgiasVar(email)) {
    return htmlResponse(
      renderGorgiasWidgetHtml({
        model: {
          state: 'error',
          message: 'No customer email on this ticket yet.',
        },
        emailForProfileUrl: '',
        apiKeyJson: '""',
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
      apiKeyId: authResult.keyId,
      requestIp: authResult.requestIp,
    },
    {
      rawEmail: email,
      rawName: isUnresolvedGorgiasVar(name) ? '' : name,
      orderId: isUnresolvedGorgiasVar(orderId) ? '' : orderId,
    }
  );

  const html = renderGorgiasWidgetHtml({
    model,
    emailForProfileUrl: encodeURIComponent(email),
    apiKeyJson: JSON.stringify(apiKey),
    emailJson: JSON.stringify(email),
    orderIdJson: JSON.stringify(isUnresolvedGorgiasVar(orderId) ? '' : orderId),
  });

  return htmlResponse(html);
}
