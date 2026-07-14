import type { ClaimTypeValue } from '@/lib/claims/claimTypes';
import type { RuleEvaluationResult } from '@/lib/rules-engine';

export type ClaimGateSource = 'gorgias' | 'zendesk' | 'freshdesk' | 'api' | 'dashboard' | 'unknown';
export type ClaimGateActorType = 'human_agent' | 'ai_agent' | 'unknown';

export type GateStatus =
  | 'PROCEED'
  | 'HOLD_FOR_REVIEW'
  | 'NEED_MORE_EVIDENCE'
  | 'ESCALATE'
  | 'ERROR_MANUAL_REVIEW';

export type ClaimGateClaimType =
  | 'DELIVERED_NOT_RECEIVED'
  | 'ITEM_NOT_RECEIVED'
  | 'REFUND_AFTER_SHIPMENT'
  | 'DAMAGED_ITEM'
  | 'MISSING_ITEM'
  | 'WRONG_ITEM'
  | 'RETURN_EXCEPTION'
  | 'UNKNOWN';

export type ClaimGateRequest = {
  merchant_id: string;
  source?: ClaimGateSource | string;
  actor_type?: ClaimGateActorType | string;
  ticket_id?: string;
  customer_email?: string;
  order_id?: string | null;
  claim_text?: string;
  requested_action?: string | null;
  gorgias_domain?: string | null;
};

export type ClaimGateEvidenceSummary = {
  order_value: number;
  order_number: string | null;
  delivery_status: 'DELIVERED' | 'IN_TRANSIT' | 'PENDING' | 'UNKNOWN';
  proof_of_delivery: 'PRESENT' | 'MISSING' | 'UNKNOWN';
  carrier: string | null;
  delivered_at: string | null;
  prior_dnr_claims_120d: number;
  prior_refunds_120d: number;
  prior_replacements_120d: number;
  carrier_claim_window: 'OPEN' | 'CLOSING_SOON' | 'LIKELY_CLOSED' | 'UNKNOWN';
  chargeback_risk: 'LOW' | 'MEDIUM' | 'HIGH';
};

export type ClaimGateFulfillmentEvidence = {
  tracking_number: string;
  carrier: string;
  carrier_identified_via: 'source_fulfillments' | 'ups_api' | 'fedex_api';
  current_status: string;
  delivery_scan_present: boolean;
  delivery_timestamp?: string;
  pod_present: boolean;
  pod_url?: string;
  pod_type?: string;
  last_checkpoint_message: string;
  last_checkpoint_time: string;
  exception_present: boolean;
  exception_reason?: string;
  carrier_claim_window_open: boolean;
  carrier_claim_deadline?: string;
  tracking_source: 'ups' | 'fedex';
  evidence_strength: 'strong' | 'moderate' | 'weak';
};

export type ClaimGateShipBobEvidence = {
  order_found: boolean;
  order_id?: string;
  order_status?: string;
  shipment_count: number;
  pick_pack_events: number;
  exception_present: boolean;
  exception_reason?: string;
  return_status?: string;
  return_items?: Array<{
    reference_id: string;
    name: string;
    quantity: number;
    condition?: string;
  }>;
};

/**
 * Which evidence sources are actually connected for this merchant.
 *
 * This is the backbone of honest reasoning: it lets the decision engine tell
 * "data missing" (source connected, returned nothing) apart from "unavailable"
 * (source not connected, so the gate cannot speak to that dimension at all).
 */
export type ClaimGateConnections = {
  /** Direct UPS/FedEx APIs — delivery scans, proof of delivery, and claim windows. */
  carrier_tracking: boolean;
  /** ShipBob — warehouse pick/pack records, SKU verification. */
  warehouse: boolean;
  /** A helpdesk ticket source (Gorgias/Zendesk/Freshdesk) is linked. */
  helpdesk: boolean;
};

export type ClaimGateEvidence = {
  order: Record<string, unknown> | null;
  ticket: Record<string, unknown> | null;
  shipment: Record<string, unknown> | null;
  connections: ClaimGateConnections;
  claimHistory: {
    priorDnrClaims120d: number;
    priorRefunds120d: number;
    priorReplacements120d: number;
  };
  moneyAtRisk: number;
  currency: string;
  summary: ClaimGateEvidenceSummary;
  fulfillmentEvidence: ClaimGateFulfillmentEvidence[];
  shipbobEvidence: ClaimGateShipBobEvidence | null;
};

export type TriggeredGateRule = {
  rule_id: string | null;
  rule_name: string;
  reason: string;
};

export type ClaimGateDecision = {
  gateStatus: GateStatus;
  triggeredRules: TriggeredGateRule[];
  policyNextStep: string;
  allowedActions: string[];
  blockedActions: string[];
  evaluation: RuleEvaluationResult | null;
};

export type ClaimGateCase = {
  id: string;
  claim_type: ClaimTypeValue;
  status: string;
  case_url: string;
};
