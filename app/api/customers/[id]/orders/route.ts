// app/api/customers/[id]/orders/route.ts
// GET /api/customers/[id]/orders
// Returns order list for a customer profile (for evidence package creation).
// All transaction reads are scoped through merchant-owned processing_jobs.

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requirePermission, PERMISSIONS } from '@/lib/permissions'
import {
  fetchMerchantScopedCustomerProfile,
  fetchMerchantScopedCustomerTransactions,
} from '@/lib/supabase/merchantHelpers'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: profileId } = await params;
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const service = createServiceClient()
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_CUSTOMERS)
  if (denied) return denied

  // Verify profile belongs to this merchant
  const profileRow = await fetchMerchantScopedCustomerProfile(service, ctx.merchantId, profileId)
  if (!profileRow) {
    return NextResponse.json({ orders: [] })
  }

  // Fetch orders scoped to merchant-owned jobs — no cross-merchant rows
  const txRows = await fetchMerchantScopedCustomerTransactions(
    service,
    ctx.merchantId,
    profileId,
    profileRow as Record<string, unknown>,
    { select: 'id,order_id,processed_at,order_value,refund_claimed' }
  )

  return NextResponse.json({ orders: txRows })
}
