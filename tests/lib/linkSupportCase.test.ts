import { TABLES } from '@/lib/supabase/tables';
import {
  linkSupportCaseByOrderRef,
  linkSupportCaseToCommerceContext,
  matchShopifyOrdersByOrderRef,
} from '@/lib/support/intake/linkSupportCase';

const MERCHANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SUPPORT_CASE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const PROFILE_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const CLAIM_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const SHOP_DOMAIN = 'demo.myshopify.com';

type SupportCaseRow = {
  id: string;
  merchant_id: string;
  provider: string;
  shop_domain: string | null;
  order_ref: string | null;
  claim_reason: string | null;
  shopify_order_id: string | null;
  customer_profile_id: string | null;
  merchant_claim_id: string | null;
  link_status: string;
  link_metadata: Record<string, unknown>;
};

function makeLinkingSupabase(options: {
  supportCase: SupportCaseRow;
  shopifyOrders?: Array<{
    shopify_order_id: string;
    order_number: string | null;
    customer_id: string | null;
    shop_domain: string;
  }>;
  profileIdentities?: Array<{
    customer_profile_id: string;
    identity_type: string;
    identity_value: string;
  }>;
  merchantClaims?: Array<Record<string, unknown>>;
}) {
  let supportCase = { ...options.supportCase };
  const linkUpdates: Record<string, unknown>[] = [];
  const events: Array<{ event_type: string; metadata: Record<string, unknown> }> = [];

  const supabase = {
    from: (table: string) => {
      if (table === TABLES.SUPPORT_CASE_INTAKE) {
        return {
          select: () => ({
            eq: (_c: string, id: string) => ({
              eq: (_c2: string, merchantId: string) => ({
                maybeSingle: async () => {
                  if (id !== supportCase.id || merchantId !== supportCase.merchant_id) {
                    return { data: null, error: null };
                  }
                  return { data: supportCase, error: null };
                },
              }),
            }),
          }),
          update: (values: Record<string, unknown>) => ({
            eq: (_c: string, id: string) => ({
              eq: (_c2: string, merchantId: string) => {
                linkUpdates.push(values);
                if (id === supportCase.id && merchantId === supportCase.merchant_id) {
                  supportCase = { ...supportCase, ...values } as SupportCaseRow;
                }
                return Promise.resolve({ error: null });
              },
            }),
          }),
        };
      }

      if (table === TABLES.SUPPORT_CASE_EVENTS) {
        return {
          insert: (payload: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                events.push({
                  event_type: String(payload.event_type),
                  metadata: (payload.metadata as Record<string, unknown>) ?? {},
                });
                return { data: { id: 'event-1', ...payload }, error: null };
              },
            }),
          }),
        };
      }

      if (table === 'shopify_order_signals') {
        return {
          select: () => ({
            eq: (_c: string, shopDomain: string) =>
              Promise.resolve({
                data: (options.shopifyOrders ?? []).filter((row) => row.shop_domain === shopDomain),
                error: null,
              }),
          }),
        };
      }

      if (table === 'customer_profile_identities') {
        return {
          select: () => ({
            eq: (_c: string, merchantId: string) => ({
              eq: (_c2: string, identityType: string) => ({
                eq: (_c3: string, identityValue: string) =>
                  Promise.resolve({
                    data: (options.profileIdentities ?? []).filter(
                      (row) =>
                        row.identity_type === identityType && row.identity_value === identityValue
                    ),
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }

      if (table === 'merchant_claims') {
        return {
          select: () => ({
            eq: (_c: string, merchantId: string) => ({
              in: async () => ({
                data: (options.merchantClaims ?? []).filter(
                  (claim) => claim.merchant_id === merchantId
                ),
                error: null,
              }),
            }),
          }),
        };
      }

      throw new Error(`unexpected table: ${table}`);
    },
  };

  return { supabase, linkUpdates, events, getSupportCase: () => supportCase };
}

describe('matchShopifyOrdersByOrderRef', () => {
  const orders = [
    {
      shopify_order_id: 'gid://shopify/Order/1007',
      order_number: '1007',
      customer_id: 'cust-1',
      shop_domain: SHOP_DOMAIN,
    },
    {
      shopify_order_id: 'ORD-2025-00341',
      order_number: 'ORD-2025-00341',
      customer_id: 'cust-2',
      shop_domain: SHOP_DOMAIN,
    },
  ];

  it('matches #1007 to order_number 1007', () => {
    expect(matchShopifyOrdersByOrderRef(orders, '#1007')).toHaveLength(1);
    expect(matchShopifyOrdersByOrderRef(orders, '#1007')[0].order_number).toBe('1007');
  });

  it('matches shopify_order_id directly', () => {
    expect(matchShopifyOrdersByOrderRef(orders, 'ORD-2025-00341')).toHaveLength(1);
  });

  it('returns empty when no match', () => {
    expect(matchShopifyOrdersByOrderRef(orders, '9999')).toHaveLength(0);
  });

  it('returns multiple matches as ambiguous input', () => {
    const dupes = [
      ...orders,
      {
        shopify_order_id: 'gid://shopify/Order/1007-copy',
        order_number: '1007',
        customer_id: 'cust-3',
        shop_domain: SHOP_DOMAIN,
      },
    ];
    expect(matchShopifyOrdersByOrderRef(dupes, '#1007')).toHaveLength(2);
  });
});

describe('linkSupportCaseToCommerceContext', () => {
  const baseCase: SupportCaseRow = {
    id: SUPPORT_CASE_ID,
    merchant_id: MERCHANT_ID,
    provider: 'gorgias',
    shop_domain: SHOP_DOMAIN,
    order_ref: '1007',
    claim_reason: 'refund_request',
    shopify_order_id: null,
    customer_profile_id: null,
    merchant_claim_id: null,
    link_status: 'unlinked',
    link_metadata: {},
  };

  it('links order #1007 and customer profile from order', async () => {
    const mock = makeLinkingSupabase({
      supportCase: baseCase,
      shopifyOrders: [
        {
          shopify_order_id: 'gid://shopify/Order/1007',
          order_number: '1007',
          customer_id: 'shopify-cust-9',
          shop_domain: SHOP_DOMAIN,
        },
      ],
      profileIdentities: [
        {
          customer_profile_id: PROFILE_ID,
          identity_type: 'shopify_customer_id',
          identity_value: 'shopify-cust-9',
        },
      ],
    });

    const result = await linkSupportCaseToCommerceContext(mock.supabase, {
      supportCaseId: SUPPORT_CASE_ID,
      merchantId: MERCHANT_ID,
    });

    expect(result.link_status).toBe('linked');
    expect(result.shopify_order_id).toBe('gid://shopify/Order/1007');
    expect(result.customer_profile_id).toBe(PROFILE_ID);
    expect(result.merchant_claim_id).toBeNull();
    expect(result.link_metadata.claim_candidate).toBe(true);
    expect(mock.events.some((e) => e.event_type === 'linked_shopify_order')).toBe(true);
    expect(mock.events.some((e) => e.event_type === 'linked_customer_profile')).toBe(true);
    expect(mock.events.some((e) => e.event_type === 'claim_candidate_identified')).toBe(true);
  });

  it('returns not_found when order is missing', async () => {
    const mock = makeLinkingSupabase({
      supportCase: baseCase,
      shopifyOrders: [],
    });

    const result = await linkSupportCaseByOrderRef(mock.supabase, {
      supportCaseId: SUPPORT_CASE_ID,
      merchantId: MERCHANT_ID,
      shopDomain: SHOP_DOMAIN,
      orderRef: '1007',
    });

    expect(result.link_status).toBe('not_found');
    expect(mock.events).toEqual([]);
  });

  it('returns ambiguous for multiple order matches', async () => {
    const mock = makeLinkingSupabase({
      supportCase: baseCase,
      shopifyOrders: [
        {
          shopify_order_id: 'gid://shopify/Order/1007',
          order_number: '1007',
          customer_id: 'a',
          shop_domain: SHOP_DOMAIN,
        },
        {
          shopify_order_id: 'gid://shopify/Order/1007b',
          order_number: '1007',
          customer_id: 'b',
          shop_domain: SHOP_DOMAIN,
        },
      ],
    });

    const result = await linkSupportCaseByOrderRef(mock.supabase, {
      supportCaseId: SUPPORT_CASE_ID,
      merchantId: MERCHANT_ID,
      shopDomain: SHOP_DOMAIN,
      orderRef: '#1007',
    });

    expect(result.link_status).toBe('ambiguous');
    expect(result.shopify_order_id).toBeNull();
  });

  it('links existing merchant claim and does not auto-create', async () => {
    const mock = makeLinkingSupabase({
      supportCase: baseCase,
      shopifyOrders: [
        {
          shopify_order_id: 'gid://shopify/Order/1007',
          order_number: '1007',
          customer_id: 'shopify-cust-9',
          shop_domain: SHOP_DOMAIN,
        },
      ],
      profileIdentities: [
        {
          customer_profile_id: PROFILE_ID,
          identity_type: 'shopify_customer_id',
          identity_value: 'shopify-cust-9',
        },
      ],
      merchantClaims: [
        {
          id: CLAIM_ID,
          merchant_id: MERCHANT_ID,
          shopify_order_id: 'gid://shopify/Order/1007',
          order_ref: '1007',
          shop_domain: SHOP_DOMAIN,
          claim_type: 'refund_request',
          status: 'open',
        },
      ],
    });

    const result = await linkSupportCaseToCommerceContext(mock.supabase, {
      supportCaseId: SUPPORT_CASE_ID,
      merchantId: MERCHANT_ID,
    });

    expect(result.merchant_claim_id).toBe(CLAIM_ID);
    expect(result.link_metadata.claim_candidate).not.toBe(true);
    expect(mock.events.some((e) => e.event_type === 'linked_merchant_claim')).toBe(true);
    expect(mock.getSupportCase().merchant_claim_id).toBe(CLAIM_ID);
  });

  it('does not expose raw email in link metadata', async () => {
    const mock = makeLinkingSupabase({
      supportCase: baseCase,
      shopifyOrders: [
        {
          shopify_order_id: 'gid://shopify/Order/1007',
          order_number: '1007',
          customer_id: null,
          shop_domain: SHOP_DOMAIN,
        },
      ],
    });

    const result = await linkSupportCaseToCommerceContext(mock.supabase, {
      supportCaseId: SUPPORT_CASE_ID,
      merchantId: MERCHANT_ID,
    });

    expect(JSON.stringify(result)).not.toContain('@');
    expect(JSON.stringify(mock.events)).not.toContain('shopper@');
  });
});
