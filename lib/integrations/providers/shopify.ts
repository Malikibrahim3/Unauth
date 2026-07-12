import type { IntegrationProvider } from '@/lib/integrations/types';

export const shopifyProvider: IntegrationProvider = {
  id: 'shopify',
  name: 'Shopify',
  category: 'commerce',
  authMode: 'oauth',
  buildStatus: 'live',
  description: 'Orders, refunds, fulfillments, and Shopify Payments disputes.',
  evidenceCapabilities: [
    'order_value',
    'line_items',
    'customer_history',
    'refund_history',
    'reship_history',
    'tracking_number',
    'dispute_status',
    'chargeback_evidence',
    'recovery_deadline',
  ],
  capabilities: { readOrders: true, readRefunds: true, readDisputes: true, readFulfilment: true, readSettlements: true },
};

export type ShopifyDisputeNode = {
  id: string;
  legacyResourceId?: string | number | null;
  amount?: { amount?: string | number | null; currencyCode?: string | null } | null;
  evidenceDueBy?: string | null;
  finalizedOn?: string | null;
  initiatedAt?: string | null;
  status?: string | null;
  type?: string | null;
  reasonDetails?: { reason?: string | null; networkReasonCode?: string | null } | null;
  order?: { id?: string | null; legacyResourceId?: string | number | null; name?: string | null } | null;
};

const SHOPIFY_GRAPHQL_API_VERSION = '2026-01';

export async function fetchShopifyPaymentDisputes(input: {
  shopDomain: string;
  accessToken: string;
  first?: number;
  query?: string;
}): Promise<ShopifyDisputeNode[]> {
  const query = `
    query UnauthDisputes($first: Int!, $query: String) {
      shopifyPaymentsAccount {
        disputes(first: $first, reverse: true, query: $query) {
          nodes {
            id
            legacyResourceId
            amount { amount currencyCode }
            evidenceDueBy
            finalizedOn
            initiatedAt
            status
            type
            reasonDetails { reason networkReasonCode }
            order { id legacyResourceId name }
          }
        }
      }
    }
  `;

  const res = await fetch(`https://${input.shopDomain}/admin/api/${SHOPIFY_GRAPHQL_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': input.accessToken,
    },
    body: JSON.stringify({
      query,
      variables: { first: input.first ?? 50, query: input.query ?? null },
    }),
    cache: 'no-store',
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.errors) {
    const message = body.errors ? JSON.stringify(body.errors).slice(0, 500) : JSON.stringify(body).slice(0, 500);
    throw new Error(`shopify_disputes_fetch_failed: ${message}`);
  }

  return body?.data?.shopifyPaymentsAccount?.disputes?.nodes ?? [];
}
