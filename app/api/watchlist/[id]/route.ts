import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
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

  const limited = await enforceRateLimit(
    rateLimitKey('watchlist', 'delete', ctx.merchantId),
    limitFromEnv('RL_WATCHLIST_PER_HOUR', 120, 3600, 'RL_WATCHLIST_WINDOW_SECONDS')
  );
  if (limited) return limited;

  logAction({
    ctx,
    action: 'remove_from_watchlist',
    resourceType: 'watchlist_entry',
    resourceId: resolvedParams.id,
    metadata: { retired: true },
    ip,
  });

  return NextResponse.json({
    error:
      'Customer watchlists are retired. Use claim review, evidence workflows, and aggregate dashboards for case-scoped follow-up.',
  }, { status: 410 });
}

export const DELETE = withRequestLogging('/api/watchlist/[id]', DELETEHandler);
