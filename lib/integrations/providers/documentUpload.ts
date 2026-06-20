import type { DocumentType, IntegrationProvider } from '@/lib/integrations/types';

export const documentUploadProvider: IntegrationProvider = {
  id: 'document_upload',
  name: 'Document Upload',
  category: 'documents',
  authMode: 'manual_upload',
  buildStatus: 'live',
  description: 'Merchant-approved carrier, 3PL, supplier, and insurance terms.',
  evidenceCapabilities: ['contract_terms', 'recovery_deadline'],
  capabilities: { readAttachments: true },
};

export const SUPPORTED_DOCUMENT_TYPES: DocumentType[] = [
  'carrier_agreement',
  'three_pl_sla',
  'supplier_terms',
  'insurance_policy',
];
