/**
 * Evidence-reconciliation domain contracts.
 *
 * These types deliberately keep customer treatment, responsibility, and
 * recovery as separate axes. A recommendation is evidence-backed decision
 * support; it is never an instruction that Unauth executed an action.
 */

export const RECONCILIATION_RECOMMENDATION_TYPES = [
  'customer_action',
  'responsibility',
  'recovery',
] as const;
export type ReconciliationRecommendationType =
  (typeof RECONCILIATION_RECOMMENDATION_TYPES)[number];

export const RECONCILIATION_ASSESSMENT_STATES = [
  'known',
  'likely',
  'unresolved',
  'not_applicable',
  'blocked',
] as const;
export type ReconciliationAssessmentState =
  (typeof RECONCILIATION_ASSESSMENT_STATES)[number];

export type ReconciliationFactKind =
  | 'source_fact'
  | 'human_finding'
  | 'inference';

export type ReconciliationFact = {
  id: string;
  factKind: ReconciliationFactKind;
  evidenceType: string;
  sourceProvider: string;
  externalReference?: string | null;
  occurredAt?: string | null;
  collectedAt?: string | null;
  freshness?: 'fresh' | 'stale' | 'unavailable' | 'unknown' | string;
  summary?: string | null;
  sourceOrderLineId?: string | null;
  sourceShipmentId?: string | null;
  sourceShipmentLineId?: string | null;
  claimedItemId?: string | null;
  supports?: string[];
  conflicts?: string[];
  value?: Record<string, unknown> | null;
};

export type ReconciliationClaimedItem = {
  id: string;
  sku?: string | null;
  variantRef?: string | null;
  title?: string | null;
  quantity: number;
  sourceOrderLineId?: string | null;
  matchStatus?: 'unmatched' | 'candidate' | 'confirmed' | 'rejected' | string;
};

export type ReconciliationShipmentLine = {
  id: string;
  shipmentId: string;
  sourceOrderLineId?: string | null;
  sku?: string | null;
  variantRef?: string | null;
  quantityRecorded: number;
  recordKind: string;
  evidenceBasis: string;
};

export type ReconciliationParcel = {
  id: string;
  trackingNumber?: string | null;
  carrier?: string | null;
  status?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  estimatedDeliveryAt?: string | null;
  sourceProvider?: string | null;
  exception?: string | null;
  shipmentLines: ReconciliationShipmentLine[];
};

export type ReconciliationPolicy = {
  defaultCustomerAction?:
    | 'wait_and_explain'
    | 'refund'
    | 'targeted_reship'
    | 'replacement'
    | 'store_credit'
    | 'manual_review';
  allowTargetedReship?: boolean;
  delayThresholdHours?: number | null;
  ruleVersionId?: string | null;
  snapshot?: Record<string, unknown> | null;
};

export type ReconciliationRecoveryContract = {
  providerType?: 'carrier' | 'three_pl' | 'warehouse' | 'supplier' | string;
  claimType?: string | null;
  deadlineAt?: string | null;
  eligible?: boolean;
  requiredEvidence?: string[];
  liabilityCapMinor?: number | null;
  ruleVersionId?: string | null;
  snapshot?: Record<string, unknown> | null;
};

export type ReconciliationInput = {
  claimType?: string | null;
  requestedAction?: string | null;
  identityConfirmed?: boolean;
  orderConfirmed?: boolean;
  claimedItems: ReconciliationClaimedItem[];
  parcels: ReconciliationParcel[];
  facts: ReconciliationFact[];
  policy?: ReconciliationPolicy | null;
  recoveryContract?: ReconciliationRecoveryContract | null;
  now?: string;
};

export type ItemParcelState =
  | 'not_recorded'
  | 'in_transit'
  | 'delivered'
  | 'exception'
  | 'unresolved';

export type ItemParcelRow = {
  claimedItemId: string;
  parcelId: string | null;
  claimedSku: string | null;
  claimedQuantity: number;
  recordedQuantity: number;
  remainingQuantity: number;
  state: ItemParcelState;
  physicalProof: boolean;
  evidenceIds: string[];
  missingEvidence: string[];
};

export type ReconciliationRecommendation = {
  recommendationType: ReconciliationRecommendationType;
  resultCode: string;
  assessmentState: ReconciliationAssessmentState;
  headline: string;
  explanation: string;
  reasonCodes: string[];
  supportingEvidenceIds: string[];
  conflictingEvidenceIds: string[];
  missingEvidence: string[];
  recheckAt?: string | null;
  policyVersionId?: string | null;
  contractVersionId?: string | null;
  policySnapshot?: Record<string, unknown> | null;
  generatedAt: string;
  engineVersion: string;
};

export type ReconciliationRecommendationSnapshot = ReconciliationRecommendation & {
  id?: string;
  caseId?: string;
  inputHash?: string;
  supersedesSnapshotId?: string | null;
};
