// lib/evidence/types.ts
// Types for the chargeback evidence package system.

/** The four core data elements Visa accepts for CE3.0 matching (RC 10.4). */
export type CE3CoreElement = 'accountLink' | 'ipCluster' | 'addressCluster' | 'deviceMatch'

export interface CE3QualificationResult {
  eligible: boolean
  reason: string                    // plain English — why eligible or not
  qualifyingSignals: string[]       // which core elements satisfy CE3.0 matching requirement
  priorTransactions: Array<{        // the two prior transactions CE3.0 requires
    orderId: string
    orderDate: Date
    matchingSignals: string[]       // which core elements matched between this and the disputed order
    wasUndisputed: boolean          // CE3.0 requires prior transactions to be undisputed
    daysPriorToDispute: number      // CE3.0 requires 120–365 days prior
    withinWindow: boolean           // true when 120 ≤ days ≤ 365
    hasMandatoryElement: boolean    // true when an IP or Device match is present
  }>
  disqualifyingFactors: string[]    // reasons CE3.0 cannot be claimed if not eligible
  // ── Forensic detail (for the evidence package presentation) ───────────────
  /** Per-core-element match grid across the disputed order and the prior transactions. */
  matchMatrix: Array<{
    element: CE3CoreElement
    label: string
    isMandatory: boolean            // IP address or Device ID
    disputedPresent: boolean        // element captured on the disputed order
    priorMatches: boolean[]         // aligned 1:1 with priorTransactions
  }>
  /** True when the qualifying priors each share an IP or Device match with the disputed order. */
  mandatorySatisfied: boolean
  /** The CE3.0 age window applied (calendar days before the dispute date). */
  windowDays: { min: number; max: number }
  /** Whether the same payment credential could be confirmed across all transactions. */
  paymentCredential: 'verified' | 'unverified' | 'mismatch'
}

export interface EvidencePackage {
  referenceNumber: string
  generatedAt: Date
  merchant: {
    name: string
    id: string
  }
  disputedOrder: {
    orderId: string
    orderDate: Date
    orderValue: number
    currency: string
    outcome: string
  }
  customer: {
    maskedEmail: string
    maskedAddress?: string
    maskedPhone?: string
    paymentLast4?: string
    deviceHashPrefix?: string
    identifierTypesPresent: string[]
  }
  orderHistory: Array<{
    orderId: string
    date: Date
    value: number
    outcome: 'completed' | 'refunded' | 'partially_refunded' | 'disputed' | string
    timeToClaim?: string
    isDisputedOrder: boolean
    isCE3QualifyingTransaction?: boolean
  }>
  identityEvidence: Array<{
    identifierType: string
    maskedValue: string
    firstSeen: Date
    orderCount: number
    ce3Accepted: boolean            // whether Visa CE3.0 formally accepts this signal type
  }>
  ce3: CE3QualificationResult
  crossMerchant: {
    satisfied: boolean
    merchantCount?: number
    networkOrderCount?: number
    networkRefundRate?: number
    networkInrRate?: number
  }
  merchantNotes?: string
  confidenceGrade: 'definite' | 'probable' | 'possible' | 'weak'
  engineVersion: string
}
