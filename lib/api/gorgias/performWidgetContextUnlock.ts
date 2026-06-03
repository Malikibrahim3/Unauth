import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getContextCreditCost,
  type ContextUnlockType,
} from '@/lib/billing/contextCredits';
import { getSubscribedMerchantTier } from '@/lib/billing/getMerchantTier';
import { TIER_CONFIG } from '@/lib/billing/tiers';
import {
  creditFailureResponse,
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
            'Evidence summaries are available on paid plans (Pro or higher). Upgrade for more monthly context credits.',
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
    params.contextType,
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

  const creditSpend = await spendContextCreditsAfterSuccess(service, {
    merchantId: params.merchantId,
    contextType: params.contextType,
    claimId: params.claimId ?? null,
    ticketRef: params.ticketRef ?? null,
    orderRef: params.orderRef ?? null,
    customerRef: params.customerRef ?? null,
    metadata: {
      request_source: 'widget',
      api_key_id: params.apiKeyId,
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
      creditsSpent: getContextCreditCost(params.contextType),
      remainingCredits: creditSpend.snapshot.remaining,
      disclaimer: CONTEXT_REVIEW_DISCLAIMER,
      ticketRef: params.ticketRef ?? null,
      orderRef: params.orderRef ?? null,
      claimId: params.claimId ?? null,
    },
  };
}
