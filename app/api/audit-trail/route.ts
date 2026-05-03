// app/api/audit-trail/route.ts
// GET /api/audit-trail
// Returns paginated user_action_log for the authenticated merchant.
// Requires VIEW_AUDIT_TRAIL permission (owner/admin by default).
//
// Query params:
//   page          (number, default 1)
//   limit         (number, default 50, max 200)
//   action        (string, filter by action type)
//   actorUserId   (string, filter by actor)
//   resourceType  (string, filter by resource type)
//   startDate     (ISO string)
//   endDate       (ISO string)

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_AUDIT_TRAIL);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const page         = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10));
  const limit        = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const action       = searchParams.get('action')       ?? null;
  const actorUserId  = searchParams.get('actorUserId')  ?? null;
  const resourceType = searchParams.get('resourceType') ?? null;
  const startDate    = searchParams.get('startDate')    ?? null;
  const endDate      = searchParams.get('endDate')      ?? null;

  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  let query = service
    .from('user_action_log')
    .select('*', { count: 'exact' })
    .eq('merchant_id', ctx.merchantId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (action)       query = query.eq('action', action);
  if (actorUserId)  query = query.eq('actor_user_id', actorUserId);
  if (resourceType) query = query.eq('resource_type', resourceType);
  if (startDate)    query = query.gte('created_at', startDate);
  if (endDate)      query = query.lte('created_at', endDate);

  const { data: rows, count, error } = await query;

  if (error) {
    console.error('[audit-trail] query error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch audit trail' }, { status: 500 });
  }

  // Log that someone viewed the audit trail (non-blocking)
  logAction({ ctx, action: 'view_audit_trail', resourceType: 'audit_log' });

  return NextResponse.json({
    rows: rows ?? [],
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}
