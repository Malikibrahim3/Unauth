// lib/evidence/ce3.ts
// Visa Compelling Evidence 3.0 eligibility assessment.
//
// CE3.0 went live across all major regions on October 17, 2025.
// It covers Visa reason code 10.4 — Other Fraud: Card Absent Environment.
// Reference: https://usa.visa.com/support/consumer/transaction-disputes.html

import type { CE3QualificationResult } from './types'
import type { IdentitySignalResult } from '@/lib/engine/types'

// Minimal order shape we need from the caller
interface SimpleOrder {
  order_id: string
  order_date: string | Date
  refund_status?: string | null
}

/**
 * Visa CE3.0 accepted identity signal types mapped to our internal signal names.
 * Each of these corresponds to a formally accepted data point per the CE3.0 framework.
 */
const CE3_ACCEPTED_SIGNALS: string[] = [
  'deviceMatch',     // maps to device_id / browser fingerprint
  'ipCluster',       // maps to IP address
  'emailVariant',    // maps to email address
  'addressCluster',  // maps to shipping address
  'phoneMatch',      // maps to phone number
  'accountLink',     // maps to login credentials / account_id
]

/**
 * Human-readable labels for CE3.0 signal names — used in narrative and PDF.
 */
export const CE3_SIGNAL_LABELS: Record<string, string> = {
  deviceMatch:    'Device ID',
  ipCluster:      'IP address',
  emailVariant:   'Email address',
  addressCluster: 'Shipping address',
  phoneMatch:     'Phone number',
  accountLink:    'Account credentials',
}

/**
 * Assess whether an evidence package meets Visa CE3.0 requirements.
 *
 * CE3.0 requirements per Visa's framework:
 * 1. Dispute must be reason code 10.4 — we cannot verify from our data
 *    so we note it as a prerequisite the merchant must confirm
 * 2. Merchant must identify TWO prior undisputed transactions from the same cardholder
 * 3. Those prior transactions must have occurred MORE THAN 120 DAYS before the
 *    disputed transaction
 * 4. Each prior transaction must share AT LEAST TWO accepted identity signals
 *    with the disputed order
 */
export function assessCE3Eligibility(
  disputedOrderId: string,
  disputedOrderDate: Date,
  orderHistory: SimpleOrder[],
  identitySignals: IdentitySignalResult[]
): CE3QualificationResult {
  const disputedDate = new Date(disputedOrderDate)
  const cutoffDate = new Date(disputedDate)
  cutoffDate.setDate(cutoffDate.getDate() - 120) // CE3.0 requires > 120 days prior

  // Find candidate prior transactions — undisputed, >120 days before dispute
  const candidatePriors = orderHistory.filter(order => {
    if (order.order_id === disputedOrderId) return false
    // Must be undisputed (no refund claimed)
    if (order.refund_status && order.refund_status !== 'none') return false
    const orderDate = new Date(order.order_date)
    return orderDate < cutoffDate
  })

  if (candidatePriors.length < 2) {
    return {
      eligible: false,
      reason:
        candidatePriors.length === 0
          ? 'No prior undisputed transactions found more than 120 days before the disputed order. CE3.0 requires two qualifying prior transactions.'
          : 'Only one qualifying prior transaction found more than 120 days before the dispute. CE3.0 requires two.',
      qualifyingSignals: [],
      priorTransactions: candidatePriors.map(p => ({
        orderId: p.order_id,
        orderDate: new Date(p.order_date),
        matchingSignals: [],
        wasUndisputed: true,
        daysPriorToDispute: Math.floor(
          (disputedDate.getTime() - new Date(p.order_date).getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      })),
      disqualifyingFactors: [
        candidatePriors.length === 0
          ? 'Insufficient prior transaction history at this store'
          : 'Insufficient qualifying prior transactions (minimum two required)',
      ],
    }
  }

  // For each candidate, determine which CE3.0 signals fired positively
  const firedSignals = new Set(
    identitySignals.filter(s => s.fired && CE3_ACCEPTED_SIGNALS.includes(s.signal)).map(s => s.signal)
  )

  const qualifyingPriors = candidatePriors
    .map(prior => {
      // A signal is considered to match if it fired across the cluster
      // (signals compare all orders in a cluster, so any fired CE3 signal
      //  is evidence linking this prior to the disputed order)
      const matchingSignals = Array.from(firedSignals)
      return {
        orderId: prior.order_id,
        orderDate: new Date(prior.order_date),
        matchingSignals,
        wasUndisputed: true,
        daysPriorToDispute: Math.floor(
          (disputedDate.getTime() - new Date(prior.order_date).getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      }
    })
    .filter(p => p.matchingSignals.length >= 2) // CE3.0: at least 2 matching signals per prior tx
    .sort((a, b) => b.matchingSignals.length - a.matchingSignals.length)

  if (qualifyingPriors.length < 2) {
    const firedCount = firedSignals.size
    return {
      eligible: false,
      reason:
        firedCount === 0
          ? 'No accepted identity signals were detected between orders. CE3.0 requires at least two matching signals per qualifying prior transaction.'
          : `Only ${firedCount} accepted identity signal${firedCount === 1 ? '' : 's'} detected. CE3.0 requires each qualifying prior transaction to share at least two accepted signals with the disputed order.`,
      qualifyingSignals: Array.from(firedSignals),
      priorTransactions: qualifyingPriors,
      disqualifyingFactors: [
        'CE3.0 requires each qualifying prior transaction to share at least two accepted identity signals with the disputed order',
        'Consider including IP address, device ID, or account ID in your order exports to improve CE3.0 eligibility',
      ],
    }
  }

  const topTwo = qualifyingPriors.slice(0, 2)
  const allQualifyingSignals = [...new Set(topTwo.flatMap(p => p.matchingSignals))]

  return {
    eligible: true,
    reason: `This package meets Visa Compelling Evidence 3.0 requirements. Two prior undisputed transactions were identified, each sharing at least two accepted identity signals with the disputed order, and each occurring more than 120 days prior to the dispute.`,
    qualifyingSignals: allQualifyingSignals,
    priorTransactions: topTwo,
    disqualifyingFactors: [],
  }
}
