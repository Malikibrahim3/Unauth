import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/team/[memberId] – update role
export async function PATCH(
  req: NextRequest,
  { params }: { params: { memberId: string } }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_TEAM);
  if (denied) return denied;

  const body = await req.json();
  const { role } = body as { role: string };
  const validRoles = ['admin', 'analyst', 'viewer'];
  if (!validRoles.includes(role)) return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });

  const { data: target } = await serviceClient
    .from('merchant_members').select('id, role')
    .eq('id', params.memberId).eq('merchant_id', ctx.merchantId).single();
  if (!target) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
  if ((target as any).role === 'owner') return NextResponse.json({ error: "The owner's role cannot be changed." }, { status: 403 });

  const { data: updated, error } = await serviceClient
    .from('merchant_members').update({ role }).eq('id', params.memberId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAction({ ctx, action: 'update_team_member_role', resourceType: 'merchant_member', resourceId: params.memberId, metadata: { newRole: role, previousRole: (target as any).role }, ip });
  return NextResponse.json({ member: updated });
}

// DELETE /api/team/[memberId] – remove member or cancel invite
export async function DELETE(
  req: NextRequest,
  { params }: { params: { memberId: string } }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_TEAM);
  if (denied) return denied;

  const { data: target } = await serviceClient
    .from('merchant_members').select('id, role, invited_email')
    .eq('id', params.memberId).eq('merchant_id', ctx.merchantId).single();
  if (!target) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
  if ((target as any).role === 'owner') return NextResponse.json({ error: 'The owner cannot be removed.' }, { status: 403 });

  const { error } = await serviceClient.from('merchant_members').delete().eq('id', params.memberId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAction({ ctx, action: 'remove_team_member', resourceType: 'merchant_member', resourceId: params.memberId, metadata: { email: (target as any).invited_email, role: (target as any).role }, ip });
  return NextResponse.json({ success: true });
}
