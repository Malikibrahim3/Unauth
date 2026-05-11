import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { writeActivityLog } from '@/lib/customers/activityLog';
import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_WATCHLIST);
  if (denied) return denied;
  const scopedClient = createScopedClient(ctx.merchantId, serviceClient);

  const limited = await enforceRateLimit(
    rateLimitKey('watchlist', 'delete', ctx.merchantId),
    limitFromEnv('RL_WATCHLIST_PER_HOUR', 120, 3600, 'RL_WATCHLIST_WINDOW_SECONDS')
  );
  if (limited) return limited;

  // Fetch the entry before removing to get the profile_id for activity log
  const { data: entryRow } = await scopedClient
    .from('watchlist_entries')
    .select('id, customer_profile_id')
    .eq('id', resolvedParams.id)
    .maybeSingle();

  const { error } = await scopedClient
    .from('watchlist_entries')
    .update({ removed_by_merchant: true } as any)
    .eq('id', resolvedParams.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAction({
    ctx,
    action: 'remove_from_watchlist',
    resourceType: 'watchlist_entry',
    resourceId: resolvedParams.id,
    ip,
  });

  if (entryRow?.customer_profile_id) {
    await writeActivityLog({
      supabase: scopedClient,
      profileId: entryRow.customer_profile_id,
      merchantId: ctx.merchantId,
      eventType: 'watchlist_removed',
    });
  }

  return NextResponse.json({ ok: true });
}

export const DELETE = withRequestLogging('/api/watchlist/[id]', DELETEHandler);
