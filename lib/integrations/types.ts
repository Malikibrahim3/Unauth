export type IntegrationCategory =
  | 'commerce'
  | 'helpdesk'
  | 'tracking'
  | 'carrier'
  | 'email'
  | '3pl'
  | 'wms'
  | 'returns'
  | 'payments'
  | 'chargebacks'
  | 'marketplace'
  | 'shipping_protection'
  | 'erp'
  | 'supplier'
  | 'internal_comms';

export type IntegrationAuthMode = 'oauth' | 'api_key' | 'webhook' | 'custom';
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
  | 'read_correspondence'
  | 'send_correspondence'
  | 'read_attachments'
  | 'ticket_messages'
  | 'ticket_attachments'
  | 'customer_claim_reason'
  | 'requested_action'
  | 'order_value'
  | 'line_items'
  | 'customer_history'
  | 'refund_history'
  | 'refund_record'
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
  | 'order_details'
  | 'proof_of_value'
  | 'proof_of_delivery_photo'
  | 'delivery_gps'
  | 'carrier_exception_reason'
  | 'carrier_lost_confirmation'
  | 'payment_record'
  | 'payment_transaction'
  | 'dispute_reason'
  | 'customer_correspondence'
  | 'customer_claim_message'
  | 'tracking_timeline'
  | 'delivery_confirmation'
  | 'return_status'
  | 'processor_case_update'
  | 'processor_settlement_status'
  | 'bank_trace_reference'
  | 'refund_failure_reason'
  | 'return_authorisation'
  | 'return_tracking'
  | 'return_request_status'
  | 'return_inspection_outcome'
  | 'warehouse_receiving_scan'
  | 'returned_item_condition'
  | 'returned_sku'
  | 'package_weight'
  | 'returns_provider_case_update'
  | 'fulfilment_record'
  | 'pick_pack_log'
  | 'packed_sku'
  | 'expected_sku'
  | 'warehouse_confirmation'
  | 'three_pl_confirmation'
  | 'purchase_order'
  | 'supplier_invoice'
  | 'receiving_record'
  | 'supplier_correspondence'
  | 'vendor_credit_note'
  | 'warehouse_discrepancy_report'
  | 'marketplace_case_status'
  | 'marketplace_correspondence'
  | 'protection_claim_status'
  | 'handover_scan'
  | 'warehouse_exception'
  | 'damage_photo'
  | 'carrier_damage_report'
  | 'customs_charge_record'
  | 'customs_broker_correspondence'
  | 'duty_tax_invoice'
  | 'shipment_manifest'
  | 'subscription_status'
  | 'digital_fulfilment_log'
  | 'warehouse_pick_pack'
  | 'three_pl_sla_claim_status'
  | 'carrier_claim_submission_status'
  | 'carrier_claim_outcome'
  | 'recovery_amount_approved'
  | 'recovery_amount_paid';

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
  | 'available_on_request'
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
  };
  missingEvidence: MissingEvidenceItem[];
  connectedSources: Array<{
    providerId: string;
    providerName: string;
    status: IntegrationConnectionStatus;
    summaries: string[];
  }>;
};
