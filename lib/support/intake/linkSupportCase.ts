import { ACTIVE_CLAIM_STATUSES, FINAL_CLAIM_STATUSES } from '@/lib/claims/sla';
import { TABLES } from '@/lib/supabase/tables';
import type { SupportProvider } from '@/lib/support/providers/types';
import { appendSupportCaseEvent } from '@/lib/support/intake/store';

export const SUPPORT_LINK_STATUSES = [
  'unlinked',
  'linked',
  'partial',
  'ambiguous',
  'not_found',
] as const;

export type SupportLinkStatus = (typeof SUPPORT_LINK_STATUSES)[number];

export type SupportCaseIntakeLinkRow = {
  id: string;
  merchant_id: string;
  provider: string;
  customer_identifier: string | null;
  shop_domain: string | null;
  order_ref: string | null;
  claim_reason: string | null;
  shopify_order_id: string | null;
  customer_profile_id: string | null;
  merchant_claim_id: string | null;
  link_status: string;
  link_metadata: Record<string, unknown>;
};

export type SupportCaseLinkResult = {
  link_status: SupportLinkStatus;
  shopify_order_id: string | null;
  customer_profile_id: string | null;
  merchant_claim_id: string | null;
  link_metadata: Record<string, unknown>;
};

type ShopifyOrderMatch = {
  shopify_order_id: string;
  order_number: string | null;
  customer_id: string | null;
  shop_domain: string;
};

type ServiceClient = {
  from: (table: string) => Record<string, unknown>;
};

const LINKABLE_CLAIM_STATUSES = [...ACTIVE_CLAIM_STATUSES, ...FINAL_CLAIM_STATUSES];

const CLAIM_REASON_TO_TYPE: Record<string, string> = {
  missing_parcel: 'missing_parcel',
  refund_request: 'refund_request',
  return_request: 'return_abuse',
  wrong_item: 'wrong_item',
  damaged_item: 'damaged',
  dispute: 'chargeback',
};

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function uniq(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v)));
}

function normalizeNumericOrderRef(orderRef: string): string | null {
  const trimmed = orderRef.trim();
  const hashMatch = trimmed.match(/^#(\d+)$/);
  if (hashMatch?.[1]) return hashMatch[1];
  if (/^\d+$/.test(trimmed)) return trimmed;
  return null;
}

export function matchShopifyOrdersByOrderRef(
  orders: ShopifyOrderMatch[],
  orderRef: string
): ShopifyOrderMatch[] {
  const trimmed = orderRef.trim();
  const numeric = normalizeNumericOrderRef(trimmed);

  return orders.filter((order) => {
    const orderNumber = order.order_number?.trim() ?? '';
    const shopifyOrderId = order.shopify_order_id.trim();
    if (shopifyOrderId === trimmed || orderNumber === trimmed) return true;
    if (numeric) {
      if (orderNumber === numeric || orderNumber === `#${numeric}`) return true;
      if (shopifyOrderId === numeric) return true;
    }
    return false;
  });
}

async function loadSupportCase(
  supabase: ServiceClient,
  supportCaseId: string,
  merchantId: string
): Promise<SupportCaseIntakeLinkRow | null> {
  const { data, error } = await (supabase.from(TABLES.SUPPORT_CASE_INTAKE) as {
    select: (columns: string) => {
      eq: (col: string, val: string) => {
        eq: (col2: string, val2: string) => {
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
        };
      };
    };
  })
    .select(
      'id, merchant_id, provider, customer_identifier, shop_domain, order_ref, claim_reason, shopify_order_id, customer_profile_id, merchant_claim_id, link_status, link_metadata'
    )
    .eq('id', supportCaseId)
    .eq('merchant_id', merchantId)
    .maybeSingle();

  if (error) throw new Error(`load_support_case_failed: ${error.message}`);
  if (!data) return null;

  return {
    id: String(data.id),
    merchant_id: String(data.merchant_id),
    provider: String(data.provider),
    customer_identifier: asString(data.customer_identifier),
    shop_domain: asString(data.shop_domain),
    order_ref: asString(data.order_ref),
    claim_reason: asString(data.claim_reason),
    shopify_order_id: asString(data.shopify_order_id),
    customer_profile_id: asString(data.customer_profile_id),
    merchant_claim_id: asString(data.merchant_claim_id),
    link_status: asString(data.link_status) ?? 'unlinked',
    link_metadata:
      data.link_metadata && typeof data.link_metadata === 'object' && !Array.isArray(data.link_metadata)
        ? (data.link_metadata as Record<string, unknown>)
        : {},
  };
}

async function listShopifyOrdersForShop(
  supabase: ServiceClient,
  shopDomain: string
): Promise<ShopifyOrderMatch[]> {
  const { data, error } = await (supabase.from('shopify_order_signals') as {
    select: (columns: string) => {
      eq: (col: string, val: string) => Promise<{
        data: Array<Record<string, unknown>> | null;
        error: { message: string } | null;
      }>;
    };
  })
    .select('shopify_order_id, order_number, customer_id, shop_domain')
    .eq('shop_domain', shopDomain);

  if (error) throw new Error(`list_shopify_orders_failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    shopify_order_id: String(row.shopify_order_id),
    order_number: asString(row.order_number),
    customer_id: asString(row.customer_id),
    shop_domain: String(row.shop_domain),
  }));
}

async function findProfileIdsByIdentity(
  supabase: ServiceClient,
  merchantId: string,
  identityType: string,
  identityValue: string
): Promise<string[]> {
  const { data, error } = await (supabase.from('customer_profile_identities') as {
    select: (columns: string) => {
      eq: (col: string, val: string) => {
        eq: (col2: string, val2: string) => {
          eq: (col3: string, val3: string) => Promise<{
            data: Array<{ customer_profile_id: string }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  })
    .select('customer_profile_id')
    .eq('merchant_id', merchantId)
    .eq('identity_type', identityType)
    .eq('identity_value', identityValue);

  if (error) throw new Error(`find_profile_identity_failed: ${error.message}`);
  return uniq((data ?? []).map((row) => row.customer_profile_id));
}

async function resolveCustomerProfileFromOrder(
  supabase: ServiceClient,
  merchantId: string,
  order: ShopifyOrderMatch
): Promise<{ profileId: string | null; ambiguous: boolean }> {
  const profileIds = new Set<string>();

  if (order.customer_id) {
    for (const id of await findProfileIdsByIdentity(
      supabase,
      merchantId,
      'shopify_customer_id',
      order.customer_id
    )) {
      profileIds.add(id);
    }
  }

  for (const id of await findProfileIdsByIdentity(
    supabase,
    merchantId,
    'shopify_order_id',
    order.shopify_order_id
  )) {
    profileIds.add(id);
  }

  if (profileIds.size > 1) return { profileId: null, ambiguous: true };
  if (profileIds.size === 1) return { profileId: [...profileIds][0], ambiguous: false };
  return { profileId: null, ambiguous: false };
}

async function findExistingMerchantClaim(
  supabase: ServiceClient,
  input: {
    merchantId: string;
    shopDomain: string | null;
    shopifyOrderId: string | null;
    orderRef: string | null;
    claimReason: string | null;
  }
): Promise<{ claimId: string | null; ambiguous: boolean }> {
  const { data, error } = await (supabase.from('merchant_claims') as {
    select: (columns: string) => {
      eq: (col: string, val: string) => {
        in: (col: string, values: string[]) => Promise<{
          data: Array<Record<string, unknown>> | null;
          error: { message: string } | null;
        }>;
      };
    };
  })
    .select('id, claim_type, status, shopify_order_id, shop_domain')
    .eq('merchant_id', input.merchantId)
    .in('status', LINKABLE_CLAIM_STATUSES);

  if (error) throw new Error(`find_merchant_claim_failed: ${error.message}`);

  const matches = (data ?? []).filter((claim) => {
    const claimShopifyOrderId = asString(claim.shopify_order_id);
    const claimShopDomain = asString(claim.shop_domain);
    const shopifyMatch = input.shopifyOrderId && claimShopifyOrderId === input.shopifyOrderId;
    const orderRefMatch =
      input.orderRef &&
      claimShopifyOrderId === input.orderRef &&
      !input.shopifyOrderId;
    if (!shopifyMatch && !orderRefMatch) return false;
    if (input.shopDomain && claimShopDomain && claimShopDomain !== input.shopDomain) return false;
    return true;
  });

  if (matches.length === 1) return { claimId: String(matches[0].id), ambiguous: false };
  if (matches.length > 1) return { claimId: null, ambiguous: true };
  return { claimId: null, ambiguous: false };
}

function computeLinkStatus(parts: {
  orderLinked: boolean;
  customerLinked: boolean;
  claimLinked: boolean;
  claimCandidate: boolean;
  orderAmbiguous: boolean;
  customerAmbiguous: boolean;
  claimAmbiguous: boolean;
}): SupportLinkStatus {
  if (parts.orderAmbiguous || parts.customerAmbiguous || parts.claimAmbiguous) {
    return 'ambiguous';
  }
  const anyLink = parts.orderLinked || parts.customerLinked || parts.claimLinked;
  if (!anyLink && !parts.claimCandidate) return 'not_found';
  if (parts.orderLinked && parts.customerLinked && (parts.claimLinked || parts.claimCandidate)) {
    return 'linked';
  }
  if (anyLink || parts.claimCandidate) return 'partial';
  return 'not_found';
}

async function persistSupportCaseLinks(
  supabase: ServiceClient,
  supportCaseId: string,
  merchantId: string,
  patch: {
    shopify_order_id: string | null;
    customer_profile_id: string | null;
    merchant_claim_id: string | null;
    link_status: SupportLinkStatus;
    link_metadata: Record<string, unknown>;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await (supabase.from(TABLES.SUPPORT_CASE_INTAKE) as {
    update: (values: Record<string, unknown>) => {
      eq: (col: string, val: string) => {
        eq: (col2: string, val2: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  })
    .update({
      shopify_order_id: patch.shopify_order_id,
      customer_profile_id: patch.customer_profile_id,
      merchant_claim_id: patch.merchant_claim_id,
      link_status: patch.link_status,
      link_metadata: patch.link_metadata,
      linked_at: now,
      updated_at: now,
    })
    .eq('id', supportCaseId)
    .eq('merchant_id', merchantId);

  if (error) throw new Error(`update_support_case_links_failed: ${error.message}`);
}

async function appendLinkEvent(
  supabase: ServiceClient,
  input: {
    merchantId: string;
    supportCaseId: string;
    provider: SupportProvider;
    eventType: string;
    summary: string;
    metadata: Record<string, unknown>;
  }
): Promise<void> {
  await appendSupportCaseEvent(supabase as Parameters<typeof appendSupportCaseEvent>[0], {
    merchant_id: input.merchantId,
    support_case_id: input.supportCaseId,
    provider: input.provider,
    event_type: input.eventType,
    event_summary: input.summary,
    actor_type: 'system',
    metadata: input.metadata,
  });
}

async function recordLinkEvents(
  supabase: ServiceClient,
  supportCase: SupportCaseIntakeLinkRow,
  merchantId: string,
  result: SupportCaseLinkResult
): Promise<void> {
  if (result.shopify_order_id) {
    await appendLinkEvent(supabase, {
      merchantId,
      supportCaseId: supportCase.id,
      provider: supportCase.provider as SupportProvider,
      eventType: 'linked_shopify_order',
      summary: 'Linked support case to Shopify order',
      metadata: { shopify_order_id: result.shopify_order_id },
    });
  }

  if (result.customer_profile_id) {
    await appendLinkEvent(supabase, {
      merchantId,
      supportCaseId: supportCase.id,
      provider: supportCase.provider as SupportProvider,
      eventType: 'linked_customer_profile',
      summary: 'Linked support case to customer profile',
      metadata: { customer_profile_id: result.customer_profile_id },
    });
  }

  if (result.merchant_claim_id) {
    await appendLinkEvent(supabase, {
      merchantId,
      supportCaseId: supportCase.id,
      provider: supportCase.provider as SupportProvider,
      eventType: 'linked_merchant_claim',
      summary: 'Linked support case to existing merchant claim',
      metadata: { merchant_claim_id: result.merchant_claim_id },
    });
  } else if (result.link_metadata.claim_candidate) {
    await appendLinkEvent(supabase, {
      merchantId,
      supportCaseId: supportCase.id,
      provider: supportCase.provider as SupportProvider,
      eventType: 'claim_candidate_identified',
      summary: 'Support case flagged as claim candidate for review',
      metadata: {
        suggested_claim_type: result.link_metadata.suggested_claim_type ?? null,
      },
    });
  }

  if (result.link_status === 'not_found' || result.link_status === 'ambiguous') {
    await appendLinkEvent(supabase, {
      merchantId,
      supportCaseId: supportCase.id,
      provider: supportCase.provider as SupportProvider,
      eventType: result.link_status === 'ambiguous' ? 'link_ambiguous' : 'link_not_found',
      summary:
        result.link_status === 'ambiguous'
          ? 'Support case link ambiguous'
          : 'Support case link not found',
      metadata: result.link_metadata,
    });
  }
}

function buildLinkResultFromOrder(
  supportCase: SupportCaseIntakeLinkRow,
  order: ShopifyOrderMatch,
  customerResolution: { profileId: string | null; ambiguous: boolean },
  claimResolution: { claimId: string | null; ambiguous: boolean }
): SupportCaseLinkResult {
  const claimCandidate =
    !claimResolution.claimId &&
    !!supportCase.claim_reason &&
    (!!order.shopify_order_id || !!supportCase.order_ref) &&
    !!customerResolution.profileId;

  const linkMetadata: Record<string, unknown> = {
    order_match_count: 1,
    claim_candidate: claimCandidate,
    suggested_claim_type: supportCase.claim_reason
      ? CLAIM_REASON_TO_TYPE[supportCase.claim_reason] ?? null
      : null,
  };

  const linkStatus = computeLinkStatus({
    orderLinked: true,
    customerLinked: !!customerResolution.profileId,
    claimLinked: !!claimResolution.claimId,
    claimCandidate,
    orderAmbiguous: false,
    customerAmbiguous: customerResolution.ambiguous,
    claimAmbiguous: claimResolution.ambiguous,
  });

  return {
    link_status: linkStatus,
    shopify_order_id: order.shopify_order_id,
    customer_profile_id: customerResolution.profileId,
    merchant_claim_id: claimResolution.claimId,
    link_metadata: linkMetadata,
  };
}

export async function linkSupportCaseByOrderRef(
  supabase: unknown,
  input: { supportCaseId: string; merchantId: string; shopDomain: string; orderRef: string }
): Promise<SupportCaseLinkResult> {
  const client = supabase as ServiceClient;
  const supportCase = await loadSupportCase(client, input.supportCaseId, input.merchantId);
  if (!supportCase) {
    return {
      link_status: 'not_found',
      shopify_order_id: null,
      customer_profile_id: null,
      merchant_claim_id: null,
      link_metadata: { error: 'support_case_not_found' },
    };
  }

  const orders = await listShopifyOrdersForShop(client, input.shopDomain);
  const orderMatches = matchShopifyOrdersByOrderRef(orders, input.orderRef);

  if (orderMatches.length > 1) {
    return {
      link_status: 'ambiguous',
      shopify_order_id: null,
      customer_profile_id: null,
      merchant_claim_id: null,
      link_metadata: { order_match_count: orderMatches.length },
    };
  }

  if (orderMatches.length === 0) {
    return {
      link_status: 'not_found',
      shopify_order_id: null,
      customer_profile_id: null,
      merchant_claim_id: null,
      link_metadata: { order_match_count: 0 },
    };
  }

  const order = orderMatches[0];
  const [customerResolution, claimResolution] = await Promise.all([
    resolveCustomerProfileFromOrder(client, input.merchantId, order),
    findExistingMerchantClaim(client, {
      merchantId: input.merchantId,
      shopDomain: input.shopDomain,
      shopifyOrderId: order.shopify_order_id,
      orderRef: input.orderRef,
      claimReason: supportCase.claim_reason,
    }),
  ]);

  return buildLinkResultFromOrder(supportCase, order, customerResolution, claimResolution);
}

export async function linkSupportCaseByCustomerHash(
  supabase: unknown,
  input: { supportCaseId: string; merchantId: string; customerEmailHash: string }
): Promise<SupportCaseLinkResult> {
  const client = supabase as ServiceClient;
  const supportCase = await loadSupportCase(client, input.supportCaseId, input.merchantId);
  if (!supportCase) {
    return {
      link_status: 'not_found',
      shopify_order_id: null,
      customer_profile_id: null,
      merchant_claim_id: null,
      link_metadata: { error: 'support_case_not_found' },
    };
  }

  if (supportCase.customer_identifier) {
    const profileIds = await findProfileIdsByIdentity(
      client,
      input.merchantId,
      'shopify_customer_id',
      supportCase.customer_identifier
    );
    if (profileIds.length > 1) {
      return {
        link_status: 'ambiguous',
        shopify_order_id: supportCase.shopify_order_id,
        customer_profile_id: null,
        merchant_claim_id: null,
        link_metadata: { customer_match_count: profileIds.length },
      };
    }
    if (profileIds.length === 1) {
      return {
        link_status: 'partial',
        shopify_order_id: supportCase.shopify_order_id,
        customer_profile_id: profileIds[0],
        merchant_claim_id: supportCase.merchant_claim_id,
        link_metadata: { matched_via: 'customer_identifier' },
      };
    }
  }

  return {
    link_status: 'not_found',
    shopify_order_id: supportCase.shopify_order_id,
    customer_profile_id: null,
    merchant_claim_id: null,
    link_metadata: {
      reason: 'customer_email_hash_not_indexed',
      note: 'Email hashes are not stored on customer_profile_identities; link via order match instead.',
    },
  };
}

export async function linkSupportCaseToCommerceContext(
  supabase: unknown,
  input: { supportCaseId: string; merchantId: string }
): Promise<SupportCaseLinkResult> {
  const client = supabase as ServiceClient;

  try {
    const supportCase = await loadSupportCase(client, input.supportCaseId, input.merchantId);
    if (!supportCase) {
      return {
        link_status: 'not_found',
        shopify_order_id: null,
        customer_profile_id: null,
        merchant_claim_id: null,
        link_metadata: { error: 'support_case_not_found' },
      };
    }

    let result: SupportCaseLinkResult;

    if (supportCase.shop_domain && supportCase.order_ref) {
      result = await linkSupportCaseByOrderRef(client, {
        supportCaseId: input.supportCaseId,
        merchantId: input.merchantId,
        shopDomain: supportCase.shop_domain,
        orderRef: supportCase.order_ref,
      });
    } else if (supportCase.shop_domain && supportCase.shopify_order_id) {
      const orders = await listShopifyOrdersForShop(client, supportCase.shop_domain);
      const direct = orders.filter((o) => o.shopify_order_id === supportCase.shopify_order_id);
      if (direct.length > 1) {
        result = {
          link_status: 'ambiguous',
          shopify_order_id: null,
          customer_profile_id: null,
          merchant_claim_id: null,
          link_metadata: { order_match_count: direct.length },
        };
      } else if (direct.length === 1) {
        const order = direct[0];
        const customerResolution = await resolveCustomerProfileFromOrder(
          client,
          input.merchantId,
          order
        );
        const claimResolution = await findExistingMerchantClaim(client, {
          merchantId: input.merchantId,
          shopDomain: supportCase.shop_domain,
          shopifyOrderId: order.shopify_order_id,
          orderRef: supportCase.order_ref,
          claimReason: supportCase.claim_reason,
        });
        result = buildLinkResultFromOrder(
          supportCase,
          order,
          customerResolution,
          claimResolution
        );
      } else {
        result = {
          link_status: 'not_found',
          shopify_order_id: null,
          customer_profile_id: null,
          merchant_claim_id: null,
          link_metadata: { reason: 'shopify_order_id_not_found' },
        };
      }
    } else {
      result = {
        link_status: 'not_found',
        shopify_order_id: null,
        customer_profile_id: null,
        merchant_claim_id: null,
        link_metadata: { reason: 'missing_shop_domain_or_order_ref' },
      };
    }

    await persistSupportCaseLinks(client, input.supportCaseId, input.merchantId, {
      shopify_order_id: result.shopify_order_id,
      customer_profile_id: result.customer_profile_id,
      merchant_claim_id: result.merchant_claim_id,
      link_status: result.link_status,
      link_metadata: result.link_metadata,
    });
    await recordLinkEvents(client, supportCase, input.merchantId, result);
    return result;
  } catch (error) {
    const safeMessage = error instanceof Error ? error.message : 'link_failed';
    try {
      await appendLinkEvent(client, {
        merchantId: input.merchantId,
        supportCaseId: input.supportCaseId,
        provider: 'gorgias' as SupportProvider,
        eventType: 'link_failed',
        summary: 'Support case linking failed',
        metadata: { error: safeMessage },
      });
    } catch {
      // Linking must not break ingestion.
    }
    return {
      link_status: 'not_found',
      shopify_order_id: null,
      customer_profile_id: null,
      merchant_claim_id: null,
      link_metadata: { error: safeMessage },
    };
  }
}
