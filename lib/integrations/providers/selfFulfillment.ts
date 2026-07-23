import type { IntegrationProvider } from '@/lib/integrations/types';

export const selfFulfillmentProvider: IntegrationProvider = {
  id: 'self_fulfillment_pack',
  name: 'Self-fulfillment pack confirmation',
  logoSrc: '/integrations/self-fulfillment.svg',
  category: 'warehouse_3pl',
  authMode: 'manual_upload',
  buildStatus: 'live',
  description: 'Low-confidence staff confirmation for merchants without a WMS or 3PL.',
  evidenceCapabilities: ['self_reported_pack_confirmation', 'self_reported_pack_photo'],
  capabilities: { readFulfilment: true, uploadEvidence: true },
  // No isolated DB/storage-backed workflow or automated route test is recorded
  // for this build; source presence alone derives only to Partial.
  lifecycle: [
    { id: 'connect', applicability: 'applicable', evidence: 'implemented', detail: 'The signed pack-confirmation endpoint is implemented; controlled application run pending.' },
    { id: 'account_verification', applicability: 'not_applicable', evidence: 'unavailable', detail: 'No external account to verify.' },
    { id: 'initial_import', applicability: 'applicable', evidence: 'implemented', detail: 'Expiry/signature checks, single-use lookup, merchant-scoped photo storage, confirmation persistence, and canonical evidence mapping are implemented. Photo type/size validation, correction flow, and a controlled retry/downstream-visibility run remain unverified.' },
    { id: 'incremental_pull', applicability: 'not_applicable', evidence: 'unavailable', detail: 'Each confirmation is a discrete staff action.' },
    { id: 'webhook', applicability: 'not_applicable', evidence: 'unavailable', detail: 'No external system sends events.' },
    { id: 'reconciliation', applicability: 'not_applicable', evidence: 'unavailable', detail: 'No external source exists to reconcile.' },
    { id: 'reconnect', applicability: 'not_applicable', evidence: 'unavailable', detail: 'There is no persistent external connection.' },
    { id: 'disconnect', applicability: 'not_applicable', evidence: 'unavailable', detail: 'There is no persistent external connection.' },
    { id: 'freshness_health', applicability: 'not_applicable', evidence: 'unavailable', detail: 'Freshness is the confirmation timestamp, not a probed connection.' },
    { id: 'bounded_writeback', applicability: 'not_applicable', evidence: 'unavailable', detail: 'Confirmation writes only into Unauth.' },
  ],
};
