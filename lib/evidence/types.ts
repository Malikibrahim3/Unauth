// lib/evidence/types.ts
// Types for the chargeback evidence package system.

export interface CE3QualificationResult {
  eligible: boolean
  reason: string                    // plain English — why eligible or not
  qualifyingSignals: string[]       // which signals satisfy CE3.0 matching requirement
  priorTransactions: Array<{        // the two prior transactions CE3.0 requires
    orderId: string
    orderDate: Date
    matchingSignals: string[]       // which signals matched between this and the disputed order
    wasUndisputed: boolean          // CE3.0 requires prior transactions to be undisputed
    daysPriorToDispute: number      // CE3.0 requires > 120 days prior
  }>
  disqualifyingFactors: string[]    // reasons CE3.0 cannot be claimed if not eligible
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
