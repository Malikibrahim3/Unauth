import type { IntegrationProvider } from '@/lib/integrations/types';

export const csvImportProvider: IntegrationProvider = {
  id: 'csv_import',
  name: 'CSV / manual import',
  logoSrc: '/integrations/document-upload.svg',
  category: 'commerce',
  authMode: 'manual_upload',
  buildStatus: 'live',
  description: 'Merchant-uploaded customers, orders, refunds, and fulfillment records.',
  setupHref: '/integrations/imports',
  evidenceCapabilities: [
    'order_value',
    'line_items',
    'customer_history',
    'refund_history',
    'tracking_number',
  ],
  capabilities: { readOrders: true, readRefunds: true, readFulfilment: true },
};
