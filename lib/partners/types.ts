export const PARTNER_TYPES = [
  'carrier',
  'three_pl',
  'warehouse',
  'supplier',
  'returns_provider',
  'payment_dispute_provider',
  'internal_team',
  'other',
] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export type PartnerStatus = 'active' | 'inactive';

export type Partner = {
  id: string;
  merchant_id: string;
  partner_type: PartnerType;
  name: string;
  external_reference: string | null;
  contact_email: string | null;
  contact_url: string | null;
  notes: string | null;
  default_contact_channel?: 'email' | 'portal' | 'manual' | 'api' | null;
  response_sla_hours?: number | null;
  contact_instructions?: string | null;
  status: PartnerStatus;
  created_at: string;
  updated_at: string;
};

export const RECOVERY_TYPES = [
  'carrier_claim',
  'three_pl_claim',
  'warehouse_error',
  'supplier_defect',
  'packaging_issue',
  'returns_provider_claim',
  'chargeback_evidence',
  'internal_policy_fix',
  'other',
] as const;
export type PartnerRecoveryType = (typeof RECOVERY_TYPES)[number];

export const PARTNER_RULE_CLAIM_TYPES = [
  'item_not_received',
  'damaged_item',
  'wrong_item',
  'missing_item',
  'late_delivery',
  'returnless_refund',
  'discount_request',
  'store_credit_request',
  'chargeback_related',
  'replacement_request',
  'other',
] as const;
export type PartnerRuleClaimType = (typeof PARTNER_RULE_CLAIM_TYPES)[number];

export type LiabilityCapBasis = 'fixed' | 'declared_value' | 'insured_value' | 'contractual' | 'unknown';
export type SubmissionMethod = 'portal' | 'email' | 'api' | 'unknown';
export type RuleSourceType = 'unauth_default' | 'merchant_configured' | 'contract_extracted';
export type PartnerRuleConfidence = 'high' | 'medium' | 'low';

export type PartnerRecoveryRule = {
  id: string;
  merchant_id: string;
  partner_id: string | null;
  rule_name: string;
  recovery_type: PartnerRecoveryType;
  applies_to_claim_type: PartnerRuleClaimType;
  claimable_costs: string[];
  excluded_costs: string[];
  required_evidence: string[];
  deadline_days: number | null;
  liability_cap_amount: number | null;
  liability_cap_currency: string | null;
  liability_cap_basis: LiabilityCapBasis | null;
  submission_method: SubmissionMethod | null;
  submission_url: string | null;
  submission_email: string | null;
  source_type: RuleSourceType;
  confidence: PartnerRuleConfidence;
  active: boolean;
  created_at: string;
  updated_at: string;
  partner?: Partner | null;
};

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  carrier: 'Carrier',
  three_pl: '3PL',
  warehouse: 'Warehouse',
  supplier: 'Supplier',
  returns_provider: 'Returns provider',
  payment_dispute_provider: 'Payment / dispute provider',
  internal_team: 'Internal team',
  other: 'Other',
};

export const RECOVERY_TYPE_LABELS: Record<PartnerRecoveryType, string> = {
  carrier_claim: 'Carrier claim',
  three_pl_claim: '3PL claim',
  warehouse_error: 'Warehouse error',
  supplier_defect: 'Supplier defect',
  packaging_issue: 'Packaging issue',
  returns_provider_claim: 'Returns provider claim',
  chargeback_evidence: 'Chargeback evidence',
  internal_policy_fix: 'Internal policy fix',
  other: 'Other',
};
