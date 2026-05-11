import { createClient, createAdminClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceRateLimit, getClientIp, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';

const inviteSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  role: z.enum(['admin', 'analyst', 'viewer']),
});

const TEAM_AUDIT_ACTIONS = [
  'invite_team_member',
  'update_team_member_role',
  'remove_team_member',
] as const;

async function GETHandler(req: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_TEAM);
  if (denied) return denied;
  const scopedClient = createScopedClient(ctx.merchantId, serviceClient);
  const includeAudit = req ? new URL(req.url).searchParams.get('includeAudit') === 'true' : false;
  const includeOwner = req ? new URL(req.url).searchParams.get('includeOwner') === 'true' : false;

  const { data: merchant } = await serviceClient
    .from('merchants').select('id, name, user_id').eq('id', ctx.merchantId).single();

  const { data: members, error } = await scopedClient
    .from('merchant_members').select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ownerEmail = merchant?.user_id === user.id ? user.email ?? 'Account owner' : 'Account owner';
  const ownerMember = includeOwner && merchant
    ? {
        id: `owner:${merchant.user_id}`,
        merchant_id: ctx.merchantId,
        user_id: merchant.user_id,
        invited_email: ownerEmail,
        role: 'owner',
        invite_status: 'active',
        invited_by: null,
        created_at: null,
        accepted_at: null,
        is_account_owner: true,
      }
    : null;

  let auditTrail: unknown[] = [];
  if (includeAudit) {
    const { data: auditRows, error: auditError } = await scopedClient
      .from('user_action_log')
      .select('id, action, resource_id, metadata, actor_role, actor_user_id, created_at')
      .in('action', TEAM_AUDIT_ACTIONS)
      .order('created_at', { ascending: false })
      .limit(20);

    if (auditError) return NextResponse.json({ error: auditError.message }, { status: 500 });
    auditTrail = auditRows ?? [];
  }

  return NextResponse.json({
    members: ownerMember ? [ownerMember, ...(members ?? [])] : members ?? [],
    merchant,
    currentUser: {
      id: user.id,
      email: user.email ?? null,
      role: ctx.role,
      memberId: ctx.memberId,
      canManageTeam: ctx.role === 'owner' || ctx.role === 'admin',
      isAccountOwner: ctx.memberId === null,
    },
    auditTrail,
  });
}

async function POSTHandler(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_TEAM);
  if (denied) return denied;
  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    return NextResponse.json({ error: 'Only owners and admins can invite team members.' }, { status: 403 });
  }
  const scopedClient = createScopedClient(ctx.merchantId, serviceClient);

  const limited = await enforceRateLimit(
    rateLimitKey('team', 'invite', ctx.merchantId),
    limitFromEnv('RL_TEAM_INVITES_PER_HOUR', 50, 3600, 'RL_TEAM_INVITES_WINDOW_SECONDS')
  );
  if (limited) return limited;

  const parsed = inviteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email address and role.' }, { status: 400 });
  }

  const { email, role } = parsed.data;

  const { data: existing } = await scopedClient
    .from('merchant_members')
    .select('id, invite_status, deleted_at')
    .eq('invited_email', email)
    .maybeSingle();
  if (existing) {
    if ((existing as any).invite_status === 'active') return NextResponse.json({ error: 'This person is already a team member.' }, { status: 409 });
    if ((existing as any).invite_status === 'pending') return NextResponse.json({ error: 'An invite is already pending for this email.' }, { status: 409 });
  }

  let member: any;
  if (existing) {
    const { data: updated, error: updateError } = await scopedClient
      .from('merchant_members')
      .update({
        invited_email: email,
        role,
        invite_status: 'pending',
        invited_by: user.id,
        accepted_at: null,
        deleted_at: null,
      } as any)
      .eq('id', (existing as any).id)
      .select()
      .single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    member = updated;
  } else {
    const { data: inserted, error: insertError } = await scopedClient
      .from('merchant_members')
      .insert({ invited_email: email, role, invite_status: 'pending', invited_by: user.id })
      .select()
      .single();
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    member = inserted;
  }

  try {
    const adminClient = createAdminClient();
    const origin = new URL(req.url).origin;
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/auth/callback`,
      data: { merchant_id: ctx.merchantId, member_id: member.id, role },
    });
    if (inviteError) {
      await scopedClient
        .from('merchant_members')
        .update({ invite_status: 'revoked', deleted_at: new Date().toISOString() } as any)
        .eq('id', member.id);
      return NextResponse.json({ error: inviteError.message }, { status: 502 });
    }
    const invitedUserId = inviteData?.user?.id;
    if (invitedUserId) {
      const { data: updatedMember } = await scopedClient
        .from('merchant_members')
        .update({ user_id: invitedUserId } as any)
        .eq('id', member.id)
        .select()
        .single();
      if (updatedMember) member = updatedMember;
    }
  } catch (err) {
    await scopedClient
      .from('merchant_members')
      .update({ invite_status: 'revoked', deleted_at: new Date().toISOString() } as any)
      .eq('id', member.id);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send invite.' },
      { status: 502 }
    );
  }

  logAction({ ctx, action: 'invite_team_member', resourceType: 'merchant_member', resourceId: member.id, metadata: { email, role }, ip });
  return NextResponse.json({ member, inviteSent: true }, { status: 201 });
}

export const GET = withRequestLogging('/api/team', GETHandler);
export const POST = withRequestLogging('/api/team', POSTHandler);
