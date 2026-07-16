import type { IntegrationProvider } from '@/lib/integrations/types';

export const stripeProvider: IntegrationProvider = {
  id: 'stripe',
  name: 'Stripe',
  logoSrc: '/integrations/stripe.svg',
  category: 'payments_disputes',
  authMode: 'oauth',
  buildStatus: 'slot_only',
  evidenceCapabilities: ['dispute_status', 'chargeback_evidence', 'recovery_deadline'],
  capabilities: { readDisputes: true, readClaimStatus: true, readSettlements: true },
};
