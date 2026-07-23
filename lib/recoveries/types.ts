import type { Partner, PartnerRecoveryRule, PartnerRecoveryType } from '@/lib/partners/types';

export const RECOVERY_CASE_STATUSES = [
  'draft',
  'evidence_needed',
  'ready_to_submit',
  'submitted',
  'waiting_response',
  'chase_due',
  'approved',
  'partially_approved',
  'rejected',
  'appealed',
  'paid',
  'closed_unrecoverable',
] as const;
export type RecoveryCaseStatus = (typeof RECOVERY_CASE_STATUSES)[number];

export const RECOVERY_OWNER_TYPES = [
  'carrier',
  'three_pl',
  'warehouse',
  'supplier',
  'returns_provider',
  'payment_dispute_provider',
  'merchant_support',
  'merchant_ops',
  'merchant_finance',
  'unknown',
] as const;
export type RecoveryOwnerType = (typeof RECOVERY_OWNER_TYPES)[number];

export type RecoveryCaseEventType =
  | 'created'
  | 'status_changed'
  | 'evidence_added'
  | 'submitted'
  | 'chased'
  | 'approved'
  | 'partially_approved'
  | 'rejected'
  | 'appealed'
  | 'paid'
  | 'closed';

export type RecoveryExcludedCost = {
  label: string;
  amount?: number;
  reason: string;
};

export type RecoveryCase = {
  id: string;
  merchant_id: string;
  support_payout_case_id: string;
  loss_case_id: string | null;
  prevention_only: boolean;
  partner_id: string | null;
  recovery_type: PartnerRecoveryType;
  owner_type: RecoveryOwnerType;
  status: RecoveryCaseStatus;
  merchant_loss_amount: number;
  eligible_loss_amount: number | null;
  estimated_recoverable_min: number | null;
  estimated_recoverable_max: number | null;
  amount_recovered: number | null;
  amount_sought_minor: number;
  amount_approved_minor: number;
  amount_recovered_minor: number;
  amount_written_off_minor: number;
  currency: string;
  deadline_at: string | null;
  next_chase_at: string | null;
  last_chased_at: string | null;
  evidence_required: string[];
  evidence_missing: string[];
  evidence_complete: boolean;
  rejection_reason: string | null;
  calculation_reason: string[];
  excluded_costs: RecoveryExcludedCost[];
  internal_owner_user_id: string | null;
  created_at: string;
  updated_at: string;
  partner?: Partner | null;
  support_payout_case?: {
    id: string;
    claim_type: string;
    status: string;
    amount_at_risk: number | null;
    total_estimated_loss: number | null;
    currency: string | null;
    source_order_id: string | null;
    source_ticket_id: string | null;
    order_number?: string | null;
    ticket_external_id?: string | null;
  } | null;
};

export type RecoveryCaseEvent = {
  id: string;
  merchant_id: string;
  recovery_case_id: string;
  event_type: RecoveryCaseEventType;
  from_status: RecoveryCaseStatus | null;
  to_status: RecoveryCaseStatus | null;
  note: string | null;
  metadata: Record<string, unknown>;
  idempotency_key?: string | null;
  created_at: string;
};

export type RecoveryEstimate = {
  merchantLossAmount: number;
  eligibleLossAmount: number;
  estimatedRecoverableMin: number;
  estimatedRecoverableMax: number;
  currency: string;
  recoveryOwner: RecoveryOwnerType | 'merchant';
  recoveryType: PartnerRecoveryType;
  calculationReason: string[];
  excludedCosts: RecoveryExcludedCost[];
  requiredEvidence: string[];
  missingEvidence: string[];
  confidence: 'high' | 'medium' | 'low';
};

export type RecoveryCaseWithRule = {
  recoveryCase: RecoveryCase;
  partnerRule: PartnerRecoveryRule | null;
};

export const RECOVERY_STATUS_LABELS: Record<RecoveryCaseStatus, string> = {
  draft: 'Draft',
  evidence_needed: 'Evidence needed',
  ready_to_submit: 'Ready to submit',
  submitted: 'Submitted',
  waiting_response: 'Waiting response',
  chase_due: 'Chase due',
  approved: 'Approved',
  partially_approved: 'Partially approved',
  rejected: 'Rejected',
  appealed: 'Appealed',
  paid: 'Paid',
  closed_unrecoverable: 'Closed unrecoverable',
};

export const RECOVERY_OWNER_LABELS: Record<RecoveryOwnerType, string> = {
  carrier: 'Carrier',
  three_pl: '3PL',
  warehouse: 'Warehouse',
  supplier: 'Supplier',
  returns_provider: 'Returns provider',
  payment_dispute_provider: 'Payment / dispute provider',
  merchant_support: 'Support',
  merchant_ops: 'Ops',
  merchant_finance: 'Finance',
  unknown: 'Unknown',
};
