import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { normaliseEmail } from '@/lib/identity/normalise';
import { getClientIp } from '@/lib/ratelimit';
import { buildGorgiasWidgetModel, type GorgiasWidgetModel } from '@/lib/gorgias/widgetData';
import {
  findMerchantCustomerByEmail,
  type MerchantCustomerByEmailRow,
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

const CUSTOMER_PROFILE_WIDGET_SELECT =
  'id, primary_email, emails, merchant_ids, risk_level, risk_score, fraud_flags, identity_confidence_grade';

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

function logBuildMarker(): void {
  console.log(`[gorgias.widget] build_marker ${gorgiasWidgetBuildMarker()}`);
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
  console.log('[gorgias.widget] before_final_return');
  gorgiasWidgetLog('final_return', {
    branch,
    email: ctx.email,
    merchantId: ctx.merchantId,
    body: JSON.stringify(body),
    status,
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

type CustomerProfileWidgetRow = {
  id: string;
  primary_email: string | null;
  emails: unknown;
  merchant_ids: unknown;
  risk_level: string | null;
  risk_score: number | null;
  fraud_flags: unknown;
  identity_confidence_grade: string | null;
};

function merchantIdsIncludes(merchantIds: unknown, merchantId: string): boolean {
  if (!Array.isArray(merchantIds)) return false;
  return merchantIds.some((id) => String(id) === merchantId);
}

function profileMatchesEmail(row: CustomerProfileWidgetRow, normEmail: string): boolean {
  if (row.primary_email?.trim().toLowerCase() === normEmail) return true;
  if (!Array.isArray(row.emails)) return false;
  return row.emails.some((entry) => String(entry).trim().toLowerCase() === normEmail);
}

function parseFraudFlags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((flag) => String(flag)).filter(Boolean);
}

function rowToMerchantCustomer(row: CustomerProfileWidgetRow): MerchantCustomerByEmailRow {
  return {
    id: row.id,
    risk_level: String(row.risk_level ?? 'unknown'),
    risk_score: Number(row.risk_score ?? 0),
    fraud_flags: parseFraudFlags(row.fraud_flags),
    identity_confidence_grade:
      typeof row.identity_confidence_grade === 'string' ? row.identity_confidence_grade : null,
  };
}

/** customer_profiles emails jsonb requires JSON.stringify for PostgREST contains. */
async function findMerchantCustomerProfileForWidget(
  service: SupabaseClient,
  merchantId: string,
  normEmail: string
): Promise<{ customer: MerchantCustomerByEmailRow | null; diagnostics: MerchantCustomerLookupDiagnostics }> {
  const fromHelper = await findMerchantCustomerByEmail(service, merchantId, normEmail);
  if (fromHelper.customer) {
    return fromHelper;
  }

  const [primaryRes, emailsRes] = await Promise.all([
    service.from(TABLES.CUSTOMER_PROFILES).select(CUSTOMER_PROFILE_WIDGET_SELECT).eq('primary_email', normEmail),
    service
      .from(TABLES.CUSTOMER_PROFILES)
      .select(CUSTOMER_PROFILE_WIDGET_SELECT)
      .contains('emails', JSON.stringify([normEmail])),
  ]);

  if (primaryRes.error) {
    gorgiasWidgetLog('customer_lookup.primary_email_error', {
      message: primaryRes.error.message,
      code: primaryRes.error.code ?? null,
    });
  }
  if (emailsRes.error) {
    gorgiasWidgetLog('customer_lookup.emails_contains_error', {
      message: emailsRes.error.message,
      code: emailsRes.error.code ?? null,
    });
  }

  const primaryRows = (primaryRes.data ?? []) as CustomerProfileWidgetRow[];
  const emailsRows = (emailsRes.data ?? []) as CustomerProfileWidgetRow[];
  const diagnostics: MerchantCustomerLookupDiagnostics = {
    ...fromHelper.diagnostics,
    primaryEmailCandidateRows: Math.max(fromHelper.diagnostics.primaryEmailCandidateRows, primaryRows.length),
    emailsContainsCandidateRows: Math.max(fromHelper.diagnostics.emailsContainsCandidateRows, emailsRows.length),
  };

  const byId = new Map<string, CustomerProfileWidgetRow>();
  for (const row of [...primaryRows, ...emailsRows]) {
    byId.set(row.id, row);
  }

  const merchantScoped = [...byId.values()].filter((row) => merchantIdsIncludes(row.merchant_ids, merchantId));
  diagnostics.merchantScopedRows = merchantScoped.length;

  const matched = merchantScoped
    .filter((row) => profileMatchesEmail(row, normEmail))
    .sort((a, b) => Number(b.risk_score ?? 0) - Number(a.risk_score ?? 0));

  diagnostics.emailMatchedRows = matched.length;
  const row = matched[0] ?? null;

  gorgiasWidgetLog('customer_lookup.widget_route_result', {
    found: Boolean(row),
    profileId: row?.id ?? null,
    merchantScopedRows: diagnostics.merchantScopedRows,
    emailMatchedRows: diagnostics.emailMatchedRows,
  });

  if (!row) {
    return { customer: null, diagnostics };
  }

  return { customer: rowToMerchantCustomer(row), diagnostics };
}

export async function GET(request: NextRequest) {
  logBuildMarker();
  console.log('[gorgias.widget] after_build_marker');

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

    console.log('[gorgias.widget] before_request_log');
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
    console.log('[gorgias.widget] after_request_log');

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

    console.log('[gorgias.widget] before_token_validation');
    const authResult = await validateWidgetToken(widgetToken);
    console.log('[gorgias.widget] after_token_validation');

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
      const { customer, diagnostics } = await findMerchantCustomerProfileForWidget(
        service,
        authResult.merchantId,
        normEmail
      );
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
