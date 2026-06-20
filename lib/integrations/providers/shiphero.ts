import type { IntegrationProvider } from '@/lib/integrations/types';

export const shipheroProvider: IntegrationProvider = {
  id: 'shiphero',
  name: 'ShipHero',
  category: '3pl',
  authMode: 'oauth',
  buildStatus: 'slot_only',
  evidenceCapabilities: ['warehouse_pick_pack', 'pick_pack_log', 'packed_sku', 'package_weight', 'warehouse_exception', 'three_pl_sla_claim_status', 'three_pl_confirmation'],
  capabilities: { readFulfilment: true, readWarehouseEvents: true, readClaimStatus: true },
};
