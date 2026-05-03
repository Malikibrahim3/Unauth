// app/api/team/[memberId]/permissions/route.ts
// GET    /api/team/[memberId]/permissions  — list active delegated grants for a member
// POST   /api/team/[memberId]/permissions  — grant a permission { permission }
// DELETE /api/team/[memberId]/permissions  — revoke a permission { permission }
// Requires GRANT_PERMISSIONS (owner only by default).

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS, DELEGATABLE_PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';

export const dynamic = 'force-dynamic';

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { memberId: string } }
) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_TEAM);
  if (denied) return denied;

  const { memberId } = params;

  // Verify the member belongs to this merchant
  const { data: member } = await service
    .from('merchant_members')
    .select('id, user_id')
    .eq('id', memberId)
    .eq('merchant_id', ctx.merchantId)
    .eq('status', 'active')
    .single();

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (!member.user_id) return NextResponse.json({ error: 'Member has no user account yet' }, { status: 400 });

  const { data: grants } = await service
    .from('user_permission_grants')
    .select('id, permission, granted_at, grantor_user_id')
    .eq('merchant_id', ctx.merchantId)
    .eq('grantee_user_id', member.user_id)
    .eq('revoked', false)
    .order('granted_at', { ascending: true });

  return NextResponse.json({ grants: grants ?? [] });
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.GRANT_PERMISSIONS);
  if (denied) return denied;

  const { memberId } = params;
  const body = await request.json().catch(() => ({}));
  const { permission } = body as { permission: string };

  if (!permission) return NextResponse.json({ error: 'permission required' }, { status: 400 });
  if (!DELEGATABLE_PERMISSIONS.includes(permission as any)) {
    return NextResponse.json({ error: 'Permission cannot be delegated' }, { status: 400 });
  }

  // Verify member belongs to this merchant
  const { data: member } = await service
    .from('merchant_members')
    .select('id, user_id')
    .eq('id', memberId)
    .eq('merchant_id', ctx.merchantId)
    .eq('status', 'active')
    .single();

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (!member.user_id) return NextResponse.json({ error: 'Member has no user account yet' }, { status: 400 });

  const { error } = await service
    .from('user_permission_grants')
    .upsert(
      {
        merchant_id: ctx.merchantId,
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
    console.error('[permissions/grant] error:', error.message);
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
export async function DELETE(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.GRANT_PERMISSIONS);
  if (denied) return denied;

  const { memberId } = params;
  const body = await request.json().catch(() => ({}));
  const { permission } = body as { permission: string };

  if (!permission) return NextResponse.json({ error: 'permission required' }, { status: 400 });

  const { data: member } = await service
    .from('merchant_members')
    .select('id, user_id')
    .eq('id', memberId)
    .eq('merchant_id', ctx.merchantId)
    .eq('status', 'active')
    .single();

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (!member.user_id) return NextResponse.json({ error: 'Member has no user account yet' }, { status: 400 });

  const { error } = await service
    .from('user_permission_grants')
    .update({ revoked: true, revoked_at: new Date().toISOString() })
    .eq('merchant_id', ctx.merchantId)
    .eq('grantee_user_id', member.user_id)
    .eq('permission', permission)
    .eq('revoked', false);

  if (error) {
    console.error('[permissions/revoke] error:', error.message);
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
