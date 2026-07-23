import type { IntegrationProvider } from '@/lib/integrations/types';

export const carrierClaimsProvider: IntegrationProvider = {
  id: 'carrier_claims',
  name: 'UPS/FedEx Claims API',
  logoSrc: '/integrations/carrier-claims.svg',
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
  // slot_only providers derive to 'planned' unconditionally regardless of this
  // matrix — recorded here so the reserved capability scope is documented,
  // not left to guesswork, once this connector is actually built. Distinct
  // from the existing UPS/FedEx tracking connectors (evidence lookup only);
  // this slot is for the separate carrier claims-submission API.
  lifecycle: [
    { id: 'connect', applicability: 'applicable', evidence: 'unavailable', detail: 'Not built; this is a reserved catalogue slot.' },
    { id: 'account_verification', applicability: 'applicable', evidence: 'unavailable', detail: 'Not built.' },
    { id: 'initial_import', applicability: 'applicable', evidence: 'unavailable', detail: 'Not built.' },
    { id: 'incremental_pull', applicability: 'applicable', evidence: 'unavailable', detail: 'Not built.' },
    { id: 'webhook', applicability: 'applicable', evidence: 'unavailable', detail: 'Not built.' },
    { id: 'reconciliation', applicability: 'applicable', evidence: 'unavailable', detail: 'Not built.' },
    { id: 'reconnect', applicability: 'applicable', evidence: 'unavailable', detail: 'Not built.' },
    { id: 'disconnect', applicability: 'applicable', evidence: 'unavailable', detail: 'Not built.' },
    { id: 'freshness_health', applicability: 'applicable', evidence: 'unavailable', detail: 'Not built.' },
    { id: 'bounded_writeback', applicability: 'applicable', evidence: 'unavailable', detail: 'Claim submission is not built and remains forbidden until reversibility and audit controls exist.' },
  ],
};
