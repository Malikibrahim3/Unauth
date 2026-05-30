import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { normaliseEmail } from '@/lib/identity/normalise';
import { getClientIp } from '@/lib/ratelimit';
import { buildGorgiasWidgetModel, type GorgiasWidgetModel } from '@/lib/gorgias/widgetData';
import {
  findMerchantCustomerByEmail,
  type MerchantCustomerLookupDiagnostics,
} from '@/lib/gorgias/findMerchantCustomerByEmail';
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

/** Deploy marker — Vercel commit SHA when available (logging only). */
function gorgiasWidgetBuildMarker(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local';
}

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

type WidgetReturnContext = {
  email: string;
  merchantId: string | null;
};

/** Minimal direct trace — safe field names only (avoids log redaction / oversized payloads). */
function widgetDirectTrace(
  step: string,
  fields: Record<string, string | number | boolean | null> = {}
): void {
  console.log(
    JSON.stringify({
      message: '[gorgias.widget] trace',
      step,
      route: '/api/gorgias/widget',
      buildMarker: gorgiasWidgetBuildMarker(),
      ...fields,
    })
  );
}

function logBuildMarker(): void {
  gorgiasWidgetLog('build_marker', { buildMarker: gorgiasWidgetBuildMarker() });
}

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

/** Single JSON exit — always logs final_return before responding. */
function returnWidgetJson(
  branch: string,
  body: GorgiasWidgetJsonPayload,
  status: number,
  ctx: WidgetReturnContext
): NextResponse {
  console.log('GORGIAS_RETURN_WIDGET_JSON_6442E11');
  widgetDirectTrace('return_widget_json_enter', { branch, status });
  gorgiasWidgetLog('final_return', {
    branch,
    email: ctx.email,
    merchantId: ctx.merchantId,
    body: JSON.stringify(body),
    status,
  });
  widgetDirectTrace('return_widget_json_response', { branch, status });
  return NextResponse.json(body, { status, headers: JSON_RESPONSE_HEADERS });
}

function returnWidgetHtml(
  branch: string,
  html: string,
  status: number,
  ctx: WidgetReturnContext
): NextResponse {
  gorgiasWidgetLog('final_return_html', {
    branch,
    email: ctx.email,
    merchantId: ctx.merchantId,
    status,
  });
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    ...GORGIAS_FRAME_HEADERS,
  };
  return new NextResponse(html, { status, headers });
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
  branch: string;
  model: GorgiasWidgetModel;
  lookupDiagnostics: MerchantCustomerLookupDiagnostics | null;
  ctx: WidgetReturnContext;
  returnHtml: boolean;
  widgetToken: string;
  orderId: string;
  status?: number;
}): NextResponse {
  const body = gorgiasWidgetModelToJson(input.model);
  const status = input.status ?? 200;

  if (input.model.state === 'not_found' || isNotInNetworkFallback(body)) {
    logFallbackReturned({
      reason:
        input.model.state === 'not_found' ? 'customer_profile_not_found' : 'not_in_network_payload',
      email: input.ctx.email,
      merchantId: input.ctx.merchantId,
      lookupDiagnostics: input.lookupDiagnostics,
      body,
      modelState: input.model.state,
    });
  } else if (input.model.state === 'error') {
    logFallbackReturned({
      reason: 'error_model',
      email: input.ctx.email,
      merchantId: input.ctx.merchantId,
      lookupDiagnostics: input.lookupDiagnostics,
      body,
      modelState: input.model.state,
    });
  }

  if (!input.returnHtml) {
    return returnWidgetJson(input.branch, body, status, input.ctx);
  }

  const html = renderGorgiasWidgetHtml({
    model: input.model,
    profileUrl: 'profileUrl' in input.model ? (input.model.profileUrl ?? null) : null,
    widgetTokenJson: JSON.stringify(input.widgetToken),
    emailJson: JSON.stringify(input.ctx.email),
    orderIdJson: JSON.stringify(isUnresolvedGorgiasVar(input.orderId) ? '' : input.orderId),
  });

  return returnWidgetHtml(input.branch, html, status, input.ctx);
}

export async function GET(request: NextRequest) {
  logBuildMarker();
  console.log('GORGIAS_AFTER_MARKER_6442E11');

  const ctx: WidgetReturnContext = { email: '', merchantId: null };

  try {
    const { searchParams } = new URL(request.url);
    const widgetToken = resolveWidgetToken(request);
    const email = searchParams.get('email')?.trim() ?? '';
    const name = searchParams.get('name')?.trim() ?? '';
    const orderId = searchParams.get('order_id')?.trim() ?? '';
    const returnHtml = wantsHtmlResponse(request);

    ctx.email = email;

    const requestIp = getClientIp(request.headers);
    const accept = request.headers.get('accept') ?? '';

    widgetDirectTrace('after_request_parse', {
      wtPresent: Boolean(widgetToken),
      returnHtml,
      unresolvedAddr: isUnresolvedGorgiasVar(email),
    });

    gorgiasWidgetLog('request', {
      email,
      emailUnresolved: isUnresolvedGorgiasVar(email),
      orderId: orderId || null,
      returnHtml,
      accept,
      hasWidgetToken: Boolean(widgetToken),
      widgetTokenPrefix: widgetToken ? widgetTokenDisplayPrefix(widgetToken) : null,
      tokenFromHeader: Boolean(request.headers.get(GORGIAS_WIDGET_TOKEN_HEADER)?.trim()),
      buildMarker: gorgiasWidgetBuildMarker(),
    });

    if (!widgetToken) {
      const model = { state: 'error' as const, message: 'Missing widget token in widget URL.' };
      return returnJsonForModel({
        branch: 'missing_widget_token',
        model,
        lookupDiagnostics: null,
        ctx,
        returnHtml,
        widgetToken: '',
        orderId,
        status: 401,
      });
    }

    gorgiasWidgetLog('before_validate_widget_token', {
      email,
      widgetTokenPrefix: widgetTokenDisplayPrefix(widgetToken),
    });

    const authResult = await validateWidgetToken(widgetToken);

    gorgiasWidgetLog('after_validate_widget_token', {
      ok: !('status' in authResult),
    });

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
        branch: 'invalid_widget_token',
        model,
        lookupDiagnostics: null,
        ctx,
        returnHtml,
        widgetToken,
        orderId,
        status: authResult.status === 500 ? 500 : 401,
      });
    }

    ctx.merchantId = authResult.merchantId;

    gorgiasWidgetLog('widget_token_valid', {
      merchantId: authResult.merchantId,
      apiKeyId: authResult.apiKeyId,
      tokenId: authResult.tokenId,
    });

    if (!email || isUnresolvedGorgiasVar(email)) {
      const model = { state: 'error' as const, message: 'No customer email on this ticket yet.' };
      return returnJsonForModel({
        branch: 'missing_or_unresolved_email',
        model,
        lookupDiagnostics: null,
        ctx,
        returnHtml,
        widgetToken,
        orderId,
        status: 400,
      });
    }

    const service = createServiceClient();
    const normEmail = normaliseEmail(email);

    if (normEmail) {
      widgetDirectTrace('before_customer_lookup', { authOk: true });
      const { customer, diagnostics } = await findMerchantCustomerByEmail(
        service,
        authResult.merchantId,
        normEmail
      );
      widgetDirectTrace('after_customer_lookup', {
        authOk: true,
        profileFound: Boolean(customer),
      });
      if (customer) {
        const profileModel: GorgiasWidgetModel = {
          state: 'merchant_profile',
          profileId: customer.id,
          riskLevel: customer.risk_level,
          riskScore: customer.risk_score,
          fraudFlags: customer.fraud_flags,
          identityConfidenceGrade: customer.identity_confidence_grade,
          profileUrl: null,
        };
        gorgiasWidgetLog('customer_lookup.result', describeModelForLog(profileModel));
        return returnJsonForModel({
          branch: 'model_merchant_profile',
          model: profileModel,
          lookupDiagnostics: diagnostics,
          ctx,
          returnHtml,
          widgetToken,
          orderId,
        });
      }
    }

    gorgiasWidgetLog('before_build_gorgias_widget_model', { merchantId: authResult.merchantId, email });

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
      branch: `model_${model.state}`,
      model,
      lookupDiagnostics,
      ctx,
      returnHtml,
      widgetToken,
      orderId,
    });
  } catch (err) {
    gorgiasWidgetLogError('fatal_error', err);
    const message = err instanceof Error ? err.message : 'unknown_error';
    const body: GorgiasWidgetJsonPayload = {
      ...GORGIAS_WIDGET_JSON_FALLBACK,
      fraud_flags: `Widget error: ${message}`.slice(0, 500),
    };
    logFallbackReturned({
      reason: 'fatal_error',
      email: ctx.email,
      merchantId: ctx.merchantId,
      lookupDiagnostics: null,
      body,
      modelState: 'error',
    });
    return returnWidgetJson('fatal_error', body, 500, ctx);
  }
}
