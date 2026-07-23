import type { IntegrationProvider } from '@/lib/integrations/types';

export const woocommerceProvider: IntegrationProvider = {
  id: 'woocommerce',
  name: 'WooCommerce',
  logoSrc: '/integrations/woocommerce.svg',
  category: 'commerce',
  authMode: 'api_key',
  buildStatus: 'partial',
  description: 'Orders, refunds, fulfillments, and customer context from WooCommerce.',
  evidenceCapabilities: [
    'order_value',
    'line_items',
    'customer_history',
    'refund_history',
    'tracking_number',
  ],
  capabilities: { readOrders: true, readRefunds: true, readFulfilment: true },
  lifecycle: [
    { id: 'connect', applicability: 'applicable', evidence: 'automated_tested', detail: 'Connection settings are covered by tests/api/woocommerceConnectionSettings.test.ts; controlled store run pending.' },
    { id: 'account_verification', applicability: 'applicable', evidence: 'unavailable', detail: 'Connection status is DB-only; no live account probe is implemented.' },
    { id: 'initial_import', applicability: 'applicable', evidence: 'automated_tested', detail: 'Order backfill is covered by tests/lib/woocommerceBackfill.test.ts; controlled import pending.' },
    { id: 'incremental_pull', applicability: 'applicable', evidence: 'implemented', detail: 'Dedicated sync route is implemented; no controlled incremental run is recorded.' },
    { id: 'webhook', applicability: 'applicable', evidence: 'automated_tested', detail: 'HMAC and order ingestion are covered by tests/api/woocommerceWebhook.test.ts; controlled delivery pending.' },
    { id: 'reconciliation', applicability: 'applicable', evidence: 'unavailable', detail: 'No dedicated reconciliation job exists beyond generic deferred parent-before-child handling.' },
    { id: 'reconnect', applicability: 'applicable', evidence: 'implemented', detail: 'Connection settings support reconnecting; no dedicated reconnect test or controlled run exists.' },
    { id: 'disconnect', applicability: 'applicable', evidence: 'automated_tested', detail: 'Generic commerce disconnect is covered by tests/unit/connectors/disconnect.test.ts; controlled disconnect pending.' },
    { id: 'freshness_health', applicability: 'applicable', evidence: 'unavailable', detail: 'No live-verification health probe is implemented.' },
    { id: 'bounded_writeback', applicability: 'not_applicable', evidence: 'unavailable', detail: 'Unauth only reads order/refund data from WooCommerce today.' },
  ],
};
