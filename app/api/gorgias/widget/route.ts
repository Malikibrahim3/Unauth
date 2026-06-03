// TODO(product-gating): require HELPDESK_WIDGET entitlement when ENFORCE_PRODUCT_GATES is enabled.
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/ratelimit';
import {
  buildGorgiasClaimWidgetData,
  type GorgiasClaimWidgetResult,
} from '@/lib/gorgias/widgetData';
import type { MerchantCustomerLookupDiagnostics } from '@/lib/gorgias/findMerchantCustomerByEmail';
import { buildCreditUsageWidgetFields } from '@/lib/billing/creditUsage';
import { CONTEXT_UNLOCK_CTA_LABELS, getContextCreditSnapshot } from '@/lib/billing/contextCredits';
import {
  claimWidgetToJson,
  hasGorgiasUnlockCaseScope,
  type GorgiasWidgetJsonPayload,
  type GorgiasWidgetLinkContext,
  type GorgiasWidgetJsonOptions,
} from '@/lib/gorgias/widgetJson';
import { env } from '@/lib/utils/env';
import { gorgiasWidgetLog, gorgiasWidgetLogError } from '@/lib/gorgias/widgetLog';
import { GORGIAS_FRAME_HEADERS, renderGorgiasWidgetHtml } from '@/lib/gorgias/renderWidgetHtml';
import { validateWidgetToken } from '@/lib/api/widgetTokens';
import { resolveWidgetCustomerIdentity } from '@/lib/gorgias/resolveWidgetCustomerIdentity';
import { GORGIAS_WIDGET_TOKEN_HEADER } from '@/lib/support/gorgias/registerSidebarWidget';
import { isUsableWidgetEmailParam } from '@/lib/support/gorgias/ticketCustomerEmail';
import { TABLES } from '@/lib/supabase/tables';

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
  identity: 'Case context preview unavailable',
  claims: CONTEXT_UNLOCK_CTA_LABELS.basic_context,
  orders: CONTEXT_UNLOCK_CTA_LABELS.full_context,
  claim_rate: CONTEXT_UNLOCK_CTA_LABELS.evidence_summary,
  primary_reason: "Uses your store's own order, claim, delivery, and customer history.",
  recent_activity: 'Adds pseudonymous network intelligence from participating merchants.',
  ce3_evidence: 'Unauth provides contextual information for merchant review. Unauth does not make refund, fulfilment, account, or customer eligibility decisions.',
  watchlisted: 'Other merchants’ raw customer data is not exposed.',
  cta_label: 'Open case in Unauth →',
  cta_url: `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? ''}/settings/integrations`,
  basic_unlock_url: '',
  full_unlock_url: '',
  evidence_unlock_url: '',
  basic_unlock_label: CONTEXT_UNLOCK_CTA_LABELS.basic_context,
  full_unlock_label: CONTEXT_UNLOCK_CTA_LABELS.full_context,
  evidence_unlock_label: CONTEXT_UNLOCK_CTA_LABELS.evidence_summary,
};

type WidgetReturnContext = {
  email: string;
  merchantId: string | null;
};

function logBuildMarker(): void {
  gorgiasWidgetLog('build_marker', { buildMarker: gorgiasWidgetBuildMarker() });
}

function isNotInNetworkFallback(body: GorgiasWidgetJsonPayload): boolean {
  return body.orders === 'Not seen at any store yet';
}

function logFallbackReturned(input: {
  reason: string;
  lookupDiagnostics: MerchantCustomerLookupDiagnostics | null;
  body: GorgiasWidgetJsonPayload;
  modelState: string;
}) {
  gorgiasWidgetLog('fallback_returned', {
    reason: input.reason,
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
  gorgiasWidgetLog('final_return', {
    branch,
    status,
    body: JSON.stringify(body),
    hasMerchantContext: Boolean(ctx.merchantId),
  });
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
    status,
    hasMerchantContext: Boolean(ctx.merchantId),
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

/** Non-production only: `?widget_diagnostic=1` enables detailed pre-unlock stats in HTML. */
function widgetJsonOptions(request: NextRequest): GorgiasWidgetJsonOptions {
  if (process.env.NODE_ENV === 'production') return {};
  if (request.nextUrl.searchParams.get('widget_diagnostic') !== '1') return {};
  return { allowDetailedPreview: true };
}

async function enrichWidgetJsonOptions(
  service: SupabaseClient,
  merchantId: string,
  base: GorgiasWidgetJsonOptions,
  link?: GorgiasWidgetLinkContext,
): Promise<GorgiasWidgetJsonOptions> {
  if (!link || !hasGorgiasUnlockCaseScope(link)) return base;
  const snapshot = await getContextCreditSnapshot(service, merchantId);
  const creditUsage = buildCreditUsageWidgetFields(snapshot, env.NEXT_PUBLIC_APP_URL);
  return { ...base, creditUsage };
}

function isUnresolvedGorgiasVar(value: string): boolean {
  return value.includes('{{') || value.includes('}}');
}

function resolveWidgetToken(request: NextRequest): string {
  const headerToken = request.headers.get(GORGIAS_WIDGET_TOKEN_HEADER)?.trim() ?? '';
  if (headerToken) return headerToken;
  return request.nextUrl.searchParams.get('widget_token')?.trim() ?? '';
}

function describeResultForLog(result: GorgiasClaimWidgetResult): {
  state: string;
  customerProfileFound: boolean;
  hasNetwork: boolean;
} {
  if (!result.ok) {
    return { state: result.kind, customerProfileFound: false, hasNetwork: false };
  }
  return {
    state: 'ok',
    customerProfileFound: result.data.thisStore.claimCount > 0 || result.data.thisStore.orderCount > 0,
    hasNetwork: result.data.network !== null,
  };
}

function returnJsonForResult(input: {
  branch: string;
  result: GorgiasClaimWidgetResult;
  lookupDiagnostics: MerchantCustomerLookupDiagnostics | null;
  ctx: WidgetReturnContext;
  returnHtml: boolean;
  status?: number;
  linkContext?: GorgiasWidgetLinkContext;
  widgetJsonOptions?: GorgiasWidgetJsonOptions;
}): NextResponse {
  const body = claimWidgetToJson(input.result, input.linkContext, input.widgetJsonOptions);
  const status = input.status ?? 200;
  const state = input.result.ok ? 'ok' : input.result.kind;

  if (!input.result.ok && input.result.kind === 'not_found') {
    logFallbackReturned({
      reason: 'customer_profile_not_found',
      lookupDiagnostics: input.lookupDiagnostics,
      body,
      modelState: state,
    });
  } else if (!input.result.ok) {
    logFallbackReturned({
      reason: 'error_result',
      lookupDiagnostics: input.lookupDiagnostics,
      body,
      modelState: state,
    });
  } else if (isNotInNetworkFallback(body)) {
    logFallbackReturned({
      reason: 'not_in_network_payload',
      lookupDiagnostics: input.lookupDiagnostics,
      body,
      modelState: state,
    });
  }

  if (!input.returnHtml) {
    return returnWidgetJson(input.branch, body, status, input.ctx);
  }

  const html = renderGorgiasWidgetHtml({
    result: input.result,
    profileUrl: input.result.ok ? input.result.data.profileUrl : null,
    link: input.linkContext,
    options: input.widgetJsonOptions,
  });

  return returnWidgetHtml(input.branch, html, status, input.ctx);
}

function errorResult(message: string): GorgiasClaimWidgetResult {
  return { ok: false, kind: 'error', message };
}

async function hasActiveGorgiasConnection(service: SupabaseClient, merchantId: string): Promise<boolean> {
  const { data, error } = await service
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('provider', 'gorgias')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (error) {
    gorgiasWidgetLog('helpdesk_connection_check_failed', {
      merchantId,
      errorMessage: error.message,
    });
    return false;
  }

  return Boolean(data);
}

export async function GET(request: NextRequest) {
  logBuildMarker();

  const ctx: WidgetReturnContext = { email: '', merchantId: null };

  try {
    const { searchParams } = new URL(request.url);
    const widgetToken = resolveWidgetToken(request);
    const emailParam = searchParams.get('email')?.trim() ?? '';
    const customerEmailParam = searchParams.get('customer_email')?.trim() ?? '';
    const ticketIdParam = searchParams.get('ticket_id')?.trim() ?? '';
    const name = searchParams.get('name')?.trim() ?? '';
    const orderId = searchParams.get('order_id')?.trim() ?? '';
    const returnHtml = wantsHtmlResponse(request);
    const jsonOptions = widgetJsonOptions(request);

    const requestIp = getClientIp(request.headers);

    gorgiasWidgetLog('request', {
      emailUnresolved: isUnresolvedGorgiasVar(emailParam),
      customerEmailUnresolved: isUnresolvedGorgiasVar(customerEmailParam),
      ticketIdPresent: Boolean(ticketIdParam && !isUnresolvedGorgiasVar(ticketIdParam)),
      orderIdPresent: Boolean(orderId),
      returnHtml,
      hasWidgetToken: Boolean(widgetToken),
      wtFromHeader: Boolean(request.headers.get(GORGIAS_WIDGET_TOKEN_HEADER)?.trim()),
      buildMarker: gorgiasWidgetBuildMarker(),
    });

    if (!widgetToken) {
      return returnJsonForResult({
        branch: 'missing_widget_token',
        result: errorResult('Missing widget token in widget URL.'),
        lookupDiagnostics: null,
        ctx,
        returnHtml,
        status: 401,
        widgetJsonOptions: jsonOptions,
      });
    }

    const authResult = await validateWidgetToken(widgetToken);

    if ('status' in authResult) {
      gorgiasWidgetLog('widget_token_invalid', {
        status: authResult.status,
      });
      return returnJsonForResult({
        branch: 'invalid_widget_token',
        result: errorResult('Invalid widget token. Check Unauth \u2192 Settings \u2192 API & Integrations.'),
        lookupDiagnostics: null,
        ctx,
        returnHtml,
        status: authResult.status === 500 ? 500 : 401,
        widgetJsonOptions: jsonOptions,
      });
    }

    ctx.merchantId = authResult.merchantId;

    gorgiasWidgetLog('widget_token_valid', {});

    const service = createServiceClient();

    const gorgiasConnected = await hasActiveGorgiasConnection(service, authResult.merchantId);
    if (!gorgiasConnected) {
      return returnJsonForResult({
        branch: 'helpdesk_disconnected',
        result: {
          ok: false,
          kind: 'helpdesk_disconnected',
          message: 'Gorgias is not connected to Unauth. Reconnect it in Unauth settings to show live claim context in this widget.',
        },
        lookupDiagnostics: null,
        ctx,
        returnHtml,
        status: 200,
        widgetJsonOptions: jsonOptions,
      });
    }

    const resolvedIdentity = await resolveWidgetCustomerIdentity(service, {
      merchantId: authResult.merchantId,
      emailParam,
      customerEmailParam,
      ticketIdParam: isUnresolvedGorgiasVar(ticketIdParam) ? '' : ticketIdParam,
    });

    const email = resolvedIdentity.rawEmail;
    ctx.email = email;

    if (resolvedIdentity.identityUnresolved || !isUsableWidgetEmailParam(email)) {
      return returnJsonForResult({
        branch: 'identity_unresolved',
        result: {
          ok: false,
          kind: 'identity_unresolved',
          message: 'Customer identity not resolved for this ticket.',
        },
        lookupDiagnostics: null,
        ctx,
        returnHtml,
        status: 200,
        widgetJsonOptions: jsonOptions,
      });
    }

    const ticketRef = isUnresolvedGorgiasVar(ticketIdParam) ? null : ticketIdParam;
    const orderRef = isUnresolvedGorgiasVar(orderId) ? '' : orderId;

    const linkContext: GorgiasWidgetLinkContext = {
      widgetToken,
      email,
      ticketRef,
      orderRef: orderRef || null,
    };

    const { result, lookupDiagnostics } = await buildGorgiasClaimWidgetData(
      service,
      {
        merchantId: authResult.merchantId,
        apiKeyId: authResult.apiKeyId,
        requestIp,
      },
      {
        rawEmail: email,
        rawName: isUnresolvedGorgiasVar(name) ? '' : name,
        orderId: orderRef,
      }
    );

    gorgiasWidgetLog('customer_lookup.result', describeResultForLog(result));

    const enrichedJsonOptions = await enrichWidgetJsonOptions(
      service,
      authResult.merchantId,
      jsonOptions,
      linkContext,
    );

    return returnJsonForResult({
      branch: result.ok ? 'result_ok' : `result_${result.kind}`,
      result,
      lookupDiagnostics,
      ctx,
      returnHtml,
      linkContext,
      widgetJsonOptions: enrichedJsonOptions,
    });
  } catch (err) {
    gorgiasWidgetLogError('fatal_error', err);
    const message = err instanceof Error ? err.message : 'unknown_error';
    const body: GorgiasWidgetJsonPayload = {
      ...GORGIAS_WIDGET_JSON_FALLBACK,
      recent_activity: `Error: ${message}`.slice(0, 100),
    };
    logFallbackReturned({
      reason: 'fatal_error',
      lookupDiagnostics: null,
      body,
      modelState: 'error',
    });
    return returnWidgetJson('fatal_error', body, 500, ctx);
  }
}
