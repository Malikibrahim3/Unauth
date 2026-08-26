import type { IntegrationProvider } from '@/lib/integrations/types';

export const stripeProvider: IntegrationProvider = {
  id: 'stripe',
  name: 'Stripe',
  logoSrc: '/providers/stripe.svg',
  category: 'payments_disputes',
  authMode: 'oauth',
  codeMaturity: 'slot_only',
  evidenceCapabilities: ['dispute_status', 'chargeback_evidence', 'recovery_deadline'],
  capabilities: { readDisputes: true, readClaimStatus: true, readSettlements: true },
  // slot_only providers derive to 'planned' unconditionally regardless of this
  // matrix — recorded here so the reserved capability scope is documented,
  // not left to guesswork, once this connector is actually built.
  lifecycle: [
    { id: 'connect', applicability: 'applicable', evidence: 'unavailable', detail: 'Not built; this is a reserved catalogue slot.' },
    { id: 'account_verification', applicability: 'applicable', evidence: 'unavailable', detail: 'Not built.' },
    { id: 'initial_import', applicability: 'applicable', evidence: 'unavailable', detail: 'Not built.' },
    { id: 'incremental_pull', applicability: 'applicable', evidence: 'unavailable', detail: 'Not built.' },
    { id: 'webhook', applicability: 'applicable', evidence: 'unavailable', detail: 'Unauth subscription billing webhooks are unrelated to this reserved disputes-evidence slot.' },
    { id: 'reconciliation', applicability: 'applicable', evidence: 'unavailable', detail: 'Not built.' },
    { id: 'reconnect', applicability: 'applicable', evidence: 'unavailable', detail: 'Not built.' },
    { id: 'disconnect', applicability: 'applicable', evidence: 'unavailable', detail: 'Not built.' },
    { id: 'freshness_health', applicability: 'applicable', evidence: 'unavailable', detail: 'Not built.' },
    { id: 'bounded_writeback', applicability: 'not_applicable', evidence: 'unavailable', detail: 'Not planned; dispute evidence would be read-only.' },
  ],
};
