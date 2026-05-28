// lib/evidence/ce3.ts
// Visa Compelling Evidence 3.0 eligibility assessment.
//
// CE3.0 went live across all major regions on October 17, 2025.
// It covers Visa reason code 10.4 — Other Fraud: Card Absent Environment.
// Reference: https://usa.visa.com/support/consumer/transaction-disputes.html

import type { CE3QualificationResult } from './types'
import {
  extractCe3AcceptedHashes,
  type Ce3SignalHashes,
  type CE3AcceptedSignal,
} from '@/lib/identity/ce3SignalHashes'

export { extractCe3AcceptedHashes, type Ce3SignalHashes, type CE3AcceptedSignal }

interface CE3PriorInput {
  order_id: string
  order_date: string | Date
  refund_status?: string | null
  signalHashes: Ce3SignalHashes
}

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
 *    with the disputed order (evaluated per-prior via hash intersection)
 */
export function assessCE3Eligibility(
  disputedOrderId: string,
  disputedOrderDate: Date,
  disputedSignalHashes: Ce3SignalHashes,
  orderHistory: CE3PriorInput[],
): CE3QualificationResult {
  const disputedDate = disputedOrderDate
  const disputedKeys = Object.keys(disputedSignalHashes) as CE3AcceptedSignal[]

  const candidatePriors = orderHistory.filter(p =>
    p.order_id !== disputedOrderId &&
    (!p.refund_status || p.refund_status === 'none') &&
    Math.floor((disputedDate.getTime() - new Date(p.order_date).getTime()) / 86400000) > 120
  )

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
          (disputedDate.getTime() - new Date(p.order_date).getTime()) / 86400000
        ),
      })),
      disqualifyingFactors: [
        candidatePriors.length === 0
          ? 'Insufficient prior transaction history at this store'
          : 'Insufficient qualifying prior transactions (minimum two required)',
      ],
    }
  }

  const perPrior = candidatePriors.map(prior => {
    const matchingSignals = disputedKeys.filter(
      k => prior.signalHashes[k] && prior.signalHashes[k] === disputedSignalHashes[k]
    )
    return {
      orderId: prior.order_id,
      orderDate: new Date(prior.order_date),
      matchingSignals,
      wasUndisputed: true,
      daysPriorToDispute: Math.floor(
        (disputedDate.getTime() - new Date(prior.order_date).getTime()) / 86400000
      ),
    }
  })

  const evaluated = perPrior
    .filter(p => p.matchingSignals.length >= 2)
    .sort((a, b) => b.matchingSignals.length - a.matchingSignals.length)

  if (evaluated.length < 2) {
    const disputedSignalCount = disputedKeys.length
    return {
      eligible: false,
      reason:
        disputedSignalCount === 0
          ? 'No accepted identity signals were detected between orders. CE3.0 requires at least two matching signals per qualifying prior transaction.'
          : `Only ${disputedSignalCount} accepted identity signal${disputedSignalCount === 1 ? '' : 's'} on the disputed order. CE3.0 requires each qualifying prior transaction to share at least two accepted signals with the disputed order.`,
      qualifyingSignals: disputedKeys,
      priorTransactions: perPrior,
      disqualifyingFactors: [
        'CE3.0 requires each qualifying prior transaction to share at least two accepted identity signals with the disputed order',
        'Consider including IP address, device ID, or account ID in your order exports to improve CE3.0 eligibility',
      ],
    }
  }

  const eligible = evaluated.length >= 2
  const topTwo = evaluated.slice(0, 2)
  const qualifyingSignals = [...new Set(topTwo.flatMap(p => p.matchingSignals))]

  return {
    eligible,
    reason: `This package meets Visa Compelling Evidence 3.0 requirements. Two prior undisputed transactions were identified, each sharing at least two accepted identity signals with the disputed order, and each occurring more than 120 days prior to the dispute.`,
    qualifyingSignals,
    priorTransactions: topTwo,
    disqualifyingFactors: [],
  }
}
