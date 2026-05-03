import { createClient, createAdminClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_TEAM);
  if (denied) return denied;

  const { data: merchant } = await serviceClient
    .from('merchants').select('id, name, user_id').eq('id', ctx.merchantId).single();

  const { data: members, error } = await serviceClient
    .from('merchant_members').select('*').eq('merchant_id', ctx.merchantId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: members ?? [], merchant });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_TEAM);
  if (denied) return denied;

  const body = await req.json();
  const { email, role } = body as { email: string; role: string };
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
  const validRoles = ['admin', 'analyst', 'viewer'];
  if (!validRoles.includes(role)) return NextResponse.json({ error: 'Invalid role. Must be admin, analyst, or viewer.' }, { status: 400 });

  const { data: existing } = await serviceClient
    .from('merchant_members').select('id, invite_status')
    .eq('merchant_id', ctx.merchantId).eq('invited_email', email.toLowerCase()).single();
  if (existing) {
    if ((existing as any).invite_status === 'active') return NextResponse.json({ error: 'This person is already a team member.' }, { status: 409 });
    if ((existing as any).invite_status === 'pending') return NextResponse.json({ error: 'An invite is already pending for this email.' }, { status: 409 });
  }

  const { data: member, error: insertError } = await serviceClient
    .from('merchant_members')
    .insert({ merchant_id: ctx.merchantId, invited_email: email.toLowerCase(), role, invite_status: 'pending', invited_by: user.id })
    .select().single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  try {
    const adminClient = createAdminClient();
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email.toLowerCase(), {
      data: { merchant_id: ctx.merchantId, member_id: (member as any).id, role },
    });
    if (inviteError) console.error('Supabase invite error (non-fatal):', inviteError.message);
  } catch (err) { console.error('Admin invite error (non-fatal):', err); }

  logAction({ ctx, action: 'invite_team_member', resourceType: 'merchant_member', resourceId: (member as any).id, metadata: { email: email.toLowerCase(), role }, ip });
  return NextResponse.json({ member }, { status: 201 });
}
