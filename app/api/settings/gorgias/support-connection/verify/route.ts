import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { getActiveGorgiasMerchantApiAccess } from '@/lib/support/gorgias/merchantApiAccess';
import { gorgiasApiBaseUrl, gorgiasApiRequest, GorgiasSidebarRegistrationError } from '@/lib/support/gorgias/registerSidebarWidget';

export async function GET() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  const access = await getActiveGorgiasMerchantApiAccess(serviceClient, ctx.merchantId);
  if (!access) {
    return NextResponse.json({ ok: false, reason: 'not_connected' });
  }

  const apiBaseUrl = gorgiasApiBaseUrl(access.providerBaseUrl);

  try {
    await gorgiasApiRequest<unknown>(apiBaseUrl, '/users/me', access.credentials, { method: 'GET' });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof GorgiasSidebarRegistrationError) {
      if (err.status === 401 || err.status === 403) {
        return NextResponse.json({ ok: false, reason: 'credentials_revoked' });
      }
      return NextResponse.json({ ok: false, reason: 'api_error', inconclusive: true });
    }
    return NextResponse.json({ ok: false, reason: 'network_error', inconclusive: true });
  }
}
