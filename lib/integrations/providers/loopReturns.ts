import type { IntegrationProvider } from '@/lib/integrations/types';

export const loopReturnsProvider: IntegrationProvider = {
  id: 'loop',
  name: 'Loop',
  category: 'returns',
  authMode: 'oauth',
  buildStatus: 'slot_only',
  evidenceCapabilities: ['return_request_status', 'return_inspection_outcome'],
  capabilities: { readReturns: true, readClaimStatus: true, readCorrespondence: true },
};
