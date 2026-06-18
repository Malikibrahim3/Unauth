export type ClaimDecisionContext = {
  merchantId: string;
  claim: {
    id: string;
    type: string | null;
    status: string | null;
    amountAtRisk: number | null;
    currency: string | null;
    reasonRaw: string | null;
    reasonNormalized: string | null;
    sourceOrderId: string | null;
    sourceTicketId: string | null;
    identityId: string | null;
    createdAt: string | null;
  };
  ticket: {
    id: string | null;
    externalId: string | null;
    source: string | null;
    status: string | null;
    subject: string | null;
    claimTypeConfidence: number | null;
  } | null;
  order: {
    id: string | null;
    externalId: string | null;
    orderNumber: string | null;
    totalAmount: number | null;
    currency: string | null;
    createdAt: string | null;
    financialStatus: string | null;
    fulfillmentStatus: string | null;
  } | null;
  delivery: {
    status: string | null;
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    deliveredAt: string | null;
    hasTracking: boolean;
    hasProofOfDelivery: boolean;
    daysSinceDelivery: number | null;
  } | null;
  identity: {
    id: string | null;
    confidenceGrade: string | null;
    confidenceScore: number | null;
    evidenceScore: number | null;
    evidenceLevel: string | null;
    hasSufficientData: boolean;
    evidenceBreakdown: unknown | null;
    isNetworkFlagged: boolean;
  } | null;
  history: {
    /** Total claims for this identity at this merchant, including the current claim. */
    merchantClaimCount: number;
    /** Prior claims at this merchant excluding the current claim. */
    merchantPriorClaimCount: number;
    /** Same-type claims including the current claim. */
    merchantSameTypeClaimCount: number;
    /** Same-type prior claims excluding the current claim. */
    merchantPriorSameTypeClaimCount: number;
    networkClaimCount: number | null;
    networkSameTypeClaimCount: number | null;
    priorApprovedClaims: number;
    priorDeniedClaims: number;
    priorEscalatedClaims: number;
    priorChargebacksAfterClaims: number;
    priorLossOutcomes: number;
    priorRecoveredOutcomes: number;
    daysSinceLastClaim: number | null;
    claimTypes: string[];
    hasCrossMerchantIdentity: boolean;
    networkMerchantCount: number;
    accountAgeDays: number | null;
  };
  evidence: {
    totalEvidenceItems: number;
    customerEvidenceItems: number;
    deliveryEvidenceItems: number;
    merchantEvidenceItems: number;
    hasCustomerEvidence: boolean;
    hasDeliveryEvidence: boolean;
  };
};

export type ClaimDecisionEvaluationSource = 'gorgias_widget' | 'claim_review' | 'api';
