import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import { enforceEntitlement } from '@/lib/product/requireEntitlement';
import { getClientIp } from '@/lib/ratelimit';
import { type GorgiasClaimWidgetResult } from '@/lib/gorgias/widgetData';
import { buildGorgiasClaimWidgetDataV2 as buildGorgiasClaimWidgetData } from '@/lib/gorgias/widgetDataV2';
import type { MerchantCustomerLookupDiagnostics } from '@/lib/gorgias/findMerchantCustomerByEmail';
import { getContextCreditSnapshot } from '@/lib/billing/contextCredits';
import { TIER_ORDER } from '@/lib/billing/tiers';
import {
  claimWidgetToJson,
  formatClaimRecommendationUnavailable,
  formatNoPayoutCaseFields,
  formatPayoutWidgetDecision,
  formatRecommendationFields,
  type GorgiasWidgetJsonPayload,
  type GorgiasWidgetLinkContext,
  type GorgiasWidgetJsonOptions,
} from '@/lib/gorgias/widgetJson';
import { evaluateClaimDecision } from '@/lib/claims/decision/evaluate';
import { inferWidgetTicketClaimLike } from '@/lib/claims/decision/claimLikeness';
import { resolveClaimForTicketDecision } from '@/lib/claims/decision/resolveClaim';
import { fetchActiveMerchantRules } from '@/lib/rules/store';
import { env } from '@/lib/utils/env';
import { gorgiasWidgetLog, gorgiasWidgetLogError } from '@/lib/gorgias/widgetLog';
import { computeWidgetReviewLevel } from '@/lib/gorgias/widgetTrustSignals';
import { GORGIAS_FRAME_HEADERS, renderGorgiasWidgetHtml } from '@/lib/gorgias/renderWidgetHtml';
import { validateWidgetToken } from '@/lib/api/widgetTokens';
import { resolveWidgetCustomerIdentity } from '@/lib/gorgias/resolveWidgetCustomerIdentity';
import { GORGIAS_WIDGET_TOKEN_HEADER } from '@/lib/support/gorgias/registerSidebarWidget';
import { isUsableWidgetEmailParam } from '@/lib/support/gorgias/ticketCustomerEmail';
import { getMerchantGorgiasSupportConnection } from '@/lib/support/gorgias/settingsConnection';
import { isGorgiasHelpdeskLinkedForWidget } from '@/lib/support/gorgias/helpdeskLinkStatus';
import { TABLES } from '@/lib/supabase/tables';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

/** Deploy marker -- Vercel commit SHA when available (logging only). */
function gorgiasWidgetBuildMarker(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local';
}

const JSON_RESPONSE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
} as const;

const GORGIAS_WIDGET_JSON_FALLBACK: GorgiasWidgetJsonPayload = {
  identity: 'Case context preview unavailable',
  claims: 'Claim history unavailable',
  orders: 'Order context unavailable',
  claim_rate: '—',
  primary_reason: '—',
  recent_activity: '—',
  ce3_evidence: '—',
  evidence_summary: '—',
  evidence_breakdown: '—',
  watchlisted: '—',
  order_context: '—',
  context_summary: 'Context unavailable — check your Gorgias connection in Unauth settings',
  recommendation: '—',
  recommendation_detail: '—',
  payout_exposure: '—',
  evidence_checklist: '—',
  loss_attribution: '—',
  recovery_path: '—',
  cta_label: 'Open Unauth settings →',
  cta_url: `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? ''}/settings/integrations/gorgias`,
  basic_unlock_url: '',
  full_unlock_url: '',
  evidence_unlock_url: '',
  basic_unlock_label: 'Open full case →',
  full_unlock_label: 'Open full case →',
  evidence_unlock_label: 'Open full case →',
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

/** Single JSON exit -- always logs final_return before responding. */
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
): Promise<GorgiasWidgetJsonOptions> {
  const snapshot = await getContextCreditSnapshot(service, merchantId);
  const showNetworkIntelligence = TIER_ORDER[snapshot.tier] >= TIER_ORDER['growth'];
  return { ...base, showNetworkIntelligence };
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
  recommendationFields?: Pick<GorgiasWidgetJsonPayload, 'recommendation' | 'recommendation_detail'>;
  payoutFields?: Pick<
    GorgiasWidgetJsonPayload,
    'payout_exposure' | 'evidence_checklist' | 'recommendation' | 'recovery_path'
  >;
}): NextResponse {
  const body = {
    ...claimWidgetToJson(input.result, input.linkContext, input.widgetJsonOptions),
    ...(input.recommendationFields ?? {}),
    ...(input.payoutFields ?? {}),
  };
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
    const orderNumber = searchParams.get('order_number')?.trim() ?? '';
    const returnHtml = wantsHtmlResponse(request);
    const jsonOptions = widgetJsonOptions(request);

    const requestIp = getClientIp(request.headers);

    gorgiasWidgetLog('request', {
      emailUnresolved: isUnresolvedGorgiasVar(emailParam),
      customerEmailUnresolved: isUnresolvedGorgiasVar(customerEmailParam),
      ticketIdPresent: Boolean(ticketIdParam && !isUnresolvedGorgiasVar(ticketIdParam)),
      orderIdPresent: Boolean(orderId),
      orderNumberPresent: Boolean(orderNumber),
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

    const widgetGate = await enforceEntitlement(service, authResult.merchantId, 'HELPDESK_WIDGET');
    if (widgetGate) return widgetGate;

    let gorgiasConnection = null;
    try {
      gorgiasConnection = await getMerchantGorgiasSupportConnection(service, authResult.merchantId);
    } catch (err) {
      gorgiasWidgetLog('helpdesk_connection_check_failed', {
        merchantId: authResult.merchantId,
        errorMessage: err instanceof Error ? err.message : 'unknown',
      });
    }
    if (!isGorgiasHelpdeskLinkedForWidget(gorgiasConnection)) {
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
    const resolvedOrderId = isUnresolvedGorgiasVar(orderId) ? '' : orderId;
    const resolvedOrderNumber = isUnresolvedGorgiasVar(orderNumber) ? '' : orderNumber;
    const orderRef = resolvedOrderId || resolvedOrderNumber;

    const linkContext: GorgiasWidgetLinkContext = {
      widgetToken,
      email,
      ticketRef,
      orderRef: orderRef || null,
    };

    let linkedIdentityId: string | null = null;
    if (ticketRef) {
      const { data: ticket } = await service
        .from(TABLES.SUPPORT_CASE_INTAKE)
        .select('id')
        .eq('merchant_id', authResult.merchantId)
        .eq('external_id', ticketRef)
        .maybeSingle();
      if (ticket?.id) {
        const { data: claim } = await service
          .from(TABLES.MERCHANT_CLAIMS)
          .select('identity_id')
          .eq('merchant_id', authResult.merchantId)
          .eq('source_ticket_id', ticket.id)
          .not('identity_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        linkedIdentityId = (claim?.identity_id as string | null) ?? null;
      }
    }

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
        linkedIdentityId,
      }
    );

    gorgiasWidgetLog('customer_lookup.result', describeResultForLog(result));

    if (result.ok) {
      gorgiasWidgetLog('widget_signals', {
        trustLevel: computeWidgetReviewLevel({
          orderCount: result.data.thisStore.orderCount,
          claimCount: result.data.thisStore.claimCount,
          claimRate: result.data.thisStore.claimRate,
          recentClaimCount: result.data.storeRecentClaimCount,
          confidenceGrade: null,
          networkSignalAvailable: result.data.network !== null,
          ce3EvidenceAvailable: result.data.ce3EvidenceAvailable,
        }),
        ce3EvidenceAvailable: result.data.ce3EvidenceAvailable,
        networkSignalAvailable: result.data.network !== null,
        orderRefUsed: Boolean(orderRef),
        profileUrlGenerated: Boolean(result.data.profileUrl),
        storeOrders: result.data.thisStore.orderCount,
        storeClaims: result.data.thisStore.claimCount,
        storeClaimRatePct: Math.round(result.data.thisStore.claimRate * 100),
        ordersCountSource: result.data.thisStore.ordersCountSource,
      });
    }

    const enrichedJsonOptions = await enrichWidgetJsonOptions(
      service,
      authResult.merchantId,
      jsonOptions,
    );
    gorgiasWidgetLog('widget_options', { showNetworkIntelligence: enrichedJsonOptions.showNetworkIntelligence });

    // Recommendation layer — claim-scoped when resolvable; identity fallback only
    // for non-claim-like tickets. Claim-like tickets without a resolved claim show
    // explicit unavailable copy instead of a misleading identity recommendation.
    let recommendationFields:
      | Pick<GorgiasWidgetJsonPayload, 'recommendation' | 'recommendation_detail'>
      | undefined;
    let payoutFields:
      | Pick<GorgiasWidgetJsonPayload, 'payout_exposure' | 'evidence_checklist' | 'recommendation' | 'recovery_path'>
      | undefined;
    if (result.ok) {
      try {
        const resolution = await resolveClaimForTicketDecision(service, {
          merchantId: authResult.merchantId,
          ticketExternalId: ticketRef,
          orderReference: orderRef || null,
          allowEnsureClaim: false,
        });

        const claimLike = await inferWidgetTicketClaimLike(service, {
          merchantId: authResult.merchantId,
          ticketExternalId: ticketRef,
          resolution,
        });

        gorgiasWidgetLog('claim_resolution', {
          status: resolution.status,
          reason: resolution.reason,
          claimId: resolution.claimId,
          claimLike,
          candidateCount: resolution.candidates?.length ?? 0,
        });

        if (resolution.status === 'resolved' && resolution.claimId) {
          linkContext.claimId = resolution.claimId;
          const claimEval = await evaluateClaimDecision({
            client: service,
            merchantId: authResult.merchantId,
            claimId: resolution.claimId,
            source: 'gorgias_widget',
          });
          if (claimEval) {
            recommendationFields = formatRecommendationFields(
              claimEval.evaluation,
              claimEval.ruleCount,
              claimEval.payoutCase,
            );
            payoutFields = formatPayoutWidgetDecision(
              claimEval.evaluation,
              claimEval.payoutCase,
              claimEval.ruleCount,
            );
            gorgiasWidgetLog('rules_evaluated', {
              recommendation: claimEval.evaluation.recommendation,
              ruleCount: claimEval.ruleCount,
              ruleMatched: Boolean(claimEval.evaluation.rule_id),
              claimId: resolution.claimId,
              auditStatus: claimEval.auditStatus,
            });
          } else {
            const rules = await fetchActiveMerchantRules(service, authResult.merchantId);
            recommendationFields = formatClaimRecommendationUnavailable('eval_failed', {
              ruleCount: rules.length,
            });
            gorgiasWidgetLog('rules_evaluation_failed', { claimId: resolution.claimId, phase: 'claim_eval_null' });
          }
        } else if (resolution.status === 'ambiguous') {
          recommendationFields = formatClaimRecommendationUnavailable('ambiguous');
          payoutFields = formatNoPayoutCaseFields();
        } else if (claimLike) {
          recommendationFields = formatClaimRecommendationUnavailable('not_found');
          payoutFields = formatNoPayoutCaseFields();
        } else {
          recommendationFields = formatClaimRecommendationUnavailable('not_found');
          payoutFields = formatNoPayoutCaseFields();
          gorgiasWidgetLog('rules_evaluated', {
            recommendation: 'no_case',
            ruleCount: 0,
            ruleMatched: false,
            claimId: null,
            path: 'no_payout_case',
          });
        }
      } catch (evalErr) {
        gorgiasWidgetLogError('rules_evaluation_failed', evalErr);
      }
    }

    return returnJsonForResult({
      branch: result.ok ? 'result_ok' : `result_${result.kind}`,
      result,
      lookupDiagnostics,
      ctx,
      returnHtml,
      linkContext,
      widgetJsonOptions: enrichedJsonOptions,
      recommendationFields,
      payoutFields,
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
