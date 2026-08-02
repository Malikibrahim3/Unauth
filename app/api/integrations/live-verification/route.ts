import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { verifyMerchantLiveConnections } from '@/lib/connections/liveVerification';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function POST() {
  const auth = createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ verified: false }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(
    service,
    user.id,
    PERMISSIONS.VIEW_SETTINGS,
  );
  if (denied || !ctx) return denied ?? NextResponse.json({ verified: false }, { status: 403 });

  // Demo tenants intentionally use synthetic connection placeholders. Never
  // send those values to a real provider probe or turn an honest demo into a
  // misleading credential error after the first background refresh.
  const { data: merchant } = await service
    .from('merchants')
    .select('is_demo')
    .eq('id', ctx.merchantId)
    .maybeSingle();
  if (merchant?.is_demo === true) {
    return NextResponse.json(
      { verified: true, skipped: true },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  await verifyMerchantLiveConnections(service, ctx.merchantId);
  return NextResponse.json(
    { verified: true },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
