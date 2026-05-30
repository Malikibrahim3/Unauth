import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/ratelimit';
import { buildGorgiasWidgetModel } from '@/lib/gorgias/widgetData';
import {
  gorgiasWidgetModelToJson,
  type GorgiasWidgetJsonPayload,
} from '@/lib/gorgias/widgetJson';
import { gorgiasWidgetLog, gorgiasWidgetLogError } from '@/lib/gorgias/widgetLog';
import { GORGIAS_FRAME_HEADERS, renderGorgiasWidgetHtml } from '@/lib/gorgias/renderWidgetHtml';
import { validateWidgetToken, widgetTokenDisplayPrefix } from '@/lib/api/widgetTokens';
import { GORGIAS_WIDGET_TOKEN_HEADER } from '@/lib/support/gorgias/registerSidebarWidget';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const JSON_RESPONSE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
} as const;

const GORGIAS_WIDGET_JSON_FALLBACK: GorgiasWidgetJsonPayload = {
  risk_level: 'ERROR',
  identity_confidence_grade: 'N/A',
  match_score: '0',
  fraud_flags: 'Unauth could not load fraud intelligence for this ticket.',
};

function htmlResponse(html: string, status = 200) {
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    ...GORGIAS_FRAME_HEADERS,
  };
  gorgiasWidgetLog('response_html', { status, headers: JSON.stringify(headers) });
  return new NextResponse(html, { status, headers });
}

function jsonResponse(body: GorgiasWidgetJsonPayload, status = 200) {
  gorgiasWidgetLog('before_json_response', { status, returnHtml: false });
  gorgiasWidgetLog('response.body', { body: JSON.stringify(body) });
  gorgiasWidgetLog('response.headers', { headers: JSON.stringify(JSON_RESPONSE_HEADERS) });
  gorgiasWidgetLog('response_json', {
    status,
    headers: JSON.stringify(JSON_RESPONSE_HEADERS),
    body: JSON.stringify(body),
  });
  return NextResponse.json(body, { status, headers: JSON_RESPONSE_HEADERS });
}

function fatalJsonResponse(err: unknown, status = 500) {
  const message = err instanceof Error ? err.message : 'unknown_error';
  return jsonResponse(
    {
      ...GORGIAS_WIDGET_JSON_FALLBACK,
      fraud_flags: `Widget error: ${message}`.slice(0, 500),
    },
    status
  );
}

/** Gorgias HTTP integrations expect JSON; HTML is opt-in for manual preview. */
function wantsHtmlResponse(request: NextRequest): boolean {
  return request.nextUrl.searchParams.get('format') === 'html';
}

function isUnresolvedGorgiasVar(value: string): boolean {
  return value.includes('{{') || value.includes('}}');
}

function resolveWidgetToken(request: NextRequest): string {
  const headerToken = request.headers.get(GORGIAS_WIDGET_TOKEN_HEADER)?.trim() ?? '';
  if (headerToken) return headerToken;
  return request.nextUrl.searchParams.get('widget_token')?.trim() ?? '';
}

function describeModelForLog(model: Awaited<ReturnType<typeof buildGorgiasWidgetModel>>): {
  state: string;
  customerProfileFound: boolean;
  profileId: string | null;
  risk_level: string | null;
  risk_score: number | null;
} {
  if (model.state === 'merchant_profile') {
    return {
      state: model.state,
      customerProfileFound: true,
      profileId: model.profileId,
      risk_level: model.riskLevel,
      risk_score: model.riskScore,
    };
  }
  if (model.state === 'low_clear') {
    return {
      state: model.state,
      customerProfileFound: true,
      profileId: model.merchantProfile.profileId,
      risk_level: null,
      risk_score: model.merchantProfile.riskScore,
    };
  }
  if (model.state === 'risk') {
    return {
      state: model.state,
      customerProfileFound: model.merchantProfile !== null,
      profileId: model.merchantProfile?.profileId ?? null,
      risk_level: model.tier,
      risk_score: model.lookup.risk_score,
    };
  }
  return {
    state: model.state,
    customerProfileFound: false,
    profileId: null,
    risk_level: null,
    risk_score: null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const widgetToken = resolveWidgetToken(request);
    const email = searchParams.get('email')?.trim() ?? '';
    const name = searchParams.get('name')?.trim() ?? '';
    const orderId = searchParams.get('order_id')?.trim() ?? '';
    const returnHtml = wantsHtmlResponse(request);

    const requestIp = getClientIp(request.headers);
    const accept = request.headers.get('accept') ?? '';

    gorgiasWidgetLog('request', {
      email,
      emailUnresolved: isUnresolvedGorgiasVar(email),
      orderId: orderId || null,
      returnHtml,
      accept,
      hasWidgetToken: Boolean(widgetToken),
      widgetTokenPrefix: widgetToken ? widgetTokenDisplayPrefix(widgetToken) : null,
      tokenFromHeader: Boolean(request.headers.get(GORGIAS_WIDGET_TOKEN_HEADER)?.trim()),
    });

    if (!widgetToken) {
      const model = { state: 'error' as const, message: 'Missing widget token in widget URL.' };
      const body = gorgiasWidgetModelToJson(model);
      gorgiasWidgetLog('before_json_body', { branch: 'missing_token' });
      if (!returnHtml) {
        return jsonResponse(body, 401);
      }
      return htmlResponse(
        renderGorgiasWidgetHtml({
          model,
          profileUrl: null,
          widgetTokenJson: '""',
          emailJson: '""',
          orderIdJson: '""',
        }),
        401
      );
    }

    const authResult = await validateWidgetToken(widgetToken);
    if ('status' in authResult) {
      gorgiasWidgetLog('widget_token_invalid', {
        status: authResult.status,
        message: authResult.message,
      });
      const model = {
        state: 'error' as const,
        message: 'Invalid widget token. Check Unauth \u2192 Settings \u2192 API & Integrations.',
      };
      const status = authResult.status === 500 ? 500 : 401;
      const body = gorgiasWidgetModelToJson(model);
      gorgiasWidgetLog('before_json_body', { branch: 'invalid_token' });
      if (!returnHtml) {
        return jsonResponse(body, status);
      }
      return htmlResponse(
        renderGorgiasWidgetHtml({
          model,
          profileUrl: null,
          widgetTokenJson: '""',
          emailJson: '""',
          orderIdJson: '""',
        }),
        status
      );
    }

    gorgiasWidgetLog('widget_token_valid', {
      merchantId: authResult.merchantId,
      apiKeyId: authResult.apiKeyId,
      tokenId: authResult.tokenId,
    });

    gorgiasWidgetLog('branch_email_check', {
      hasEmail: Boolean(email),
      emailUnresolved: isUnresolvedGorgiasVar(email),
    });

    if (!email || isUnresolvedGorgiasVar(email)) {
      const model = { state: 'error' as const, message: 'No customer email on this ticket yet.' };
      const body = gorgiasWidgetModelToJson(model);
      gorgiasWidgetLog('before_json_body', { branch: 'missing_email' });
      if (!returnHtml) {
        return jsonResponse(body, 400);
      }
      return htmlResponse(
        renderGorgiasWidgetHtml({
          model,
          profileUrl: null,
          widgetTokenJson: '""',
          emailJson: '""',
          orderIdJson: '""',
        }),
        400
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

    gorgiasWidgetLog('customer_lookup.result', describeModelForLog(model));

    gorgiasWidgetLog('before_json_body', { branch: 'success', modelState: model.state });
    const body = gorgiasWidgetModelToJson(model);

    if (!returnHtml) {
      return jsonResponse(body);
    }

    gorgiasWidgetLog('before_html_response', { modelState: model.state });
    const html = renderGorgiasWidgetHtml({
      model,
      profileUrl: 'profileUrl' in model ? (model.profileUrl ?? null) : null,
      widgetTokenJson: JSON.stringify(widgetToken),
      emailJson: JSON.stringify(email),
      orderIdJson: JSON.stringify(isUnresolvedGorgiasVar(orderId) ? '' : orderId),
    });

    return htmlResponse(html);
  } catch (err) {
    gorgiasWidgetLogError('fatal_error', err);
    return fatalJsonResponse(err);
  }
}
