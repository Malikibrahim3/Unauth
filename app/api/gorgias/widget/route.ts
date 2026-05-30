import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/ratelimit';
import { buildGorgiasWidgetModel, type GorgiasWidgetModel } from '@/lib/gorgias/widgetData';
import type { MerchantCustomerLookupDiagnostics } from '@/lib/gorgias/findMerchantCustomerByEmail';
import {
  gorgiasWidgetModelToJson,
  type GorgiasWidgetJsonPayload,
} from '@/lib/gorgias/widgetJson';
import { gorgiasWidgetLog, gorgiasWidgetLogError } from '@/lib/gorgias/widgetLog';
import { GORGIAS_FRAME_HEADERS, renderGorgiasWidgetHtml } from '@/lib/gorgias/renderWidgetHtml';
import { validateWidgetToken, widgetTokenDisplayPrefix } from '@/lib/api/widgetTokens';
import { GORGIAS_WIDGET_TOKEN_HEADER } from '@/lib/support/gorgias/registerSidebarWidget';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

const JSON_RESPONSE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
} as const;

const GORGIAS_WIDGET_JSON_FALLBACK: GorgiasWidgetJsonPayload = {
  risk_level: 'ERROR',
  identity_confidence_grade: 'N/A',
  match_score: '0',
  fraud_flags: 'Unauth could not load fraud intelligence for this ticket.',
};

function isNotInNetworkFallback(body: GorgiasWidgetJsonPayload): boolean {
  return body.risk_level === 'NONE' && body.fraud_flags === 'Not in Unauth network';
}

function logFallbackReturned(input: {
  reason: string;
  email: string;
  merchantId: string | null;
  lookupDiagnostics: MerchantCustomerLookupDiagnostics | null;
  body: GorgiasWidgetJsonPayload;
  modelState: string;
}) {
  gorgiasWidgetLog('fallback_returned', {
    reason: input.reason,
    email: input.email,
    merchantId: input.merchantId,
    modelState: input.modelState,
    merchantScopedRows: input.lookupDiagnostics?.merchantScopedRows ?? null,
    emailMatchedRows: input.lookupDiagnostics?.emailMatchedRows ?? null,
    primaryEmailCandidateRows: input.lookupDiagnostics?.primaryEmailCandidateRows ?? null,
    emailsContainsCandidateRows: input.lookupDiagnostics?.emailsContainsCandidateRows ?? null,
    body: JSON.stringify(input.body),
  });
}

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
  const body = {
    ...GORGIAS_WIDGET_JSON_FALLBACK,
    fraud_flags: `Widget error: ${message}`.slice(0, 500),
  };
  logFallbackReturned({
    reason: 'fatal_error',
    email: '',
    merchantId: null,
    lookupDiagnostics: null,
    body,
    modelState: 'error',
  });
  return jsonResponse(body, status);
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

function describeModelForLog(model: GorgiasWidgetModel): {
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

function returnJsonForModel(input: {
  model: GorgiasWidgetModel;
  lookupDiagnostics: MerchantCustomerLookupDiagnostics | null;
  email: string;
  merchantId: string | null;
  returnHtml: boolean;
  widgetToken: string;
  orderId: string;
  status?: number;
}): NextResponse {
  const body = gorgiasWidgetModelToJson(input.model);

  if (input.model.state === 'not_found' || isNotInNetworkFallback(body)) {
    logFallbackReturned({
      reason:
        input.model.state === 'not_found' ? 'customer_profile_not_found' : 'not_in_network_payload',
      email: input.email,
      merchantId: input.merchantId,
      lookupDiagnostics: input.lookupDiagnostics,
      body,
      modelState: input.model.state,
    });
  } else if (input.model.state === 'error') {
    logFallbackReturned({
      reason: 'error_model',
      email: input.email,
      merchantId: input.merchantId,
      lookupDiagnostics: input.lookupDiagnostics,
      body,
      modelState: input.model.state,
    });
  }

  if (!input.returnHtml) {
    return jsonResponse(body, input.status ?? 200);
  }

  const html = renderGorgiasWidgetHtml({
    model: input.model,
    profileUrl: 'profileUrl' in input.model ? (input.model.profileUrl ?? null) : null,
    widgetTokenJson: JSON.stringify(input.widgetToken),
    emailJson: JSON.stringify(input.email),
    orderIdJson: JSON.stringify(isUnresolvedGorgiasVar(input.orderId) ? '' : input.orderId),
  });

  return htmlResponse(html, input.status ?? 200);
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
      return returnJsonForModel({
        model,
        lookupDiagnostics: null,
        email,
        merchantId: null,
        returnHtml,
        widgetToken: '',
        orderId,
        status: 401,
      });
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
      return returnJsonForModel({
        model,
        lookupDiagnostics: null,
        email,
        merchantId: null,
        returnHtml,
        widgetToken,
        orderId,
        status: authResult.status === 500 ? 500 : 401,
      });
    }

    gorgiasWidgetLog('widget_token_valid', {
      merchantId: authResult.merchantId,
      apiKeyId: authResult.apiKeyId,
      tokenId: authResult.tokenId,
    });

    if (!email || isUnresolvedGorgiasVar(email)) {
      const model = { state: 'error' as const, message: 'No customer email on this ticket yet.' };
      return returnJsonForModel({
        model,
        lookupDiagnostics: null,
        email,
        merchantId: authResult.merchantId,
        returnHtml,
        widgetToken,
        orderId,
        status: 400,
      });
    }

    const service = createServiceClient();
    const { model, lookupDiagnostics } = await buildGorgiasWidgetModel(
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

    return returnJsonForModel({
      model,
      lookupDiagnostics,
      email,
      merchantId: authResult.merchantId,
      returnHtml,
      widgetToken,
      orderId,
    });
  } catch (err) {
    gorgiasWidgetLogError('fatal_error', err);
    return fatalJsonResponse(err);
  }
}
