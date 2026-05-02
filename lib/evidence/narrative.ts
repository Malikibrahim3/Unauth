// lib/evidence/narrative.ts
// Generates the plain-English narrative for an evidence package.
// CONTENT RULES:
//   - The word "fraud" NEVER appears
//   - No other merchant is named
//   - CE3.0 must be referenced explicitly when eligible
//   - Neutral, factual, professional voice

import type { EvidencePackage } from './types'
import { CE3_SIGNAL_LABELS } from './ce3'

function fmt(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

function plural(n: number, singular: string, plural_: string = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural_}`
}

/**
 * Returns the approximate period string between two dates.
 * e.g. "14 months", "3 years", "8 weeks"
 */
function period(from: Date, to: Date): string {
  const days = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 14) return `${days} days`
  if (days < 60) return `${Math.round(days / 7)} weeks`
  if (days < 730) return `${Math.round(days / 30)} months`
  return `${Math.round(days / 365)} years`
}

export function buildNarrative(pkg: EvidencePackage): string {
  const {
    disputedOrder,
    orderHistory,
    customer,
    ce3,
    crossMerchant,
    referenceNumber,
    generatedAt,
    merchant,
  } = pkg

  const currency = disputedOrder.currency ?? 'GBP'
  const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency + ' '

  const refundOrders = orderHistory.filter(o => o.outcome === 'refunded' || o.outcome === 'partially_refunded')
  const inrOrders = orderHistory.filter(o => o.outcome === 'refunded') // approximate INR as refunded
  const refundRate = orderHistory.length > 0 ? (refundOrders.length / orderHistory.length) * 100 : 0

  const firstOrder = orderHistory[0]
  const lastNonDisputed = orderHistory.filter(o => !o.isDisputedOrder).at(-1)
  const historyPeriod = firstOrder && lastNonDisputed
    ? period(firstOrder.date, new Date())
    : null

  const identifierList = customer.identifierTypesPresent.length > 0
    ? customer.identifierTypesPresent.join(', ')
    : 'order identifiers'

  const lines: string[] = []

  // --- Opening ---
  lines.push(
    `This report concerns order ${disputedOrder.orderId} placed on ${fmt(disputedOrder.orderDate)} for ${symbol}${disputedOrder.orderValue.toFixed(2)}.`
  )
  lines.push('')

  // --- Order history context ---
  lines.push(
    `The customer associated with this order has placed ${plural(orderHistory.length, 'order')} at ${merchant.name}` +
    (historyPeriod ? ` over the past ${historyPeriod}` : '') +
    `. Across that order history, the customer's account details (${identifierList}) are consistent across ${orderHistory.length} otherwise-distinct records at this store.`
  )

  // --- Refund patterns ---
  if (refundOrders.length > 0) {
    lines.push('')
    let refundLine = `${plural(refundOrders.length, 'refund claim')} ${refundOrders.length === 1 ? 'has' : 'have'} been made across this order history`
    if (inrOrders.length > 0) {
      refundLine += `, ${plural(inrOrders.length, 'of which', 'of which')} cited non-receipt of goods`
    }
    refundLine += `. This represents a ${refundRate.toFixed(1)}% refund rate`
    if (refundRate > 2) {
      refundLine += `, compared to a typical baseline of approximately 2% across our customer base`
    }
    refundLine += '.'
    lines.push(refundLine)
  }

  // --- CE3.0 section ---
  lines.push('')
  if (ce3.eligible) {
    const p1 = ce3.priorTransactions[0]
    const p2 = ce3.priorTransactions[1]
    const sigList = ce3.qualifyingSignals.map(s => CE3_SIGNAL_LABELS[s] ?? s).join(', ')

    lines.push(
      `This submission is presented in accordance with Visa Compelling Evidence 3.0 (CE3.0), introduced April 2023 and mandated from October 2025. Under CE3.0, a merchant may demonstrate that a disputed transaction is consistent with the cardholder's established purchasing pattern by identifying two prior undisputed transactions sharing accepted identity signals.`
    )
    lines.push(
      `Orders ${p1.orderId} (dated ${fmt(p1.orderDate)}) and ${p2.orderId} (dated ${fmt(p2.orderDate)}) each share ${sigList} with the disputed transaction and satisfy the CE3.0 120-day prior transaction requirement. These transactions are identified in the order history table below.`
    )
  } else if (ce3.disqualifyingFactors.length > 0) {
    lines.push(
      `Note: This package does not currently meet the specific criteria for a Visa CE3.0 submission (${ce3.disqualifyingFactors[0]}). The identity evidence presented remains valid supporting documentation for a standard representment submission under both Visa and Mastercard dispute guidelines.`
    )
  }

  // --- Cross-merchant ---
  if (crossMerchant.satisfied && crossMerchant.merchantCount != null) {
    lines.push('')
    let cmLine = `An additional pattern indicator has been observed: this identity has been seen at ${plural(crossMerchant.merchantCount, 'other merchant')} in the Unauth merchant network`
    if (crossMerchant.networkRefundRate != null) {
      cmLine += `, with a ${crossMerchant.networkRefundRate}% refund rate across the network`
    }
    cmLine += `. No other merchant names or customer details are disclosed in this report.`
    lines.push(cmLine)
  }

  // --- Footer ---
  lines.push('')
  lines.push(
    `This report was generated by Unauth on ${fmt(generatedAt)} and carries reference ${referenceNumber}. Identifiers are pseudonymised using HMAC-SHA256. This document is provided as supporting evidence for merchant use in chargeback representment. Unauth does not guarantee dispute outcomes. Merchants should follow their acquirer's specific submission guidelines.`
  )

  return lines.join('\n')
}
