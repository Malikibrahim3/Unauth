import type { IntegrationProvider } from '@/lib/integrations/types';

export const extensivProvider: IntegrationProvider = {
  id: 'extensiv',
  name: 'Extensiv',
  category: 'warehouse_3pl',
  authMode: 'oauth',
  buildStatus: 'slot_only',
  evidenceCapabilities: ['warehouse_pick_pack', 'warehouse_exception', 'three_pl_sla_claim_status'],
  capabilities: { readFulfilment: true, readWarehouseEvents: true, readClaimStatus: true },
};
