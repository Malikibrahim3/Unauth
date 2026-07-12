import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { listNotificationPreferences, preferenceUpsertSchema, upsertNotificationPreference } from '@/lib/collaboration/notificationPreferences';

export const dynamic = 'force-dynamic';

async function auth() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: 'Unauthenticated' }, { status: 401 }) };
  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_DASHBOARD);
  if (denied || !ctx?.merchantId) return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user, serviceClient, ctx };
}

/** GET — the signed-in user's own notification preferences. */
export async function GET() {
  const a = await auth();
  if ('response' in a) return a.response;
  const preferences = await listNotificationPreferences(a.serviceClient, a.ctx.merchantId, a.user.id);
  return NextResponse.json({ preferences });
}

/** PUT — upsert one of the signed-in user's own preferences. */
export async function PUT(req: NextRequest) {
  const a = await auth();
  if ('response' in a) return a.response;
  const parsed = preferenceUpsertSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid preference', details: parsed.error.flatten() }, { status: 400 });
  const preference = await upsertNotificationPreference(a.serviceClient, a.ctx.merchantId, a.user.id, parsed.data);
  return NextResponse.json({ preference });
}
