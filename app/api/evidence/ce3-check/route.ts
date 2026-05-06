// app/api/evidence/ce3-check/route.ts
// GET /api/evidence/ce3-check?profileId=X&orderId=Y
// Lightweight CE3.0 pre-assessment — does not save anything.

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requirePermission, PERMISSIONS } from '@/lib/permissions'
import { assessCE3Eligibility } from '@/lib/evidence/ce3'
import {
  fetchMerchantScopedCustomerProfile,
  fetchMerchantScopedCustomerTransactions,
} from '@/lib/supabase/merchantHelpers'
import type { IdentitySignalResult } from '@/lib/engine/types'

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
  const profile = await fetchMerchantScopedCustomerProfile(service, ctx.merchantId, profileId)
  if (!profile) return NextResponse.json({ eligible: false, reason: 'Profile not found or not owned by merchant' })

  // Fetch transactions via merchant-scoped helper (verifies job ownership)
  // This also verifies that the disputed order, if found in the results,
  // belongs to a merchant-owned job — no cross-merchant order IDs will appear.
  const txRows = await fetchMerchantScopedCustomerTransactions(
    service,
    ctx.merchantId,
    profileId,
    profile,
    { select: 'id,processed_at,refund_claimed,identity_signals,job_id' }
  ) as Array<{ id: string; processed_at: string; refund_claimed: boolean; identity_signals: string[] | null; job_id: string }>

  if (txRows.length === 0) return NextResponse.json({ eligible: false, reason: 'No transactions found for this profile in merchant account' })

  // Find disputed transaction — if not present, the order does not belong to this merchant
  const disputedTx = txRows.find(tx => tx.id === orderId)
  if (!disputedTx) {
    return NextResponse.json({ eligible: false, reason: 'Disputed order not found in merchant account' })
  }

  const orderHistory = txRows.map(tx => ({
    order_id: tx.id,
    order_date: tx.processed_at,
    refund_status: tx.refund_claimed ? 'full' : 'none',
  }))

  const signals: IdentitySignalResult[] = ((disputedTx.identity_signals ?? []) as string[]).map(name => ({
    signal: name as any,
    fired: true,
    confidence: 50,
    evidence: '',
    dataPointsUsed: [],
    dataPointsMissing: [],
  }))

  const result = assessCE3Eligibility(
    orderId,
    new Date(disputedTx.processed_at),
    orderHistory,
    signals
  )

  return NextResponse.json({ eligible: result.eligible, reason: result.reason })
}
