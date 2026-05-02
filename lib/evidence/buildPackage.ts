// lib/evidence/buildPackage.ts
// Assembles the full EvidencePackage from Supabase data.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { EvidencePackage } from './types'
import { assessCE3Eligibility, CE3_SIGNAL_LABELS } from './ce3'
import type { IdentitySignalResult } from '@/lib/engine/types'

const ENGINE_VERSION = '2.0'

// =============================================================================
// Masking helpers — no plaintext PII in exported documents
// =============================================================================

export function maskEmail(email: string): string {
  const atIdx = email.indexOf('@')
  if (atIdx === -1) return '****'
  const local = email.slice(0, atIdx)
  const domain = email.slice(atIdx + 1)
  if (local.length <= 2) return `${local[0]}****@${domain}`
  return `${local[0]}****${local[local.length - 1]}@${domain}`
}

export function maskAddress(address: string): string {
  const postcodeMatch = address.match(/[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}/i)
  if (postcodeMatch) return `****, ${postcodeMatch[0]}`
  // US ZIP
  const zipMatch = address.match(/\b\d{5}(-\d{4})?\b/)
  if (zipMatch) return `****, ${zipMatch[0]}`
  return '****'
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return '****'
  return `${phone.slice(0, 3)}****${phone.slice(-3)}`
}

// CE3.0-accepted signal types mapped to identifier type strings
const CE3_ACCEPTED_IDENTIFIER_TYPES = new Set([
  'email',
  'ip',
  'address',
  'phone',
  'device',
  'account_id',
])

// =============================================================================
// Main function
// =============================================================================

/**
 * Build a complete EvidencePackage for a disputed order.
 * Fetches all required data from Supabase using the service role client.
 */
export async function buildEvidencePackage(
  merchantId: string,
  customerProfileId: string,
  disputedOrderId: string,
  supabaseServiceRole: SupabaseClient
): Promise<EvidencePackage> {
  // -------------------------------------------------------------------------
  // 1. Merchant name
  // -------------------------------------------------------------------------
  const { data: merchantRow } = await supabaseServiceRole
    .from('merchants')
    .select('id, business_name, name')
    .eq('id', merchantId)
    .single() as unknown as { data: { id: string; business_name?: string; name?: string } | null }

  const merchantName =
    (merchantRow as any)?.business_name ??
    (merchantRow as any)?.name ??
    'Merchant'

  // -------------------------------------------------------------------------
  // 2. Customer profile
  // -------------------------------------------------------------------------
  const { data: profileRow } = await supabaseServiceRole
    .from('customer_profiles')
    .select('*')
    .eq('id', customerProfileId)
    .single() as unknown as { data: Record<string, any> | null }

  if (!profileRow) throw new Error(`Customer profile not found: ${customerProfileId}`)

  // -------------------------------------------------------------------------
  // 3. All orders for this customer from this merchant
  // -------------------------------------------------------------------------
  const { data: txRows } = await supabaseServiceRole
    .from('audit_transactions')
    .select(
      'id, order_id, customer_email, customer_name, shipping_address, device_ip, card_last4, order_value, match_score, risk_level, identity_signals, refund_claimed, refund_reason, processed_at, job_id'
    )
    .in('customer_email', profileRow.emails ?? [])
    .order('processed_at', { ascending: true })
    .limit(500) as unknown as { data: Array<Record<string, any>> | null }

  const allTxs = (txRows ?? [])

  // -------------------------------------------------------------------------
  // 4. Identify disputed order
  // -------------------------------------------------------------------------
  const disputedTx = allTxs.find(tx => tx.id === disputedOrderId || tx.order_id === disputedOrderId)
  if (!disputedTx) throw new Error(`Disputed order not found: ${disputedOrderId}`)

  const disputedDate = new Date(disputedTx.processed_at)

  // -------------------------------------------------------------------------
  // 5. Build identity evidence list
  // -------------------------------------------------------------------------
  const emailsPresent = (profileRow.emails ?? []) as string[]
  const addressesPresent = (profileRow.addresses ?? []) as string[]
  const phonesPresent = (profileRow.phones ?? []) as string[]
  const ipsPresent = (profileRow.ips ?? []) as string[]
  const cardsPresent = (profileRow.card_last4s ?? []) as string[]

  const firstSeenDate = profileRow.first_seen ? new Date(profileRow.first_seen) : disputedDate

  const identityEvidence: EvidencePackage['identityEvidence'] = []

  for (const email of emailsPresent) {
    identityEvidence.push({
      identifierType: 'Email address',
      maskedValue: maskEmail(email),
      firstSeen: firstSeenDate,
      orderCount: allTxs.filter(tx => tx.customer_email === email).length,
      ce3Accepted: true,
    })
  }
  for (const addr of addressesPresent.slice(0, 3)) {
    identityEvidence.push({
      identifierType: 'Shipping address',
      maskedValue: maskAddress(addr),
      firstSeen: firstSeenDate,
      orderCount: allTxs.filter(tx => tx.shipping_address === addr).length,
      ce3Accepted: true,
    })
  }
  for (const phone of phonesPresent) {
    identityEvidence.push({
      identifierType: 'Phone number',
      maskedValue: maskPhone(phone),
      firstSeen: firstSeenDate,
      orderCount: allTxs.length,
      ce3Accepted: true,
    })
  }
  for (const ip of ipsPresent.slice(0, 2)) {
    identityEvidence.push({
      identifierType: 'IP address',
      maskedValue: ip.split('.').slice(0, 2).join('.') + '.**.**',
      firstSeen: firstSeenDate,
      orderCount: allTxs.filter(tx => tx.device_ip === ip).length,
      ce3Accepted: true,
    })
  }
  for (const card of cardsPresent) {
    identityEvidence.push({
      identifierType: 'Payment card (last 4)',
      maskedValue: `•••• ${card}`,
      firstSeen: firstSeenDate,
      orderCount: allTxs.filter(tx => tx.card_last4 === card).length,
      ce3Accepted: false, // card last4 is not a CE3.0 accepted signal (not a full fingerprint)
    })
  }

  // -------------------------------------------------------------------------
  // 6. CE3.0 eligibility assessment
  // -------------------------------------------------------------------------

  // Extract identity signals from the disputed transaction
  const rawSignals: string[] = (disputedTx.identity_signals as string[]) ?? []

  // Map signal name strings to IdentitySignalResult-compatible objects
  const identitySignalsForCE3: IdentitySignalResult[] = rawSignals.map(name => ({
    signal: name as any,
    fired: true,
    confidence: 50,
    evidence: `Signal ${name} detected`,
    dataPointsUsed: [],
    dataPointsMissing: [],
  }))

  const orderHistoryForCE3 = allTxs.map(tx => ({
    order_id: tx.id,
    order_date: tx.processed_at,
    refund_status: tx.refund_claimed ? 'full' : 'none',
  }))

  const ce3 = assessCE3Eligibility(
    disputedOrderId,
    disputedDate,
    orderHistoryForCE3,
    identitySignalsForCE3
  )

  // -------------------------------------------------------------------------
  // 7. Cross-merchant snapshot (from customer profile)
  // -------------------------------------------------------------------------
  const totalMerchantsSeenAt: number = profileRow.total_merchants_seen_at ?? 1
  const K_ANON_THRESHOLD = 3

  const crossMerchant: EvidencePackage['crossMerchant'] =
    totalMerchantsSeenAt >= K_ANON_THRESHOLD
      ? {
          satisfied: true,
          merchantCount: totalMerchantsSeenAt,
          networkOrderCount: profileRow.total_orders ?? allTxs.length,
          networkRefundRate: Math.round((profileRow.refund_rate ?? 0) * 100),
          networkInrRate: null as unknown as number,
        }
      : { satisfied: false }

  // -------------------------------------------------------------------------
  // 8. Merchant notes
  // -------------------------------------------------------------------------
  const { data: noteRows } = await supabaseServiceRole
    .from('customer_notes')
    .select('note, created_at')
    .eq('customer_profile_id', customerProfileId)
    .order('created_at', { ascending: false })
    .limit(3) as unknown as { data: Array<{ note: string; created_at: string }> | null }

  const merchantNotes =
    (noteRows ?? []).map(n => n.note).filter(Boolean).join('\n\n') || undefined

  // -------------------------------------------------------------------------
  // 9. Reference number
  // -------------------------------------------------------------------------
  const { data: refData } = await supabaseServiceRole
    .rpc('generate_evidence_reference') as unknown as { data: string | null }

  const referenceNumber = refData ?? `UNAUTH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-000001`

  // -------------------------------------------------------------------------
  // 10. Confidence grade
  // -------------------------------------------------------------------------
  const riskLevel: string = profileRow.risk_level ?? 'low'
  const gradeMap: Record<string, EvidencePackage['confidenceGrade']> = {
    critical: 'definite',
    high: 'probable',
    medium: 'possible',
    low: 'weak',
  }
  const confidenceGrade = gradeMap[riskLevel] ?? 'weak'

  // -------------------------------------------------------------------------
  // 11. Build order history list
  // -------------------------------------------------------------------------
  const ce3QualifyingIds = new Set(ce3.priorTransactions.map(p => p.orderId))

  const orderHistory: EvidencePackage['orderHistory'] = allTxs.map(tx => {
    const isDisputed = tx.id === disputedOrderId || tx.order_id === disputedOrderId
    const refundClaimed: boolean = !!tx.refund_claimed
    let outcome: string = 'completed'
    if (isDisputed) outcome = 'disputed'
    else if (refundClaimed) outcome = 'refunded'

    // Time to claim
    let timeToClaim: string | undefined
    if (refundClaimed && tx.processed_at) {
      // We don't have separate refund_date readily — skip for now
    }

    return {
      orderId: tx.order_id ?? tx.id,
      date: new Date(tx.processed_at),
      value: tx.order_value ?? 0,
      outcome,
      timeToClaim,
      isDisputedOrder: isDisputed,
      isCE3QualifyingTransaction: ce3QualifyingIds.has(tx.id),
    }
  })

  // -------------------------------------------------------------------------
  // 12. Customer shape
  // -------------------------------------------------------------------------
  const identifierTypesPresent: string[] = []
  if (emailsPresent.length > 0) identifierTypesPresent.push('email address')
  if (addressesPresent.length > 0) identifierTypesPresent.push('shipping address')
  if (phonesPresent.length > 0) identifierTypesPresent.push('phone number')
  if (ipsPresent.length > 0) identifierTypesPresent.push('IP address')
  if (cardsPresent.length > 0) identifierTypesPresent.push('payment card')

  const customer: EvidencePackage['customer'] = {
    maskedEmail: emailsPresent[0] ? maskEmail(emailsPresent[0]) : '****',
    maskedAddress: addressesPresent[0] ? maskAddress(addressesPresent[0]) : undefined,
    maskedPhone: phonesPresent[0] ? maskPhone(phonesPresent[0]) : undefined,
    paymentLast4: cardsPresent[0] ?? undefined,
    identifierTypesPresent,
  }

  // -------------------------------------------------------------------------
  // Return assembled package
  // -------------------------------------------------------------------------
  return {
    referenceNumber,
    generatedAt: new Date(),
    merchant: { name: merchantName, id: merchantId },
    disputedOrder: {
      orderId: disputedTx.order_id ?? disputedTx.id,
      orderDate: disputedDate,
      orderValue: disputedTx.order_value ?? 0,
      currency: 'GBP',
      outcome: 'disputed',
    },
    customer,
    orderHistory,
    identityEvidence,
    ce3,
    crossMerchant,
    merchantNotes,
    confidenceGrade,
    engineVersion: ENGINE_VERSION,
  }
}
