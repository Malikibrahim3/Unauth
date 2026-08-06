import type { DocumentType, IntegrationProvider } from '@/lib/integrations/types';

export const documentUploadProvider: IntegrationProvider = {
  id: 'document_upload',
  name: 'Document Upload',
  logoSrc: '/providers/document-upload.svg',
  category: 'documents',
  authMode: 'manual_upload',
  buildStatus: 'live',
  description: 'Merchant-approved carrier, 3PL, supplier, and insurance terms.',
  setupHref: '/settings/legal/agreements',
  evidenceCapabilities: ['contract_terms', 'recovery_deadline'],
  capabilities: { readAttachments: true },
  // No isolated DB/storage-backed workflow or automated route test is recorded
  // for this build; source presence alone derives only to Partial.
  lifecycle: [
    { id: 'connect', applicability: 'applicable', evidence: 'implemented', detail: 'Authenticated agreement/document upload routes are implemented; controlled application run pending.' },
    { id: 'account_verification', applicability: 'not_applicable', evidence: 'unavailable', detail: 'No external account to verify.' },
    { id: 'initial_import', applicability: 'applicable', evidence: 'implemented', detail: 'Merchant scope, 10 MB limits, PDF/DOCX/text type checks, quarantine, approval, and canonical-evidence mapping are implemented. The merchant UI uses the separate agreements route, and no controlled storage/scan/approval/correction workflow or automated route test is recorded.' },
    { id: 'incremental_pull', applicability: 'not_applicable', evidence: 'unavailable', detail: 'Each upload is a discrete merchant action.' },
    { id: 'webhook', applicability: 'not_applicable', evidence: 'unavailable', detail: 'No external system sends events.' },
    { id: 'reconciliation', applicability: 'not_applicable', evidence: 'unavailable', detail: 'No external source exists to reconcile.' },
    { id: 'reconnect', applicability: 'not_applicable', evidence: 'unavailable', detail: 'There is no persistent external connection.' },
    { id: 'disconnect', applicability: 'not_applicable', evidence: 'unavailable', detail: 'There is no persistent external connection.' },
    { id: 'freshness_health', applicability: 'not_applicable', evidence: 'unavailable', detail: 'Freshness is the upload timestamp, not a probed connection.' },
    { id: 'bounded_writeback', applicability: 'not_applicable', evidence: 'unavailable', detail: 'Upload is one-directional into Unauth.' },
  ],
};

export const SUPPORTED_DOCUMENT_TYPES: DocumentType[] = [
  'carrier_agreement',
  'three_pl_sla',
  'supplier_terms',
  'insurance_policy',
];
