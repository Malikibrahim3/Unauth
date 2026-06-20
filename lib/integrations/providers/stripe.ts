import type { IntegrationProvider } from '@/lib/integrations/types';

export const stripeProvider: IntegrationProvider = {
  id: 'stripe',
  name: 'Stripe',
  category: 'chargebacks',
  authMode: 'oauth',
  buildStatus: 'slot_only',
  evidenceCapabilities: ['dispute_status', 'chargeback_evidence', 'recovery_deadline', 'processor_case_update', 'processor_settlement_status', 'payment_record', 'payment_transaction'],
  capabilities: { readDisputes: true, readClaimStatus: true, readSettlements: true },
};
