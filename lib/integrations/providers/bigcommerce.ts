import type { IntegrationProvider } from '@/lib/integrations/types';

export const bigcommerceProvider: IntegrationProvider = {
  id: 'bigcommerce',
  name: 'BigCommerce',
  logoSrc: '/providers/bigcommerce.svg',
  category: 'commerce',
  authMode: 'oauth',
  buildStatus: 'partial',
  description: 'Orders, refunds, fulfillments, and customer context from BigCommerce.',
  setupHref: '/api/bigcommerce/install',
  evidenceCapabilities: [
    'order_value',
    'line_items',
    'customer_history',
    'refund_history',
    'tracking_number',
  ],
  capabilities: { readOrders: true, readRefunds: true, readFulfilment: true },
  lifecycle: [
    { id: 'connect', applicability: 'applicable', evidence: 'implemented', detail: 'OAuth install flow is implemented; no dedicated end-to-end connect test or controlled store run is recorded.' },
    { id: 'account_verification', applicability: 'applicable', evidence: 'unavailable', detail: 'Connection status is DB-only; no live account probe is implemented.' },
    { id: 'initial_import', applicability: 'applicable', evidence: 'automated_tested', detail: 'Order backfill is covered by tests/lib/bigcommerceBackfill.test.ts; controlled import pending.' },
    { id: 'incremental_pull', applicability: 'applicable', evidence: 'implemented', detail: 'Dedicated sync route is implemented; no controlled incremental run is recorded.' },
    { id: 'webhook', applicability: 'applicable', evidence: 'automated_tested', detail: 'Signature rejection and order ingestion are covered by tests/api/bigcommerceWebhook.test.ts; controlled delivery pending.' },
    { id: 'reconciliation', applicability: 'applicable', evidence: 'unavailable', detail: 'No dedicated reconciliation job exists beyond generic deferred parent-before-child handling.' },
    { id: 'reconnect', applicability: 'applicable', evidence: 'implemented', detail: 'OAuth install can be rerun; no dedicated reconnect test or controlled run exists.' },
    { id: 'disconnect', applicability: 'applicable', evidence: 'implemented', detail: 'Dedicated disconnect route exists; controlled disconnect pending.' },
    { id: 'freshness_health', applicability: 'applicable', evidence: 'unavailable', detail: 'No live-verification health probe is implemented.' },
    { id: 'bounded_writeback', applicability: 'not_applicable', evidence: 'unavailable', detail: 'Unauth only reads order/refund data from BigCommerce today.' },
  ],
};
