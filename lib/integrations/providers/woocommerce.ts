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
};
