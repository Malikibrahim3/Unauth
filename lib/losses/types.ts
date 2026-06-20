export const LOSS_CASE_CATEGORIES = [
  'delivery_loss',
  'chargeback_or_payment_dispute',
  'refund_dispute',
  'returns_abuse_or_exception',
  'damaged_goods',
  'wrong_item_or_missing_item',
  'fulfilment_or_warehouse_error',
  '3pl_accountability',
  'shipping_protection_claim',
  'marketplace_dispute',
  'supplier_or_vendor_issue',
  'tax_duty_or_customs_issue',
  'subscription_or_digital_fulfilment_issue',
  'unknown_post_purchase_loss',
] as const;
export type LossCaseCategory = (typeof LOSS_CASE_CATEGORIES)[number];

export const LOSS_RECOVERY_ROUTES = [
  'carrier_claim',
  'carrier_service_refund',
  '3pl_claim',
  'shipping_protection_claim',
  'payment_processor_dispute',
  'chargeback_evidence_pack',
  'bank_or_card_network_response',
  'returns_platform_claim',
  'marketplace_claim',
  'supplier_vendor_claim',
  'internal_fulfilment_issue',
  'customer_evidence_review',
  'not_recoverable',
  'needs_more_evidence',
] as const;
export type LossRecoveryRoute = (typeof LOSS_RECOVERY_ROUTES)[number];

export const LOSS_CASE_STATUSES = [
  'detected',
  'collecting_evidence',
  'missing_source_data',
  'needs_external_correspondence',
  'external_correspondence_requested',
  'external_response_received',
  'evidence_pack_ready',
  'submitted',
  'approved',
  'partially_approved',
  'denied',
  'expired',
  'closed_unrecoverable',
] as const;
export type LossCaseStatus = (typeof LOSS_CASE_STATUSES)[number];

export const COUNTERPARTY_TYPES = [
  'carrier',
  '3pl',
  'warehouse',
  'payment_processor',
  'bank',
  'card_network',
  'marketplace',
  'returns_provider',
  'shipping_protection_provider',
  'supplier',
  'customs_broker',
  'customer',
  'internal_team',
  'unknown',
] as const;
export type CounterpartyType = (typeof COUNTERPARTY_TYPES)[number];

export const SOURCE_CONFIDENCES = [
  'source_verified',
  'partial_source_verified',
  'insufficient_source_data',
] as const;
export type SourceConfidence = (typeof SOURCE_CONFIDENCES)[number];

export type LossCase = {
  id: string;
  merchant_id: string;
  support_payout_case_id?: string | null;
  case_category: LossCaseCategory;
  case_type: string;
  recovery_route: LossRecoveryRoute;
  status: LossCaseStatus;
  order_id: string | null;
  customer_identity_id: string | null;
  helpdesk_ticket_id: string | null;
  payment_id: string | null;
  dispute_id: string | null;
  return_id: string | null;
  shipment_id: string | null;
  fulfilment_id: string | null;
  counterparty_type: CounterpartyType;
  counterparty_name: string | null;
  evidence_completion_score: number;
  missing_evidence_count: number;
  claim_deadline_at: string | null;
  order_value_minor: number | null;
  refund_value_minor: number | null;
  chargeback_value_minor: number | null;
  estimated_recovery_minor: number | null;
  approved_recovery_minor: number | null;
  currency: string | null;
  source_confidence: SourceConfidence;
  created_at: string;
  updated_at: string;
};

export const CORRESPONDENCE_DIRECTIONS = ['inbound', 'outbound'] as const;
export type CorrespondenceDirection = (typeof CORRESPONDENCE_DIRECTIONS)[number];

export const CORRESPONDENCE_CHANNELS = [
  'provider_api',
  'gmail',
  'outlook',
  'gorgias',
  'zendesk',
  'intercom',
  'slack',
  'erp',
  'wms',
  'marketplace_portal_api',
  'payment_processor_api',
] as const;
export type CorrespondenceChannel = (typeof CORRESPONDENCE_CHANNELS)[number];

export const CORRESPONDENCE_EXTRACTION_STATUSES = [
  'not_required',
  'pending',
  'extracted',
  'failed',
  'low_confidence',
] as const;
export type CorrespondenceExtractionStatus = (typeof CORRESPONDENCE_EXTRACTION_STATUSES)[number];

export type ExternalCorrespondence = {
  id: string;
  merchant_id: string;
  loss_case_id: string | null;
  direction: CorrespondenceDirection;
  counterparty_type: CounterpartyType;
  counterparty_name: string | null;
  channel: CorrespondenceChannel;
  source_provider: string;
  source_record_id: string;
  source_thread_id: string | null;
  source_url: string | null;
  subject: string | null;
  body_hash: string | null;
  attachment_hashes: string[];
  matched_confidence: number;
  extraction_status: CorrespondenceExtractionStatus;
  extracted_facts_json: Record<string, unknown> | null;
  received_at: string | null;
  sent_at: string | null;
  pulled_at: string;
  created_at: string;
};

export const CLARIFICATION_REQUEST_STATUSES = [
  'generated',
  'blocked_by_settings',
  'sent',
  'failed',
  'reply_received',
  'expired',
] as const;
export type ClarificationRequestStatus = (typeof CLARIFICATION_REQUEST_STATUSES)[number];

export type ExternalClarificationRequest = {
  id: string;
  merchant_id: string;
  loss_case_id: string;
  counterparty_type: CounterpartyType;
  counterparty_name: string | null;
  requested_evidence_types: string[];
  outbound_channel: CorrespondenceChannel;
  recipient_or_endpoint: string | null;
  subject: string | null;
  body_hash: string | null;
  source_message_id: string | null;
  source_thread_id: string | null;
  hidden_threading_token: string;
  status: ClarificationRequestStatus;
  sent_at: string | null;
  reply_received_at: string | null;
  created_at: string;
};

export type CorrespondenceAutomationSettings = {
  autoGenerateClarificationRequests: boolean;
  autoSendClarificationRequests: boolean;
  autoIngestExternalCorrespondence: boolean;
  autoExtractFactsFromCorrespondence: boolean;
  allowedCounterpartyTypes: CounterpartyType[];
  allowedOutboundChannels: CorrespondenceChannel[];
  maxAutoRequestValueMinor: number | null;
};

export const DEFAULT_CORRESPONDENCE_AUTOMATION_SETTINGS: CorrespondenceAutomationSettings = {
  autoGenerateClarificationRequests: true,
  autoSendClarificationRequests: false,
  autoIngestExternalCorrespondence: true,
  autoExtractFactsFromCorrespondence: true,
  allowedCounterpartyTypes: [...COUNTERPARTY_TYPES],
  allowedOutboundChannels: [...CORRESPONDENCE_CHANNELS],
  maxAutoRequestValueMinor: null,
};

export const LOSS_CASE_EVIDENCE_SOURCE_PROVIDERS = [
  'shopify',
  'gorgias',
  'zendesk',
  'intercom',
  'aftership',
  'carrier_api',
  'gmail',
  'outlook',
  'stripe',
  'paypal',
  'adyen',
  'shopify_payments',
  'returns_provider',
  '3pl',
  'wms',
  'erp',
  'marketplace',
  'shipping_protection_provider',
  'supplier_portal',
  'slack',
] as const;
export type LossCaseEvidenceSourceProvider = (typeof LOSS_CASE_EVIDENCE_SOURCE_PROVIDERS)[number];

export const EVIDENCE_EXTRACTION_METHODS = [
  'direct_api',
  'webhook',
  'email_parser',
  'helpdesk_parser',
  'llm_extractor',
  'deterministic_rule',
] as const;
export type EvidenceExtractionMethod = (typeof EVIDENCE_EXTRACTION_METHODS)[number];

export type LossCaseEvidence = {
  id: string;
  merchant_id: string;
  loss_case_id: string;
  evidence_type: string;
  source_provider: LossCaseEvidenceSourceProvider;
  source_record_id: string;
  source_thread_id: string | null;
  source_url: string | null;
  value_json: Record<string, unknown>;
  raw_payload_hash: string;
  source_verified: boolean;
  extracted_by: EvidenceExtractionMethod;
  extraction_confidence: number | null;
  pulled_at: string;
  created_at: string;
};

export const LOSS_CASE_EVENT_TYPES = [
  'case_detected',
  'evidence_pulled',
  'missing_evidence_identified',
  'correspondence_ingested',
  'correspondence_matched',
  'correspondence_unmatched',
  'facts_extracted',
  'clarification_request_generated',
  'clarification_request_sent',
  'external_response_received',
  'evidence_pack_generated',
  'claim_submitted',
  'status_synced',
  'case_closed',
  'sync_failed',
] as const;
export type LossCaseEventType = (typeof LOSS_CASE_EVENT_TYPES)[number];

export type LossCaseEvent = {
  id: string;
  merchant_id: string;
  loss_case_id: string;
  event_type: LossCaseEventType;
  source_provider: string | null;
  source_record_id: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
};
