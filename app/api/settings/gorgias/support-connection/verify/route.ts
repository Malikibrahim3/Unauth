import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import {
  persistLiveVerification,
  verifyGorgiasConnection,
  type GorgiasVerificationRow,
} from '@/lib/connections/liveVerification';

export async function GET() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  const { data: row } = await serviceClient
    .from('helpdesk_connections')
    .select('id,provider_base_url,access_token_encrypted,status')
    .eq('merchant_id', ctx.merchantId)
    .eq('provider', 'gorgias')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ ok: false, reason: 'not_connected' });
  }

  const result = await verifyGorgiasConnection(row as GorgiasVerificationRow);
  await persistLiveVerification(serviceClient, 'helpdesk_connections', ctx.merchantId, row.id, row.status, result);
  if (result.status === 'verified') {
    return NextResponse.json({ ok: true });
  }
  if (result.status === 'inconclusive') {
    return NextResponse.json({ ok: false, reason: result.reason ?? 'network_error', inconclusive: true });
  }
  return NextResponse.json({ ok: false, reason: result.reason ?? 'credentials_revoked' });
}
