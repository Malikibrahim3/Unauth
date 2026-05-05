// app/api/customers/[id]/orders/route.ts
// GET /api/customers/[id]/orders
// Returns order list for a customer profile (for evidence package creation).

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requirePermission, PERMISSIONS } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const service = createServiceClient()
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_CUSTOMERS)
  if (denied) return denied

  const { id: profileId } = params

  // Fetch profile
  const { data: profileRow } = await service
    .from('customer_profiles')
    .select('emails')
    .eq('id', profileId)
    .eq('merchant_id', ctx.merchantId)
    .single() as unknown as { data: { emails: string[] } | null }

  if (!profileRow) {
    return NextResponse.json({ orders: [] })
  }

  // Fetch orders matching this profile — primary path: by email
  type TxRow = {
    id: string
    order_id: string
    processed_at: string
    order_value: number | null
    refund_claimed: boolean
  }
  let txRows: TxRow[] | null = null

  if ((profileRow.emails ?? []).length > 0) {
    const { data } = await service
      .from('audit_transactions')
      .select('id, order_id, processed_at, order_value, refund_claimed')
      .in('customer_email', profileRow.emails)
      .order('processed_at', { ascending: true })
      .limit(200) as unknown as { data: TxRow[] | null }
    txRows = data
  }

  // Fallback: look up via audit appearances when email-based lookup finds nothing
  if (!txRows || txRows.length === 0) {
    const { data: appearances } = await service
      .from('customer_profile_audit_appearances')
      .select('audit_id')
      .eq('profile_id', profileId) as unknown as { data: { audit_id: string }[] | null }

    const auditIds = (appearances ?? []).map((a) => a.audit_id)

    if (auditIds.length > 0) {
      let query = service
        .from('audit_transactions')
        .select('id, order_id, processed_at, order_value, refund_claimed')
        .in('job_id', auditIds)
        .order('processed_at', { ascending: true })
        .limit(200)

      if ((profileRow.emails ?? []).length > 0) {
        query = query.in('customer_email', profileRow.emails)
      }

      const { data } = await query as unknown as { data: TxRow[] | null }
      txRows = data
    }
  }

  return NextResponse.json({ orders: txRows ?? [] })
}
