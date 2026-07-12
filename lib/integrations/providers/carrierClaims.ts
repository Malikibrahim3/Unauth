import type { IntegrationProvider } from '@/lib/integrations/types';

export const carrierClaimsProvider: IntegrationProvider = {
  id: 'carrier_claims',
  name: 'UPS/FedEx Claims API',
  category: 'carrier',
  authMode: 'oauth',
  buildStatus: 'slot_only',
  description: 'Carrier claim submission, claim outcome, and recovery payment status.',
  evidenceCapabilities: [
    'carrier_claim_submission_status',
    'carrier_claim_outcome',
    'recovery_amount_approved',
    'recovery_amount_paid',
  ],
  capabilities: { readClaimStatus: true, createClaim: true, readCorrespondence: true, sendCorrespondence: true },
};
