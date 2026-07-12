import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { ACTIVE_CLAIM_STATUSES } from '@/lib/claims/sla';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return NextResponse.json({ claimsCount: 0 });

  const { count } = await serviceClient
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', ctx.merchantId)
    .in('status', [...ACTIVE_CLAIM_STATUSES]);

  return NextResponse.json({
    claimsCount: count ?? 0,
  });
}
