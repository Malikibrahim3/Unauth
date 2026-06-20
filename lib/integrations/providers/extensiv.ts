import type { IntegrationProvider } from '@/lib/integrations/types';

export const extensivProvider: IntegrationProvider = {
  id: 'extensiv',
  name: 'Extensiv',
  category: '3pl',
  authMode: 'oauth',
  buildStatus: 'slot_only',
  evidenceCapabilities: ['warehouse_pick_pack', 'pick_pack_log', 'warehouse_exception', 'three_pl_sla_claim_status', 'three_pl_confirmation'],
  capabilities: { readFulfilment: true, readWarehouseEvents: true, readClaimStatus: true },
};
