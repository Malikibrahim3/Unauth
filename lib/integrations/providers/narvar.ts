import type { IntegrationProvider } from '@/lib/integrations/types';

export const narvarProvider: IntegrationProvider = {
  id: 'narvar',
  name: 'Narvar',
  category: 'returns',
  authMode: 'oauth',
  buildStatus: 'slot_only',
  evidenceCapabilities: ['return_request_status', 'return_inspection_outcome'],
  capabilities: { readReturns: true, readClaimStatus: true, readCorrespondence: true },
};
