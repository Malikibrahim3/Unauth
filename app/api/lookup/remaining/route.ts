import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.LOOKUP_CUSTOMER);
  if (denied) return denied;

  const today = new Date().toISOString().slice(0, 10);

  const { data: quotaData } = await service
    .from('lookup_daily_counts' as any)
    .select('count')
    .eq('merchant_id', ctx.merchantId)
    .eq('lookup_date', today)
    .single();

  const used = (quotaData as { count?: number } | null)?.count ?? 0;
  return NextResponse.json({ used, limit: 200 });
}
