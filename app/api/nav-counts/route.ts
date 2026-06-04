import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';

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
    .from(TABLES.MERCHANT_CLAIMS as never)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id' as never, ctx.merchantId as never)
    .in('status' as never, ['open', 'under_review', 'pending_evidence'] as never);

  return NextResponse.json({
    claimsCount: count ?? 0,
  });
}
