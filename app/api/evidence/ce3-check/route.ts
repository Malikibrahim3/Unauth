// app/api/evidence/ce3-check/route.ts
// GET /api/evidence/ce3-check?profileId=X&orderId=Y
// Lightweight CE3.0 pre-assessment — does not save anything.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assessCE3Eligibility } from '@/lib/evidence/ce3'
import type { IdentitySignalResult } from '@/lib/engine/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get('profileId')
  const orderId   = searchParams.get('orderId')
  if (!profileId || !orderId) {
    return NextResponse.json({ error: 'profileId and orderId required' }, { status: 400 })
  }

  // Fetch profile emails
  const { data: profileRow } = await supabase
    .from('customer_profiles')
    .select('emails')
    .eq('id', profileId)
    .single() as unknown as { data: { emails: string[] } | null }

  if (!profileRow) return NextResponse.json({ eligible: false })

  // Fetch all transactions for this customer
  const { data: txRows } = await supabase
    .from('audit_transactions')
    .select('id, processed_at, refund_claimed, identity_signals')
    .in('customer_email', profileRow.emails ?? [])
    .order('processed_at', { ascending: true })
    .limit(500) as unknown as {
      data: Array<{ id: string; processed_at: string; refund_claimed: boolean; identity_signals: string[] | null }> | null
    }

  if (!txRows || txRows.length === 0) return NextResponse.json({ eligible: false })

  // Find disputed transaction
  const disputedTx = txRows.find(tx => tx.id === orderId)
  if (!disputedTx) return NextResponse.json({ eligible: false })

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
