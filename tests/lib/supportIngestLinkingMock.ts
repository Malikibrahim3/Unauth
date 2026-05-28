import { TABLES } from '@/lib/supabase/tables';

export function supportCaseIntakeTableWithLinking(options: {
  supportCaseId: string;
  merchantId: string;
  getLastCasePayload: () => Record<string, unknown> | undefined;
  onUpsert: (payload: Record<string, unknown>) => void;
  onEventInsert?: (payload: Record<string, unknown>) => void;
}) {
  return {
    upsert: (payload: Record<string, unknown>, _opts: { onConflict: string }) => ({
      select: () => ({
        single: async () => {
          options.onUpsert(payload);
          return { data: { id: options.supportCaseId, ...payload }, error: null };
        },
      }),
    }),
    select: () => ({
      eq: (_column: string, value: string) => ({
        eq: (_column2: string, merchantId: string) => ({
          maybeSingle: async () => {
            if (value !== options.supportCaseId || merchantId !== options.merchantId) {
              return { data: null, error: null };
            }
            const payload = options.getLastCasePayload() ?? {};
            return {
              data: {
                id: options.supportCaseId,
                merchant_id: options.merchantId,
                provider: payload.provider ?? 'gorgias',
                shop_domain: payload.shop_domain ?? null,
                order_ref: payload.order_ref ?? null,
                claim_reason: payload.claim_reason ?? null,
                shopify_order_id: null,
                customer_profile_id: null,
                merchant_claim_id: null,
                link_status: 'unlinked',
                link_metadata: {},
              },
              error: null,
            };
          },
        }),
      }),
    }),
    update: (_values: Record<string, unknown>) => ({
      eq: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  };
}

export function supportLinkingLookupTables() {
  return {
    shopify_order_signals: {
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
      }),
    },
    customer_profile_identities: {
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    },
    merchant_claims: {
      select: () => ({
        eq: () => ({
          in: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    },
  };
}

export function resolveSupportLinkingTable(
  table: string,
  linkingTables: ReturnType<typeof supportLinkingLookupTables>
): Record<string, unknown> | null {
  if (table === 'shopify_order_signals') return linkingTables.shopify_order_signals;
  if (table === 'customer_profile_identities') return linkingTables.customer_profile_identities;
  if (table === 'merchant_claims') return linkingTables.merchant_claims;
  if (table === TABLES.SUPPORT_CASE_EVENTS) return null;
  return null;
}
