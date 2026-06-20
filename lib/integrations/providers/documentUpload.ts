import type { DocumentType, IntegrationProvider } from '@/lib/integrations/types';

export const documentUploadProvider: IntegrationProvider = {
  id: 'source_documents',
  name: 'Source document connectors',
  category: 'erp',
  authMode: 'custom',
  buildStatus: 'slot_only',
  description: 'Source-backed contract, policy, supplier, and carrier terms from connected systems.',
  evidenceCapabilities: ['contract_terms', 'recovery_deadline'],
  capabilities: { readAttachments: true },
};

export const SUPPORTED_DOCUMENT_TYPES: DocumentType[] = [
  'carrier_agreement',
  'three_pl_sla',
  'supplier_terms',
  'insurance_policy',
];
