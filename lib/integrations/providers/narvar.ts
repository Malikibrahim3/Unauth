import type { IntegrationProvider } from '@/lib/integrations/types';

export const narvarProvider: IntegrationProvider = {
  id: 'narvar',
  name: 'Narvar',
  category: 'returns',
  authMode: 'oauth',
  buildStatus: 'slot_only',
  evidenceCapabilities: ['return_request_status', 'return_inspection_outcome', 'return_authorisation', 'return_status', 'returns_provider_case_update'],
  capabilities: { readReturns: true, readClaimStatus: true, readCorrespondence: true },
};
