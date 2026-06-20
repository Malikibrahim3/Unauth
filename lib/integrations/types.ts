export type IntegrationCategory =
  | 'commerce'
  | 'helpdesk'
  | 'tracking'
  | 'carrier'
  | 'warehouse_3pl'
  | 'returns'
  | 'payments_disputes'
  | 'documents';

export type IntegrationAuthMode = 'oauth' | 'api_key' | 'manual_upload';
export type IntegrationBuildStatus = 'live' | 'slot_only';
export type IntegrationConnectionStatus =
  | 'connected'
  | 'not_connected'
  | 'connection_error'
  | 'syncing'
  | 'disabled'
  /** Legacy database status, mapped to connection_error in new UI copy. */
  | 'error';

export type EvidenceCapability =
  | 'ticket_messages'
  | 'ticket_attachments'
  | 'customer_claim_reason'
  | 'requested_action'
  | 'order_value'
  | 'line_items'
  | 'customer_history'
  | 'refund_history'
  | 'reship_history'
  | 'tracking_number'
  | 'tracking_events'
  | 'delivery_status'
  | 'delivery_photo'
  | 'signature'
  | 'dispute_status'
  | 'chargeback_evidence'
  | 'contract_terms'
  | 'recovery_deadline'
  | 'return_request_status'
  | 'return_inspection_outcome'
  | 'warehouse_pick_pack'
  | 'warehouse_exception'
  | 'three_pl_sla_claim_status'
  | 'carrier_claim_submission_status'
  | 'carrier_claim_outcome'
  | 'recovery_amount_approved'
  | 'recovery_amount_paid'
  | 'self_reported_pack_confirmation'
  | 'self_reported_pack_photo';

export type ConnectorCapabilityMap = {
  readOrders?: boolean;
  readRefunds?: boolean;
  readDisputes?: boolean;
  readReturns?: boolean;
  readTracking?: boolean;
  readFulfilment?: boolean;
  readWarehouseEvents?: boolean;
  readCorrespondence?: boolean;
  sendCorrespondence?: boolean;
  readAttachments?: boolean;
  readClaimStatus?: boolean;
  createClaim?: boolean;
  uploadEvidence?: boolean;
  readSettlements?: boolean;
  readVendorCredits?: boolean;
};

export type IntegrationProvider = {
  id: string;
  name: string;
  category: IntegrationCategory;
  authMode: IntegrationAuthMode;
  buildStatus: IntegrationBuildStatus;
  evidenceCapabilities: EvidenceCapability[];
  capabilities?: ConnectorCapabilityMap;
  requiredScopes?: string[];
  description?: string;
};

export type ConnectorDescriptor = {
  id: string;
  name: string;
  category: IntegrationCategory;
  state: Exclude<IntegrationConnectionStatus, 'error'>;
  capabilities: ConnectorCapabilityMap;
  requiredScopes: string[];
  authType: IntegrationAuthMode;
  lastSyncAt: string | null;
};

export type DocumentType =
  | 'carrier_agreement'
  | 'three_pl_sla'
  | 'supplier_terms'
  | 'insurance_policy';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  carrier_agreement: 'Carrier Agreement',
  three_pl_sla: '3PL SLA',
  supplier_terms: 'Supplier Terms',
  insurance_policy: 'Insurance Policy',
};

export type ApplicableIntegrationCategory = 'warehouse_3pl' | 'returns';
export type CategoryApplicabilityStatus = 'applicable' | 'not_applicable';

export type CategoryApplicabilityView = {
  category: ApplicableIntegrationCategory;
  status: CategoryApplicabilityStatus;
  setBy: string | null;
  setAt: string | null;
};

export type NormalizedEvidenceItem = {
  id: string;
  merchantId: string;
  supportPayoutCaseId?: string;
  sourceProvider: string;
  sourceCategory: IntegrationCategory;
  evidenceType: EvidenceCapability;
  title: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low';
  value?: string | number | boolean | null;
  occurredAt?: string;
  rawReference?: string;
  createdAt: string;
};

export type IntegrationCredentialPayload = {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  accountNumber?: string;
  environment?: 'sandbox' | 'production';
  providerAccountId?: string;
  providerAccountName?: string;
  [key: string]: unknown;
};

export type ProviderConnectionView = IntegrationProvider & {
  status: IntegrationConnectionStatus;
  lastSyncAt: string | null;
  lastError: string | null;
  detail: string | null;
};

export type MissingEvidenceReason =
  | 'not_connected'
  | 'not_found'
  | 'attempted_unavailable';

export type MissingEvidenceItem = {
  providerId: string;
  providerName: string;
  category: IntegrationCategory;
  capability: EvidenceCapability;
  reason: MissingEvidenceReason;
  message: string;
  attempted: boolean;
};

export type EvidencePack = {
  merchantId: string;
  supportPayoutCaseId?: string;
  generatedAt: string;
  items: NormalizedEvidenceItem[];
  groups: {
    ticket: NormalizedEvidenceItem[];
    orderAndRefund: NormalizedEvidenceItem[];
    tracking: NormalizedEvidenceItem[];
    deliveryProof: NormalizedEvidenceItem[];
    dispute: NormalizedEvidenceItem[];
    contractTerms: NormalizedEvidenceItem[];
    selfFulfillment: NormalizedEvidenceItem[];
  };
  missingEvidence: MissingEvidenceItem[];
  connectedSources: Array<{
    providerId: string;
    providerName: string;
    status: IntegrationConnectionStatus;
    summaries: string[];
  }>;
};
