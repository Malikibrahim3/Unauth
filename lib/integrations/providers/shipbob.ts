import type { IntegrationProvider } from '@/lib/integrations/types';

export const shipbobProvider: IntegrationProvider = {
  id: 'shipbob',
  name: 'ShipBob',
  category: 'warehouse_3pl',
  authMode: 'oauth',
  buildStatus: 'slot_only',
  evidenceCapabilities: ['warehouse_pick_pack', 'warehouse_exception', 'three_pl_sla_claim_status'],
  capabilities: { readFulfilment: true, readWarehouseEvents: true, readClaimStatus: true },
};
