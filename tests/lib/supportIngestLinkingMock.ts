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

/**
 * Builds a fully chainable PostgREST builder stub that resolves to the given
 * terminal value. Every filter/refinement method (`.eq`, `.ilike`, `.or`,
 * `.contains`, `.in`, `.limit`, `.order`, `.neq`, `.select`, `.update`,
 * `.insert`, `.upsert`) returns the same builder so any chain shape is valid.
 * Terminal calls (`.maybeSingle()`, `.single()`, awaiting via `.then`) resolve
 * the supplied `{ data, error }`.
 */
function chainableBuilder(
  terminal: { data: unknown; error: unknown },
  singleTerminal?: { data: unknown; error: unknown }
): any {
  const single = singleTerminal ?? terminal;
  const builder: any = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    upsert: () => builder,
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    in: () => builder,
    or: () => builder,
    ilike: () => builder,
    contains: () => builder,
    is: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    not: () => builder,
    limit: () => builder,
    order: () => builder,
    range: () => builder,
    maybeSingle: async () => terminal,
    single: async () => single,
    then: (onfulfilled: any, onrejected?: any) =>
      Promise.resolve(terminal).then(onfulfilled, onrejected),
  };
  return builder;
}

export function supportLinkingLookupTables() {
  // The v2 intake bridge (lib/support/intake/v2Bridge.ts) resolves the ticket's
  // customer against `source_customers` (by helpdesk external_id, then email via
  // ILIKE) and its order_ref against `source_orders` (by order_number/external_id
  // via `.or(...)`). With no seeded rows these resolve to null → link_status
  // 'unlinked', which is the expected "not found" path for these fixtures.
  return {
    source_customers: () => chainableBuilder({ data: null, error: null }),
    source_orders: () => chainableBuilder({ data: null, error: null }),
    // Claim creation path (ensureClaimForTicketV2): the existing-claim lookup
    // (.maybeSingle) finds nothing, and the subsequent insert (.single) returns
    // the new claim row. claim_events / claim_evidence inserts resolve cleanly.
    [TABLES.MERCHANT_CLAIMS]: () =>
      chainableBuilder(
        { data: null, error: null },
        { data: { id: '99999999-9999-4999-8999-999999999999' }, error: null }
      ),
    claim_events: () => chainableBuilder({ data: null, error: null }),
    claim_evidence: () => chainableBuilder({ data: null, error: null }),
    source_fulfillments: () => chainableBuilder({ data: null, error: null }),
    // Legacy linking tables (kept for any pre-v2 callers still exercising them).
    shopify_order_signals: () => chainableBuilder({ data: [], error: null }),
    customer_profile_identities: () => chainableBuilder({ data: [], error: null }),
    merchant_claims: () => chainableBuilder({ data: [], error: null }),
  };
}

export function resolveSupportLinkingTable(
  table: string,
  linkingTables: ReturnType<typeof supportLinkingLookupTables>
): Record<string, unknown> | null {
  if (table === TABLES.SUPPORT_CASE_EVENTS) return null;
  const factory = (linkingTables as Record<string, (() => Record<string, unknown>) | undefined>)[table];
  return factory ? factory() : null;
}
