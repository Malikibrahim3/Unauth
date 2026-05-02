// app/api/customers/[id]/orders/route.ts
// GET /api/customers/[id]/orders
// Returns order list for a customer profile (for evidence package creation).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id: profileId } = params

  // Fetch profile
  const { data: profileRow } = await supabase
    .from('customer_profiles')
    .select('emails')
    .eq('id', profileId)
    .single() as unknown as { data: { emails: string[] } | null }

  if (!profileRow) {
    return NextResponse.json({ orders: [] })
  }

  // Fetch orders matching this profile
  const { data: txRows } = await supabase
    .from('audit_transactions')
    .select('id, order_id, processed_at, order_value, refund_claimed')
    .in('customer_email', profileRow.emails ?? [])
    .order('processed_at', { ascending: true })
    .limit(200) as unknown as {
      data: Array<{
        id: string
        order_id: string
        processed_at: string
        order_value: number | null
        refund_claimed: boolean
      }> | null
    }

  return NextResponse.json({ orders: txRows ?? [] })
}
