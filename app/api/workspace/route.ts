import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { ACTIVE_MERCHANT_COOKIE } from '@/lib/permissions';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';

const bodySchema = z.object({ merchantId: z.string().uuid() });

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid workspace' }, { status: 400 });

  const serviceClient = createServiceClient();
  // Authorise workspace switching from the caller's current active membership;
  // the explicit target-membership lookup below is the second boundary check.
  const current = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_DASHBOARD);
  if (current.denied) return current.denied;
  const { data: membership } = await serviceClient
    .from(TABLES.MERCHANT_MEMBERS)
    .select('id')
    .eq('user_id', user.id)
    .eq('merchant_id', parsed.data.merchantId)
    .eq('invite_status', 'active')
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: 'Workspace not available' }, { status: 403 });

  const { error: preferenceError } = await serviceClient.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, active_merchant_id: parsed.data.merchantId },
  });
  if (preferenceError) return NextResponse.json({ error: 'Could not save workspace preference' }, { status: 500 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACTIVE_MERCHANT_COOKIE, parsed.data.merchantId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
