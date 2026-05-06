import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { writeActivityLog } from '@/lib/customers/activityLog';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_WATCHLIST);
  if (denied) return denied;

  const { data, error } = await serviceClient
    .from('watchlist_entries')
    .select('*')
    .eq('merchant_id', ctx.merchantId)
    .eq('removed_by_merchant', false)
    .order('added_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_WATCHLIST);
  if (denied) return denied;

  const body = await req.json();
  const { customerProfileId, emailHash, displayName, displayEmail, lastSeenRisk } = body;

  const { data, error } = await serviceClient
    .from('watchlist_entries')
    .upsert({
      merchant_id: ctx.merchantId,
      customer_profile_id: customerProfileId ?? null,
      email_hash: emailHash ?? null,
      display_name: displayName ?? null,
      display_email: displayEmail ?? null,
      last_seen_risk: lastSeenRisk ?? null,
    }, { onConflict: 'merchant_id,customer_profile_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAction({
    ctx,
    action: 'add_to_watchlist',
    resourceType: 'customer_profile',
    resourceId: customerProfileId ?? undefined,
    metadata: { displayEmail, displayName, lastSeenRisk },
    ip,
  });

  if (customerProfileId) {
    await writeActivityLog({
      supabase: serviceClient,
      profileId: customerProfileId,
      merchantId: ctx.merchantId,
      eventType: 'watchlist_added',
    });
  }

  return NextResponse.json({ entry: data });
}
