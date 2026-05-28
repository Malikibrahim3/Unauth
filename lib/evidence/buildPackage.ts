// lib/evidence/buildPackage.ts
// Assembles the full EvidencePackage from Supabase data.

import type { SupabaseClient } from '@supabase/supabase-js'
import { TABLES } from '@/lib/supabase/tables'
import type { EvidencePackage } from './types'
import { assessCE3Eligibility, extractCe3AcceptedHashes } from './ce3'
import { normaliseEmail, normaliseAddress } from '@/lib/identity/normalise'
import {
  fetchMerchantScopedCustomerProfile,
  fetchMerchantScopedCustomerTransactions,
  getMerchantOwnedJobIds,
} from '@/lib/supabase/merchantHelpers'

const ENGINE_VERSION = '2.0'

/** audit_transactions has no currency column; use row hint if present, else USD. */
function resolveEvidencePackageCurrency(disputedTx: Record<string, unknown>): string {
  const raw = disputedTx.currency
  if (typeof raw === 'string' && /^[A-Za-z]{3}$/.test(raw.trim())) {
    return raw.trim().toUpperCase()
  }
  return 'USD'
}

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
  supabaseServiceRole: SupabaseClient,
  legacyOwnerUserId?: string | null
): Promise<EvidencePackage> {
  // -------------------------------------------------------------------------
  // 1. Merchant name
  // -------------------------------------------------------------------------
  const { data: merchantRow } = await supabaseServiceRole
    .from(TABLES.MERCHANTS)
    .select('id, user_id, business_name, name')
    .eq('id', merchantId)
    .single() as unknown as { data: { id: string; user_id?: string; business_name?: string; name?: string } | null }

  const merchantName =
    (merchantRow as any)?.business_name ??
    (merchantRow as any)?.name ??
    'Merchant'

  // -------------------------------------------------------------------------
  // 2. Customer profile — verified to belong to this merchant
  // -------------------------------------------------------------------------
  const profileRow = await fetchMerchantScopedCustomerProfile(
    supabaseServiceRole,
    merchantId,
    customerProfileId,
    legacyOwnerUserId ?? merchantRow?.user_id ?? null
  )
  if (!profileRow) throw new Error(`Customer profile not found or not owned by merchant: ${customerProfileId}`)

  // Cast to any for local use — all access is through merchant-scoped fetch above
  const profile = profileRow as Record<string, any>

  // -------------------------------------------------------------------------
  // 3. All orders for this customer — scoped to merchant-owned jobs only
  // -------------------------------------------------------------------------
  const txRows = await fetchMerchantScopedCustomerTransactions(
    supabaseServiceRole,
    merchantId,
    customerProfileId,
    profile,
    { select: 'id,order_id,order_date,customer_email,customer_name,shipping_address,device_ip,card_last4,order_value,match_score,risk_level,signals_matched,ce3_signal_hashes,refund_claimed,refund_reason,processed_at,job_id' }
  )

  // -------------------------------------------------------------------------
  // 3b. Verify disputed order belongs to this merchant
  // -------------------------------------------------------------------------
  const ownedJobIds = await getMerchantOwnedJobIds(supabaseServiceRole, merchantId)
  const allTxs = txRows

  // -------------------------------------------------------------------------
  // 4. Identify disputed order — must belong to this merchant's jobs
  // -------------------------------------------------------------------------
  const disputedTx = allTxs.find(tx =>
    (tx.id === disputedOrderId || tx.order_id === disputedOrderId) &&
    ownedJobIds.includes(tx.job_id as string)
  )
  if (!disputedTx) throw new Error(`Disputed order not found or not owned by merchant: ${disputedOrderId}`)

  // Prefer the merchant-supplied order date; fall back to ingestion time only
  // when order_date is absent (legacy rows ingested before order_date existed).
  const txDate = (tx: Record<string, unknown>): string =>
    (tx.order_date as string | null) ?? (tx.processed_at as string)

  const disputedDate = new Date(txDate(disputedTx))

  // -------------------------------------------------------------------------
  // 5. Build identity evidence list
  // -------------------------------------------------------------------------
  const emailsPresent = (profile.emails ?? []) as string[]
  const addressesPresent = (profile.addresses ?? []) as string[]
  const phonesPresent = (profile.phones ?? []) as string[]
  const ipsPresent = (profile.ips ?? []) as string[]
  const cardsPresent = (profile.card_last4s ?? []) as string[]

  // Earliest order date across the customer's history (real order dates, not
  // ingestion time). Falls back to the profile's stored first_seen, then to the
  // disputed order date.
  const orderDateMs = allTxs
    .map(tx => new Date(txDate(tx)).getTime())
    .filter(ms => !Number.isNaN(ms))
  const firstSeenDate =
    orderDateMs.length > 0
      ? new Date(Math.min(...orderDateMs))
      : profile.first_seen
        ? new Date(profile.first_seen as string)
        : disputedDate

  const identityEvidence: EvidencePackage['identityEvidence'] = []

  for (const email of emailsPresent) {
    const target = normaliseEmail(email)
    identityEvidence.push({
      identifierType: 'Email address',
      maskedValue: maskEmail(email),
      firstSeen: firstSeenDate,
      orderCount: allTxs.filter(
        tx => normaliseEmail((tx.customer_email as string | null) ?? '') === target,
      ).length,
      ce3Accepted: false, // email is NOT a Visa CE3.0 core data element
    })
  }
  for (const addr of addressesPresent.slice(0, 3)) {
    const target = normaliseAddress(addr)
    identityEvidence.push({
      identifierType: 'Shipping address',
      maskedValue: maskAddress(addr),
      firstSeen: firstSeenDate,
      orderCount: allTxs.filter(
        tx => normaliseAddress((tx.shipping_address as string | null) ?? '') === target,
      ).length,
      ce3Accepted: true,
    })
  }
  for (const phone of phonesPresent) {
    identityEvidence.push({
      identifierType: 'Phone number',
      maskedValue: maskPhone(phone),
      firstSeen: firstSeenDate,
      orderCount: allTxs.length,
      ce3Accepted: false, // phone is NOT a Visa CE3.0 core data element
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

  const friendlyId = (tx: Record<string, unknown>): string =>
    (tx.order_id as string | null) ?? (tx.id as string)

  const disputedSignalHashes = extractCe3AcceptedHashes(disputedTx.ce3_signal_hashes)
  const orderHistoryForCE3 = allTxs.map(tx => ({
    order_id: friendlyId(tx),
    order_date: txDate(tx),
    refund_status: tx.refund_claimed ? 'full' : 'none',
    signalHashes: extractCe3AcceptedHashes(tx.ce3_signal_hashes),
    paymentCredential: (tx.card_last4 as string | null) ?? null,
  }))
  const ce3 = assessCE3Eligibility(
    friendlyId(disputedTx),
    disputedDate,
    disputedSignalHashes,
    orderHistoryForCE3,
    { disputedPaymentCredential: (disputedTx.card_last4 as string | null) ?? null }
  )

  // -------------------------------------------------------------------------
  // 7. Cross-merchant snapshot (from customer profile)
  // -------------------------------------------------------------------------
  const totalMerchantsSeenAt: number = profile.total_merchants_seen_at ?? 1
  const K_ANON_THRESHOLD = 3

  const crossMerchant: EvidencePackage['crossMerchant'] =
    totalMerchantsSeenAt >= K_ANON_THRESHOLD
      ? {
          satisfied: true,
          merchantCount: totalMerchantsSeenAt,
          networkOrderCount: profile.total_orders ?? allTxs.length,
          networkRefundRate: Math.round((profile.refund_rate ?? 0) * 100),
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
  const riskLevel: string = profile.risk_level ?? 'low'
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

  const orderHistory: EvidencePackage['orderHistory'] = allTxs
    .map(tx => {
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
        orderId: friendlyId(tx),
        date: new Date(txDate(tx)),
        value: (tx.order_value ?? 0) as number,
        outcome,
        timeToClaim,
        isDisputedOrder: isDisputed,
        isCE3QualifyingTransaction: ce3QualifyingIds.has(friendlyId(tx)),
      }
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())

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
      orderId: ((disputedTx.order_id ?? disputedTx.id) as string),
      orderDate: disputedDate,
      orderValue: (disputedTx.order_value ?? 0) as number,
      currency: resolveEvidencePackageCurrency(disputedTx),
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
