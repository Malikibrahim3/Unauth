import type { IntegrationProvider } from '@/lib/integrations/types';

export const selfFulfillmentProvider: IntegrationProvider = {
  id: 'self_fulfillment_pack',
  name: 'Self-fulfillment pack confirmation',
  category: 'warehouse_3pl',
  authMode: 'manual_upload',
  buildStatus: 'live',
  description: 'Low-confidence staff confirmation for merchants without a WMS or 3PL.',
  evidenceCapabilities: ['self_reported_pack_confirmation', 'self_reported_pack_photo'],
  capabilities: { readFulfilment: true, uploadEvidence: true },
};
