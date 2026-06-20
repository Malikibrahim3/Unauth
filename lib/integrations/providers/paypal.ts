import type { IntegrationProvider } from '@/lib/integrations/types';

export const paypalProvider: IntegrationProvider = {
  id: 'paypal',
  name: 'PayPal',
  category: 'payments_disputes',
  authMode: 'oauth',
  buildStatus: 'slot_only',
  evidenceCapabilities: ['dispute_status', 'chargeback_evidence', 'recovery_deadline'],
  capabilities: { readDisputes: true, readClaimStatus: true, readSettlements: true },
};
