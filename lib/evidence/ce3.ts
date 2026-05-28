// lib/evidence/ce3.ts
// Visa Compelling Evidence 3.0 eligibility assessment.
//
// CE3.0 went live across all major regions on October 17, 2025.
// It covers Visa reason code 10.4 — Other Fraud: Card Absent Environment.
// Reference: https://usa.visa.com/support/consumer/transaction-disputes.html

import type { CE3QualificationResult, CE3CoreElement } from './types'
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
  /** Payment credential proxy (e.g. card last 4) used to verify same-PAN. */
  paymentCredential?: string | null
}

/**
 * Human-readable labels for CE3.0 signal names — used in narrative and PDF.
 */
export const CE3_SIGNAL_LABELS: Record<string, string> = {
  deviceMatch:    'Device ID / fingerprint',
  ipCluster:      'IP address',
  emailVariant:   'Email address',
  addressCluster: 'Shipping address',
  phoneMatch:     'Phone number',
  accountLink:    'User ID / account',
}

/**
 * Visa CE3.0 (Reason Code 10.4) accepts exactly FOUR core data elements for the
 * matching requirement. Email and phone are NOT CE3.0 elements (they belonged to
 * the superseded CE2.0 rule). Source: Visa "Compelling Evidence 3.0 Merchant
 * Readiness" guide.
 */
export const CE3_CORE_ELEMENTS: CE3CoreElement[] = [
  'accountLink',   // User ID / account login
  'ipCluster',     // IP address
  'addressCluster',// Shipping address
  'deviceMatch',   // Device ID / fingerprint
]

/** At least one matching element MUST be one of these (IP address or Device ID). */
export const CE3_MANDATORY_ELEMENTS: CE3CoreElement[] = ['ipCluster', 'deviceMatch']

/** Prior transactions must be at least this many calendar days before the dispute. */
export const CE3_MIN_DAYS = 120
/** ...and no older than this many calendar days. */
export const CE3_MAX_DAYS = 365

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
const DAY_MS = 86_400_000

function daysBetween(disputed: Date, prior: Date | string): number {
  return Math.floor((disputed.getTime() - new Date(prior).getTime()) / DAY_MS)
}

/**
 * Assess Visa CE3.0 eligibility for a disputed Reason Code 10.4 transaction.
 *
 * Visa requirements (CE3.0 Merchant Readiness):
 *  1. TWO prior undisputed transactions on the same payment credential, same merchant.
 *  2. Each prior must be 120–365 calendar days before the dispute date.
 *  3. Each must share at least TWO of the four core data elements with the disputed
 *     order: User ID, IP address, Shipping address, Device ID/fingerprint.
 *  4. At least ONE of the matching elements must be the IP address or Device ID.
 */
export function assessCE3Eligibility(
  disputedOrderId: string,
  disputedOrderDate: Date,
  disputedSignalHashes: Ce3SignalHashes,
  orderHistory: CE3PriorInput[],
  opts?: { disputedPaymentCredential?: string | null },
): CE3QualificationResult {
  const disputedDate = disputedOrderDate
  const windowDays = { min: CE3_MIN_DAYS, max: CE3_MAX_DAYS }

  // Only the four Visa core elements present on the disputed order are evaluable.
  const disputedCoreKeys = CE3_CORE_ELEMENTS.filter(k => disputedSignalHashes[k])

  const disputedCredential = opts?.disputedPaymentCredential ?? null

  // Evaluate every undisputed prior order (exclude the disputed order itself).
  const evaluated = orderHistory
    .filter(p => p.order_id !== disputedOrderId && (!p.refund_status || p.refund_status === 'none'))
    .map(prior => {
      const days = daysBetween(disputedDate, prior.order_date)
      const matchingSignals = CE3_CORE_ELEMENTS.filter(
        k => prior.signalHashes[k] && prior.signalHashes[k] === disputedSignalHashes[k],
      )
      const hasMandatoryElement = matchingSignals.some(k =>
        CE3_MANDATORY_ELEMENTS.includes(k as CE3CoreElement),
      )
      const withinWindow = days >= CE3_MIN_DAYS && days <= CE3_MAX_DAYS

      // Same-PAN check: a mismatch disqualifies; absence means "unverified".
      const priorCredential = prior.paymentCredential ?? null
      const credentialMismatch =
        !!disputedCredential && !!priorCredential && disputedCredential !== priorCredential

      const qualifies =
        matchingSignals.length >= 2 && hasMandatoryElement && withinWindow && !credentialMismatch

      return {
        orderId: prior.order_id,
        orderDate: new Date(prior.order_date),
        matchingSignals,
        wasUndisputed: true,
        daysPriorToDispute: days,
        withinWindow,
        hasMandatoryElement,
        credentialMismatch,
        qualifies,
      }
    })
    // Strongest evidence first: most matching elements, then most recent prior.
    .sort((a, b) =>
      b.matchingSignals.length - a.matchingSignals.length ||
      a.daysPriorToDispute - b.daysPriorToDispute,
    )

  const qualifying = evaluated.filter(e => e.qualifies)
  const topTwo = (qualifying.length >= 2 ? qualifying : evaluated).slice(0, 2)
  const eligible = qualifying.length >= 2

  // Payment-credential verdict across the disputed order + the two selected priors.
  let paymentCredential: 'verified' | 'unverified' | 'mismatch' = 'unverified'
  if (topTwo.some(p => p.credentialMismatch)) {
    paymentCredential = 'mismatch'
  } else if (disputedCredential && topTwo.length > 0 && topTwo.every(p => !p.credentialMismatch)) {
    // Verified only if we actually had credentials to compare on every prior.
    const allPriorsHadCredential = topTwo.length >= 2
    paymentCredential = allPriorsHadCredential ? 'verified' : 'unverified'
  }

  const qualifyingSignals = [...new Set(topTwo.filter(p => p.qualifies).flatMap(p => p.matchingSignals))]
  const mandatorySatisfied = eligible && topTwo.every(p => p.hasMandatoryElement)

  // Per-core-element match grid across the disputed order and the selected priors.
  const matchMatrix = CE3_CORE_ELEMENTS.map(element => ({
    element,
    label: CE3_SIGNAL_LABELS[element] ?? element,
    isMandatory: CE3_MANDATORY_ELEMENTS.includes(element),
    disputedPresent: !!disputedSignalHashes[element],
    priorMatches: topTwo.map(p => p.matchingSignals.includes(element)),
  }))

  const stripInternal = (p: (typeof evaluated)[number]) => ({
    orderId: p.orderId,
    orderDate: p.orderDate,
    matchingSignals: p.matchingSignals,
    wasUndisputed: p.wasUndisputed,
    daysPriorToDispute: p.daysPriorToDispute,
    withinWindow: p.withinWindow,
    hasMandatoryElement: p.hasMandatoryElement,
  })

  const base = {
    qualifyingSignals,
    priorTransactions: topTwo.map(stripInternal),
    matchMatrix,
    mandatorySatisfied,
    windowDays,
    paymentCredential,
  }

  if (eligible) {
    return {
      ...base,
      eligible: true,
      reason:
        `Two prior undisputed transactions were identified on the same merchant account, each occurring ` +
        `between ${CE3_MIN_DAYS} and ${CE3_MAX_DAYS} days before the dispute, and each sharing at least ` +
        `two core identity signals with the disputed order including at least one of IP address or Device ID.`,
      disqualifyingFactors: [],
    }
  }

  // ── Not eligible: produce the most specific disqualifying reason. ──────────
  const disqualifyingFactors: string[] = []
  let reason: string

  const inWindowUndisputed = evaluated.filter(e => e.withinWindow)
  const tooOld = evaluated.filter(e => e.daysPriorToDispute > CE3_MAX_DAYS)
  const tooRecent = evaluated.filter(e => e.daysPriorToDispute < CE3_MIN_DAYS)

  if (disputedCoreKeys.length < 2) {
    reason =
      `The disputed order carries only ${disputedCoreKeys.length} core identity signal` +
      `${disputedCoreKeys.length === 1 ? '' : 's'}. A strong prior match needs at least two core signals ` +
      `(User ID, IP address, Shipping address, Device ID) on the disputed order, including IP or Device ID.`
    disqualifyingFactors.push('Insufficient core identity signals captured on the disputed order')
    disqualifyingFactors.push('Capture IP address and a device fingerprint at checkout to strengthen prior-order matching')
  } else if (inWindowUndisputed.length < 2 && (tooOld.length > 0 || tooRecent.length > 0)) {
    reason =
      `Prior transactions exist but fall outside the ${CE3_MIN_DAYS}–${CE3_MAX_DAYS} day lookback window ` +
      `(measured from the dispute date). Two matched priors within that window are needed for a strong prior match.`
    if (tooOld.length > 0) {
      disqualifyingFactors.push(
        `${tooOld.length} prior transaction${tooOld.length === 1 ? ' is' : 's are'} older than ${CE3_MAX_DAYS} days and cannot be used`,
      )
    }
    if (tooRecent.length > 0) {
      disqualifyingFactors.push(
        `${tooRecent.length} prior transaction${tooRecent.length === 1 ? ' is' : 's are'} more recent than ${CE3_MIN_DAYS} days and cannot be used`,
      )
    }
  } else if (paymentCredential === 'mismatch') {
    reason =
      'A matched prior used a different payment credential than the disputed order. Same payment credential across compared orders strengthens the match.'
    disqualifyingFactors.push('Payment credential (PAN) does not match across transactions')
  } else if (evaluated.some(e => e.withinWindow && e.matchingSignals.length >= 2 && !e.hasMandatoryElement)) {
    reason =
      'Prior transactions match on shipping address and/or user ID, but none share IP address or Device ID with the disputed order.'
    disqualifyingFactors.push('No matching IP address or Device ID on matched priors')
  } else {
    reason =
      `Fewer than two prior transactions satisfy a strong match (two overlapping core signals within ` +
      `${CE3_MIN_DAYS}–${CE3_MAX_DAYS} days, including an IP or Device match).`
    disqualifyingFactors.push('Insufficient qualifying prior transactions (minimum two required)')
  }

  return {
    ...base,
    eligible: false,
    reason,
    disqualifyingFactors,
  }
}
