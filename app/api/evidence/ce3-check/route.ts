// app/api/evidence/ce3-check/route.ts
// GET /api/evidence/ce3-check?profileId=X&orderId=Y
// Lightweight prior-order match pre-check — does not save anything.

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requirePermission, PERMISSIONS } from '@/lib/permissions'
import { assessCE3Eligibility, extractCe3AcceptedHashes } from '@/lib/evidence/ce3'
import {
  fetchMerchantScopedCustomerProfile,
  fetchMerchantScopedCustomerTransactions,
} from '@/lib/supabase/merchantHelpers'

const txDate = (tx: { order_date: string | null; processed_at: string }): string =>
  tx.order_date ?? tx.processed_at

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const service = createServiceClient()
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.GENERATE_EVIDENCE)
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get('profileId')
  const orderId   = searchParams.get('orderId')
  if (!profileId || !orderId) {
    return NextResponse.json({ error: 'profileId and orderId required' }, { status: 400 })
  }

  // Fetch profile via merchant-scoped helper (verifies merchant_ids membership)
  const profile = await fetchMerchantScopedCustomerProfile(service, ctx.merchantId, profileId, ctx.userId)
  if (!profile) return NextResponse.json({ hasPriorMatchEvidence: false, reason: 'Profile not found or not owned by merchant' })

  // Fetch transactions via merchant-scoped helper (verifies job ownership)
  // This also verifies that the disputed order, if found in the results,
  // belongs to a merchant-owned job — no cross-merchant order IDs will appear.
  const txRows = await fetchMerchantScopedCustomerTransactions(
    service,
    ctx.merchantId,
    profileId,
    profile,
    { select: 'id,order_id,order_date,processed_at,refund_claimed,ce3_signal_hashes,job_id' }
  ) as Array<{ id: string; order_id: string | null; order_date: string | null; processed_at: string; refund_claimed: boolean; ce3_signal_hashes: unknown; job_id: string }>

  if (txRows.length === 0) return NextResponse.json({ hasPriorMatchEvidence: false, reason: 'No transactions found for this profile in merchant account' })

  // Find disputed transaction — if not present, the order does not belong to this merchant
  const disputedTx = txRows.find(tx => tx.id === orderId)
  if (!disputedTx) {
    return NextResponse.json({ hasPriorMatchEvidence: false, reason: 'Disputed order not found in merchant account' })
  }

  // Prefer the merchant-supplied order date; fall back to ingestion time only for
  // legacy rows ingested before order_date existed.
  const disputedSignalHashes = extractCe3AcceptedHashes(disputedTx.ce3_signal_hashes)
  const orderHistoryForCE3 = txRows.map(tx => ({
    order_id: tx.order_id ?? tx.id,
    order_date: txDate(tx),
    refund_status: tx.refund_claimed ? 'full' : 'none',
    signalHashes: extractCe3AcceptedHashes(tx.ce3_signal_hashes),
  }))

  const result = assessCE3Eligibility(
    disputedTx.order_id ?? disputedTx.id,
    new Date(txDate(disputedTx)),
    disputedSignalHashes,
    orderHistoryForCE3
  )

  return NextResponse.json({ hasPriorMatchEvidence: result.eligible, reason: result.reason })
}
