import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceRateLimit, getClientIp, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';

const roleUpdateSchema = z.object({
  role: z.enum(['owner', 'admin', 'analyst', 'viewer']),
});

// PATCH /api/team/[memberId] – update role
async function PATCHHandler(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const resolvedParams = await params;
  const ip = getClientIp(req.headers);
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_TEAM);
  if (denied) return denied;
  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    return NextResponse.json({ error: 'Only owners and admins can change team roles.' }, { status: 403 });
  }
  const scopedClient = createScopedClient(ctx.merchantId, serviceClient);

  const limited = await enforceRateLimit(
    rateLimitKey('team', 'role', ctx.merchantId),
    limitFromEnv('RL_TEAM_ROLE_CHANGES_PER_HOUR', 120, 3600, 'RL_TEAM_ROLE_CHANGES_WINDOW_SECONDS')
  );
  if (limited) return limited;

  const parsed = roleUpdateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  const { role } = parsed.data;

  const { data: target } = await scopedClient
    .from('merchant_members')
    .select('id, role, user_id, invite_status')
    .eq('id', resolvedParams.memberId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });

  const targetRole = (target as any).role;
  const accountOwnerIsChangingRole = ctx.memberId === null;
  if ((targetRole === 'owner' || role === 'owner') && !accountOwnerIsChangingRole) {
    return NextResponse.json({ error: 'Only the account owner can assign or change the owner role.' }, { status: 403 });
  }
  if (role === 'owner' && (!(target as any).user_id || (target as any).invite_status !== 'active')) {
    return NextResponse.json({ error: 'Only active team members can be promoted to owner.' }, { status: 400 });
  }
  if (targetRole === role) return NextResponse.json({ member: target });

  const { data: updated, error } = await scopedClient
    .from('merchant_members').update({ role }).eq('id', resolvedParams.memberId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAction({ ctx, action: 'update_team_member_role', resourceType: 'merchant_member', resourceId: resolvedParams.memberId, metadata: { newRole: role, previousRole: targetRole }, ip });
  return NextResponse.json({ member: updated });
}

// DELETE /api/team/[memberId] – remove member or cancel invite
async function DELETEHandler(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const resolvedParams = await params;
  const ip = getClientIp(req.headers);
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_TEAM);
  if (denied) return denied;
  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    return NextResponse.json({ error: 'Only owners and admins can remove team members.' }, { status: 403 });
  }
  const scopedClient = createScopedClient(ctx.merchantId, serviceClient);

  const limited = await enforceRateLimit(
    rateLimitKey('team', 'remove', ctx.merchantId),
    limitFromEnv('RL_TEAM_REMOVES_PER_HOUR', 120, 3600, 'RL_TEAM_REMOVES_WINDOW_SECONDS')
  );
  if (limited) return limited;

  const { data: target } = await scopedClient
    .from('merchant_members').select('id, role, invited_email')
    .eq('id', resolvedParams.memberId)
    .is('deleted_at', null)
    .single();
  if (!target) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
  if ((target as any).role === 'owner') return NextResponse.json({ error: 'The owner cannot be removed.' }, { status: 403 });

  const { error } = await scopedClient
    .from('merchant_members')
    .update({ deleted_at: new Date().toISOString() } as any)
    .eq('id', resolvedParams.memberId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAction({ ctx, action: 'remove_team_member', resourceType: 'merchant_member', resourceId: resolvedParams.memberId, metadata: { email: (target as any).invited_email, role: (target as any).role }, ip });
  return NextResponse.json({ success: true });
}

export const PATCH = withRequestLogging('/api/team/[memberId]', PATCHHandler);
export const DELETE = withRequestLogging('/api/team/[memberId]', DELETEHandler);
