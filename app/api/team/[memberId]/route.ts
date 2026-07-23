import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { createScopedClient } from '@/lib/supabase/scoped';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceRateLimit, getClientIp, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';

const roleUpdateSchema = z.object({
  role: z.enum(['owner', 'admin', 'analyst', 'viewer']),
  confirmOwnershipTransfer: z.boolean().optional(),
});

function ownershipTransferErrorStatus(message: string): number {
  if (message.includes('current_owner_required')) return 403;
  if (message.includes('target_not_found')) return 404;
  if (message.includes('idempotency_conflict')) return 409;
  if (message.includes('target_must_be_active') || message.includes('identifiers_required')) return 400;
  return 500;
}

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
  const scopedClient = createScopedClient(
    ctx.merchantId,
    createServiceClient({ audit: { actorId: ctx.userId, actorRole: ctx.role, requestIp: ip } }),
  );

  const limited = await enforceRateLimit(
    rateLimitKey('team', 'role', ctx.merchantId),
    limitFromEnv('RL_TEAM_ROLE_CHANGES_PER_HOUR', 120, 3600, 'RL_TEAM_ROLE_CHANGES_WINDOW_SECONDS')
  );
  if (limited) return limited;

  const parsed = roleUpdateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  const { role, confirmOwnershipTransfer } = parsed.data;

  const { data: target } = await scopedClient
    .from(TABLES.MERCHANT_MEMBERS)
    .select('id, role, user_id, invite_status')
    .eq('id', resolvedParams.memberId)
    .neq('invite_status', 'revoked')
    .maybeSingle();
  if (!target) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });

  const targetRole = target.role;
  if (targetRole === 'owner' && role !== 'owner') {
    return NextResponse.json({
      error: 'The owner role cannot be changed directly. Transfer ownership to another active member instead.',
    }, { status: 403 });
  }
  if (role === 'owner' && (!target.user_id || target.invite_status !== 'active')) {
    return NextResponse.json({ error: 'Only active team members can be promoted to owner.' }, { status: 400 });
  }
  if (targetRole === role) return NextResponse.json({ member: target });

  if (role === 'owner') {
    const idempotencyKey = req.headers.get('idempotency-key')?.trim() ?? '';
    if (!confirmOwnershipTransfer) {
      return NextResponse.json({
        error: 'Ownership transfer requires explicit confirmation.',
      }, { status: 400 });
    }
    if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
      return NextResponse.json({
        error: 'A valid Idempotency-Key header is required for ownership transfer.',
      }, { status: 400 });
    }

    const { data: transfer, error: transferError } = await scopedClient.rpc(
      'transfer_merchant_ownership',
      {
        p_merchant_id: ctx.merchantId,
        p_actor_user_id: user.id,
        p_new_owner_member_id: target.id,
        p_idempotency_key: idempotencyKey,
      },
    );
    if (transferError) {
      return NextResponse.json(
        { error: transferError.message },
        { status: ownershipTransferErrorStatus(transferError.message) },
      );
    }

    const { data: updated, error: updatedError } = await scopedClient
      .from(TABLES.MERCHANT_MEMBERS)
      .select('*')
      .eq('id', resolvedParams.memberId)
      .single();
    if (updatedError) return NextResponse.json({ error: updatedError.message }, { status: 500 });
    return NextResponse.json({ member: updated, ownershipTransfer: transfer });
  }

  const { data: updated, error } = await scopedClient
    .from(TABLES.MERCHANT_MEMBERS).update({ role }).eq('id', resolvedParams.memberId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
  const scopedClient = createScopedClient(
    ctx.merchantId,
    createServiceClient({ audit: { actorId: ctx.userId, actorRole: ctx.role, requestIp: ip } }),
  );

  const limited = await enforceRateLimit(
    rateLimitKey('team', 'remove', ctx.merchantId),
    limitFromEnv('RL_TEAM_REMOVES_PER_HOUR', 120, 3600, 'RL_TEAM_REMOVES_WINDOW_SECONDS')
  );
  if (limited) return limited;

  const { data: target } = await scopedClient
    .from(TABLES.MERCHANT_MEMBERS).select('id, role, invited_email')
    .eq('id', resolvedParams.memberId)
    .neq('invite_status', 'revoked')
    .single();
  if (!target) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
  if (target.role === 'owner') return NextResponse.json({ error: 'The owner cannot be removed.' }, { status: 403 });

  const { error } = await scopedClient
    .from(TABLES.MERCHANT_MEMBERS)
    .update({ invite_status: 'revoked' })
    .eq('id', resolvedParams.memberId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export const PATCH = withRequestLogging('/api/team/[memberId]', PATCHHandler);
export const DELETE = withRequestLogging('/api/team/[memberId]', DELETEHandler);
