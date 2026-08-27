import type { IntegrationProvider } from '@/lib/integrations/types';
import { SHOPIFY_GRAPHQL_API_VERSION } from '@/lib/shopify/apiVersion';

export const shopifyProvider: IntegrationProvider = {
  id: 'shopify',
  name: 'Shopify',
  logoSrc: '/providers/shopify.svg',
  category: 'commerce',
  authMode: 'oauth',
  codeMaturity: 'complete',
  description: 'Orders, refunds, fulfillments, and Shopify Payments disputes.',
  setupHref: '/sources/setup/shopify',
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
  // No capability is controlled_runtime_verified: this session has no isolated
  // local/staging environment (hosted DB, Docker unavailable) and controlled
  // Shopify actions were not triggered. Derives to Beta with "Runtime
  // verification pending". See docs/audits/unauth-mvp-plus/08-provider-proof-matrix.md.
  lifecycle: [
    { id: 'connect', applicability: 'applicable', evidence: 'automated_tested', detail: 'OAuth install/callback flow covered by tests/api/shopifyOAuth.test.ts. Controlled end-to-end install against a live shop pending.' },
    { id: 'account_verification', applicability: 'applicable', evidence: 'automated_tested', detail: 'Live shop.json probe logic covered by tests/api/shopifyVerifyRoute.test.ts + tests/unit/liveConnectionVerification.test.ts. Controlled run against a live shop pending.' },
    { id: 'initial_import', applicability: 'applicable', evidence: 'automated_tested', detail: 'Order/refund/fulfillment backfill covered by tests/lib/shopifyBackfillV2.test.ts. Controlled backfill against a live shop pending.' },
    { id: 'incremental_pull', applicability: 'applicable', evidence: 'automated_tested', detail: 'Ongoing updates via webhooks + scheduled reconcile cron (tests/api/reconcileCron.test.ts). Controlled run pending.' },
    { id: 'webhook', applicability: 'applicable', evidence: 'automated_tested', detail: 'HMAC-before-parse + idempotency covered by tests/api/shopifyWebhookP0.test.ts. Controlled live delivery pending.' },
    { id: 'reconciliation', applicability: 'applicable', evidence: 'automated_tested', detail: 'Scheduled reconcile covered by tests/lib/reconcileMerchant.test.ts + tests/api/reconcileCron.test.ts. Controlled run pending.' },
    { id: 'reconnect', applicability: 'applicable', evidence: 'implemented', detail: 'Re-running the OAuth install flow re-establishes the connection; no dedicated automated reconnect test.' },
    { id: 'disconnect', applicability: 'applicable', evidence: 'automated_tested', detail: 'Disconnect behaviour covered by tests/unit/connectors/disconnect.test.ts. Controlled run pending.' },
    { id: 'freshness_health', applicability: 'applicable', evidence: 'automated_tested', detail: 'Health-probe logic covered by tests/unit/liveConnectionVerification.test.ts. Controlled run pending.' },
    { id: 'bounded_writeback', applicability: 'not_applicable', evidence: 'unavailable', detail: 'Automatic refund issuance is an explicit MVP+ boundary — not offered.' },
  ],
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
