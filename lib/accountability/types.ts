import type { ClaimGateClaimType, ClaimGateDecision, ClaimGateEvidence } from '@/lib/claim-gate/types';

export type LossSourceType =
  | 'CUSTOMER_CLAIM'
  | 'CARRIER_FAILURE'
  | 'WAREHOUSE_3PL_ERROR'
  | 'MERCHANT_POLICY_LEAKAGE'
  | 'SUPPORT_AGENT_OVERRIDE'
  | 'AI_AGENT_OVERRIDE'
  | 'PRODUCT_ISSUE'
  | 'PAYMENT_DISPUTE_RISK'
  | 'RETURN_ABUSE'
  | 'UNKNOWN';

export type LossSourceConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type AccountablePartyType =
  | 'CUSTOMER'
  | 'CARRIER'
  | 'WAREHOUSE_3PL'
  | 'MERCHANT'
  | 'SUPPORT_TEAM'
  | 'AI_AGENT'
  | 'PAYMENT_PROVIDER'
  | 'UNKNOWN';

export type RecoveryTaskType =
  | 'OPEN_CARRIER_CLAIM'
  | 'CONTACT_3PL'
  | 'REQUEST_CUSTOMER_EVIDENCE'
  | 'REQUEST_CARRIER_EVIDENCE'
  | 'ESCALATE_TO_MANAGER'
  | 'PREPARE_CHARGEBACK_EVIDENCE'
  | 'REVIEW_POLICY_OVERRIDE'
  | 'REVIEW_AGENT_ACTION'
  | 'WRITE_OFF_APPROVAL'
  | 'OTHER';

export type RecoveryTaskOwnerType =
  | 'CX_MANAGER'
  | 'OPS_MANAGER'
  | 'FINANCE'
  | 'LOGISTICS'
  | 'SUPPORT_AGENT'
  | 'THIRD_PARTY'
  | 'UNKNOWN';

export type RecoveryTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type RecommendedRecoveryTask = {
  task_type: RecoveryTaskType;
  owner_type: RecoveryTaskOwnerType;
  priority: RecoveryTaskPriority;
  due_at: string | null;
  recovery_deadline: string | null;
  amount_to_recover: number;
  notes: string | null;
};

export type LossSourceClassification = {
  source_type: LossSourceType;
  confidence: LossSourceConfidence;
  accountable_party_type: AccountablePartyType;
  accountable_party_name: string | null;
  evidence_summary: string;
  money_at_risk: number;
  potential_recovery_amount: number;
  recommended_recovery_tasks: RecommendedRecoveryTask[];
};

export type ClassifyLossSourceInput = {
  claimId: string;
  merchantId: string;
  claimType: ClaimGateClaimType;
  evidence: ClaimGateEvidence;
  gateDecision: ClaimGateDecision;
};

export type EvidenceItemInput = {
  source_system: string;
  evidence_type: string;
  title: string;
  summary: string;
  occurred_at?: string | null;
  raw_payload?: Record<string, unknown> | null;
  external_url?: string | null;
  proves?: string | null;
};

export type PersistedLossSource = LossSourceClassification & {
  id: string;
  claim_id: string;
  merchant_id: string;
  evidence_item_ids: string[];
  status: string;
};

export type PersistedRecoveryTask = RecommendedRecoveryTask & {
  id: string;
  claim_id: string;
  merchant_id: string;
  loss_source_id: string | null;
  status: string;
};

export type AccountabilityResult = {
  evidenceItems: Array<{ id: string; title: string; evidence_type: string }>;
  lossSources: PersistedLossSource[];
  recoveryTasks: PersistedRecoveryTask[];
  agreementEvaluation?: import('@/lib/agreements/evaluateAgreementRules').AgreementRuleEvaluationResult;
};

