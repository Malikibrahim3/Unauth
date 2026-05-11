// app/api/team/[memberId]/permissions/route.ts
// GET    /api/team/[memberId]/permissions  — list active delegated grants for a member
// POST   /api/team/[memberId]/permissions  — grant a permission { permission }
// DELETE /api/team/[memberId]/permissions  — revoke a permission { permission }
// Requires GRANT_PERMISSIONS (owner only by default).

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { requirePermission, PERMISSIONS, DELEGATABLE_PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { createRequestLogger, withRequestLogging } from '@/lib/log';

export const dynamic = 'force-dynamic';

// ── GET ──────────────────────────────────────────────────────────────────────
async function GETHandler(
  _req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_TEAM);
  if (denied) return denied;
  const scopedService = createScopedClient(ctx.merchantId, service);

  // Verify the member belongs to this merchant
  const { data: member } = await scopedService
    .from('merchant_members')
    .select('id, user_id')
    .eq('id', memberId)
    .eq('invite_status', 'active')
    .single();

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (!member.user_id) return NextResponse.json({ error: 'Member has no user account yet' }, { status: 400 });

  const { data: grants } = await scopedService
    .from('user_permission_grants')
    .select('id, permission, granted_at, grantor_user_id')
    .eq('grantee_user_id', member.user_id)
    .eq('revoked', false)
    .order('granted_at', { ascending: true });

  return NextResponse.json({ grants: grants ?? [] });
}

// ── POST ─────────────────────────────────────────────────────────────────────
async function POSTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const logger = createRequestLogger(request, '/api/team/[memberId]/permissions');
  const { memberId } = await params;
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.GRANT_PERMISSIONS);
  if (denied) return denied;
  const scopedService = createScopedClient(ctx.merchantId, service);

  const body = await request.json().catch(() => ({}));
  const { permission } = body as { permission: string };

  if (!permission) return NextResponse.json({ error: 'permission required' }, { status: 400 });
  if (!DELEGATABLE_PERMISSIONS.includes(permission as any)) {
    return NextResponse.json({ error: 'Permission cannot be delegated' }, { status: 400 });
  }

  // Verify member belongs to this merchant
  const { data: member } = await scopedService
    .from('merchant_members')
    .select('id, user_id')
    .eq('id', memberId)
    .eq('invite_status', 'active')
    .single();

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (!member.user_id) return NextResponse.json({ error: 'Member has no user account yet' }, { status: 400 });

  const { error } = await scopedService
    .from('user_permission_grants')
    .upsert(
      {
        grantor_user_id: user.id,
        grantee_user_id: member.user_id,
        permission,
        revoked: false,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
      { onConflict: 'merchant_id,grantee_user_id,permission' }
    );

  if (error) {
    logger.error('permissions.grant_failed', { error, memberId, permission });
    return NextResponse.json({ error: 'Failed to grant permission' }, { status: 500 });
  }

  logAction({
    ctx,
    action: 'grant_permission',
    resourceType: 'member',
    resourceId: memberId,
    metadata: { permission, granteeUserId: member.user_id },
  });

  return NextResponse.json({ ok: true });
}

// ── DELETE ────────────────────────────────────────────────────────────────────
async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const logger = createRequestLogger(request, '/api/team/[memberId]/permissions');
  const { memberId } = await params;
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.GRANT_PERMISSIONS);
  if (denied) return denied;
  const scopedService = createScopedClient(ctx.merchantId, service);

  const body = await request.json().catch(() => ({}));
  const { permission } = body as { permission: string };

  if (!permission) return NextResponse.json({ error: 'permission required' }, { status: 400 });

  const { data: member } = await scopedService
    .from('merchant_members')
    .select('id, user_id')
    .eq('id', memberId)
    .eq('invite_status', 'active')
    .single();

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (!member.user_id) return NextResponse.json({ error: 'Member has no user account yet' }, { status: 400 });

  const { error } = await scopedService
    .from('user_permission_grants')
    .update({ revoked: true, revoked_at: new Date().toISOString() })
    .eq('grantee_user_id', member.user_id)
    .eq('permission', permission)
    .eq('revoked', false);

  if (error) {
    logger.error('permissions.revoke_failed', { error, memberId, permission });
    return NextResponse.json({ error: 'Failed to revoke permission' }, { status: 500 });
  }

  logAction({
    ctx,
    action: 'revoke_permission',
    resourceType: 'member',
    resourceId: memberId,
    metadata: { permission, granteeUserId: member.user_id },
  });

  return NextResponse.json({ ok: true });
}

export const GET = withRequestLogging('/api/team/[memberId]/permissions', GETHandler);
export const POST = withRequestLogging('/api/team/[memberId]/permissions', POSTHandler);
export const DELETE = withRequestLogging('/api/team/[memberId]/permissions', DELETEHandler);
