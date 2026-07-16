import type { IntegrationProvider } from '@/lib/integrations/types';

export const bigcommerceProvider: IntegrationProvider = {
  id: 'bigcommerce',
  name: 'BigCommerce',
  logoSrc: '/integrations/bigcommerce.svg',
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
};
