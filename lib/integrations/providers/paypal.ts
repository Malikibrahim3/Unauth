import type { IntegrationProvider } from '@/lib/integrations/types';

export const paypalProvider: IntegrationProvider = {
  id: 'paypal',
  name: 'PayPal',
  category: 'chargebacks',
  authMode: 'oauth',
  buildStatus: 'slot_only',
  evidenceCapabilities: ['dispute_status', 'chargeback_evidence', 'recovery_deadline', 'processor_case_update', 'payment_record'],
  capabilities: { readDisputes: true, readClaimStatus: true, readSettlements: true },
};
