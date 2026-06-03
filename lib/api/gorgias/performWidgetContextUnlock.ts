import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getContextCreditCost,
  type ContextUnlockType,
} from '@/lib/billing/contextCredits';
import { getSubscribedMerchantTier } from '@/lib/billing/getMerchantTier';
import { TIER_CONFIG } from '@/lib/billing/tiers';
import {
  creditFailureResponse,
  NETWORK_PAUSED_AT_CAP_MESSAGE,
  precheckContextCredits,
  spendContextCreditsAfterSuccess,
} from '@/lib/billing/contextUnlockFlow';
import {
  CONTEXT_REVIEW_DISCLAIMER,
  formatContextLookupResults,
  runWidgetContextProfileSearch,
} from '@/lib/api/lookup/contextLookupCore';

export type WidgetContextUnlockParams = {
  merchantId: string;
  apiKeyId: string;
  requestIp: string;
  contextType: ContextUnlockType;
  rawEmail: string;
  rawName?: string;
  ticketRef?: string | null;
  orderRef?: string | null;
  claimId?: string | null;
  customerRef?: string | null;
};

export type WidgetContextUnlockResult =
  | { status: 200; json: Record<string, unknown> }
  | { status: number; json: Record<string, unknown> };

function hasCaseScope(params: WidgetContextUnlockParams): boolean {
  return Boolean(
    params.ticketRef?.trim() ||
      params.orderRef?.trim() ||
      params.claimId?.trim() ||
      params.customerRef?.trim(),
  );
}

export async function performWidgetContextUnlock(
  service: SupabaseClient,
  params: WidgetContextUnlockParams,
): Promise<WidgetContextUnlockResult> {
  if (!params.rawEmail.trim()) {
    return { status: 400, json: { error: 'email is required for widget context unlock' } };
  }

  if (!hasCaseScope(params)) {
    return {
      status: 400,
      json: {
        error:
          'A case-scoped reference is required (ticket_ref, order_ref, claim_id, or customer_ref).',
      },
    };
  }

  if (params.contextType === 'evidence_summary') {
    const tier = await getSubscribedMerchantTier(service, params.merchantId);
    if (TIER_CONFIG[tier].features.evidence_export_raw !== true) {
      return {
        status: 403,
        json: {
          error:
            'Case Reports are available on paid plans (Pro or higher). Upgrade for more monthly context credits.',
        },
      };
    }
  }

  const creditPrecheck = await precheckContextCredits(
    service,
    params.merchantId,
    params.contextType,
  );
  if (!creditPrecheck.ok) {
    return {
      status: creditPrecheck.status,
      json: creditFailureResponse({
        contextType: params.contextType,
        creditsRequired: creditPrecheck.creditsRequired,
        remaining: creditPrecheck.snapshot.remaining,
        error: creditPrecheck.error,
      }),
    };
  }

  const networkPausedFallback = creditPrecheck.mode.kind === 'network_paused_fallback';
  const softCapBasic =
    creditPrecheck.mode.kind === 'soft_cap_basic' ||
    networkPausedFallback;

  if (
    creditPrecheck.mode.kind === 'standard' &&
    creditPrecheck.snapshot.usageBand === 'exhausted' &&
    params.contextType === 'evidence_summary'
  ) {
    return {
      status: 402,
      json: creditFailureResponse({
        contextType: params.contextType,
        creditsRequired: getContextCreditCost(params.contextType),
        remaining: 0,
        error:
          'Monthly credits are used up. Case Report is paused until you add a top-up or your allowance resets. Store Check still works.',
      }),
    };
  }

  const resultContextType: ContextUnlockType = networkPausedFallback
    ? 'basic_context'
    : params.contextType;

  const search = await runWidgetContextProfileSearch(
    service,
    params.merchantId,
    {
      rawEmail: params.rawEmail,
      rawName: params.rawName ?? '',
    },
  );

  if (!search.ok) {
    void service.from('access_audit_log').insert({
      merchant_id: params.merchantId,
      query_type: 'gorgias_widget_unlock',
      k_anonymity_satisfied: false,
      result_returned: false,
      queried_hashes: search.queriedHashes,
      matched_merchant_count: 0,
      lookup_type: 'gorgias_widget_unlock',
      request_ip: params.requestIp,
    });
    return { status: 500, json: { error: 'Search failed' } };
  }

  const results = formatContextLookupResults(
    params.merchantId,
    resultContextType,
    search.rawRows,
  );

  if (results.length === 0) {
    void service.from('access_audit_log').insert({
      merchant_id: params.merchantId,
      query_type: 'gorgias_widget_unlock',
      k_anonymity_satisfied: false,
      result_returned: false,
      queried_hashes: search.queriedHashes,
      matched_merchant_count: 0,
      lookup_type: 'gorgias_widget_unlock',
      request_ip: params.requestIp,
    });
    return {
      status: 404,
      json: {
        error: 'No context profile matched this case. Credits were not spent.',
        results: [],
        total: 0,
        contextType: params.contextType,
        creditsSpent: 0,
        remainingCredits: creditPrecheck.snapshot.remaining,
        disclaimer: CONTEXT_REVIEW_DISCLAIMER,
        ticketRef: params.ticketRef ?? null,
        orderRef: params.orderRef ?? null,
        claimId: params.claimId ?? null,
      },
    };
  }

  const creditsToSpend = networkPausedFallback
    ? getContextCreditCost('basic_context')
    : getContextCreditCost(params.contextType);

  const creditSpend = await spendContextCreditsAfterSuccess(service, {
    merchantId: params.merchantId,
    contextType: resultContextType,
    claimId: params.claimId ?? null,
    ticketRef: params.ticketRef ?? null,
    orderRef: params.orderRef ?? null,
    customerRef: params.customerRef ?? null,
    allowSoftCap: softCapBasic,
    metadata: {
      request_source: 'widget',
      api_key_id: params.apiKeyId,
      ...(networkPausedFallback
        ? {
            network_paused_fallback: true,
            requested_context_type: params.contextType,
          }
        : {}),
      ...(softCapBasic && !networkPausedFallback ? { soft_cap_basic: true } : {}),
    },
  });

  if (!creditSpend.ok) {
    return {
      status: 402,
      json: creditFailureResponse({
        contextType: params.contextType,
        creditsRequired: creditSpend.creditsRequired,
        remaining: creditSpend.snapshot.remaining,
        error: 'Not enough context credits remaining for this review.',
      }),
    };
  }

  void service.from('access_audit_log').insert({
    merchant_id: params.merchantId,
    query_type: 'gorgias_widget_unlock',
    k_anonymity_satisfied: true,
    result_returned: true,
    queried_hashes: search.queriedHashes,
    matched_merchant_count: results.length,
    lookup_type: 'gorgias_widget_unlock',
    request_ip: params.requestIp,
  });

  return {
    status: 200,
    json: {
      results,
      total: results.length,
      contextType: params.contextType,
      deliveredContextType: resultContextType,
      creditsSpent: creditsToSpend,
      remainingCredits: creditSpend.snapshot.remaining,
      disclaimer: CONTEXT_REVIEW_DISCLAIMER,
      networkPausedNotice: networkPausedFallback ? NETWORK_PAUSED_AT_CAP_MESSAGE : null,
      ticketRef: params.ticketRef ?? null,
      orderRef: params.orderRef ?? null,
      claimId: params.claimId ?? null,
    },
  };
}
