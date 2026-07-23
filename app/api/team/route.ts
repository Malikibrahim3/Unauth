import { createClient, createAdminClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { createScopedClient } from '@/lib/supabase/scoped';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceRateLimit, getClientIp, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';

const inviteSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  role: z.enum(['admin', 'analyst', 'viewer']),
});

const TEAM_AUDIT_ACTIONS = [
  'team_member_invited',
  'team_member_role_changed',
  'team_member_removed',
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

  // v2 tenancy: ownership lives on merchant_users (role='owner'), not on a
  // merchants.user_id column. Resolve the owner membership row directly so the
  // synthetic owner entry reflects the real owner account.
  const [{ data: merchant }, { data: members, error }, { data: ownerRow }] = await Promise.all([
    serviceClient.from(TABLES.MERCHANTS).select('id, name').eq('id', ctx.merchantId).single(),
    scopedClient
      .from(TABLES.MERCHANT_MEMBERS)
      .select('*')
      .neq('invite_status', 'revoked')
      .neq('role', 'owner')
      .order('created_at', { ascending: true }),
    scopedClient
      .from(TABLES.MERCHANT_MEMBERS)
      .select('id, user_id, invited_email')
      .eq('role', 'owner')
      .neq('invite_status', 'revoked')
      .maybeSingle(),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ownerUserId = ownerRow?.user_id ?? null;
  const ownerEmail =
    ownerUserId === user.id ? user.email ?? 'Account owner' : ownerRow?.invited_email ?? 'Account owner';
  const ownerMember = includeOwner && merchant
    ? {
        id: ownerRow?.id ?? `owner:${ownerUserId ?? ctx.merchantId}`,
        merchant_id: ctx.merchantId,
        user_id: ownerUserId,
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
  const scopedClient = createScopedClient(
    ctx.merchantId,
    createServiceClient({ audit: { actorId: ctx.userId, actorRole: ctx.role, requestIp: ip } }),
  );

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
    .from(TABLES.MERCHANT_MEMBERS)
    .select('id, invite_status')
    .eq('invited_email', email)
    .maybeSingle();
  const existingMember = existing as { id: string; invite_status: string } | null;
  if (existingMember) {
    if (existingMember.invite_status === 'active') return NextResponse.json({ error: 'This person is already a team member.' }, { status: 409 });
    if (existingMember.invite_status === 'pending') return NextResponse.json({ error: 'An invite is already pending for this email.' }, { status: 409 });
  }

  let member: { id: string; [key: string]: unknown };
  if (existingMember) {
    const { data: updated, error: updateError } = await scopedClient
      .from(TABLES.MERCHANT_MEMBERS)
      .update({
        invited_email: email,
        role,
        invite_status: 'pending',
        invited_by: user.id,
        accepted_at: null,
      })
      .eq('id', existingMember.id)
      .select()
      .single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    member = updated;
  } else {
    const { data: inserted, error: insertError } = await scopedClient
      .from(TABLES.MERCHANT_MEMBERS)
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
        .from(TABLES.MERCHANT_MEMBERS)
        .update({ invite_status: 'revoked' })
        .eq('id', member.id);
      return NextResponse.json({ error: inviteError.message }, { status: 502 });
    }
    const invitedUserId = inviteData?.user?.id;
    if (invitedUserId) {
      const { data: updatedMember } = await scopedClient
        .from(TABLES.MERCHANT_MEMBERS)
        .update({ user_id: invitedUserId })
        .eq('id', member.id)
        .select()
        .single();
      if (updatedMember) member = updatedMember;
    }
  } catch (err) {
    await scopedClient
      .from(TABLES.MERCHANT_MEMBERS)
      .update({ invite_status: 'revoked' })
      .eq('id', member.id);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send invite.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ member, inviteSent: true }, { status: 201 });
}

export const GET = withRequestLogging('/api/team', GETHandler);
export const POST = withRequestLogging('/api/team', POSTHandler);
