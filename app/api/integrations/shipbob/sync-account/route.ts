/**
 * Account-level ShipBob sync (and safe retry for a failed/pending initial
 * import). Full-connection paginated import of locations, orders, shipments,
 * and returns — NOT the single-record evidence fetch, which lives at
 * /api/integrations/[provider]/sync.
 *
 * Idempotent: reuses the existing sync job, upserts records on natural keys,
 * and never runs alongside the cron worker (optimistic claim).
 */
import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ensureMerchantContextForUser } from '@/lib/account/ensureMerchantContext';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { runShipBobAccountSync } from '@/lib/integrations/providers/shipbobSync';
import { recordShipBobAudit } from '@/lib/integrations/providers/shipbobAudit';
import { createScopedClient } from '@/lib/supabase/scoped';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const userClient = createClient();
  const serviceClient = createServiceClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { denied } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;
  const context = await ensureMerchantContextForUser(serviceClient, user);
  if (!context?.merchantId) return NextResponse.json({ error: 'Merchant context missing.' }, { status: 400 });
  const scopedClient = createScopedClient(context.merchantId, serviceClient);

  const { data: connection, error } = await serviceClient
    .from('merchant_integrations')
    .select('id,status,environment')
    .eq('merchant_id', context.merchantId)
    .eq('provider_id', 'shipbob')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Connection lookup failed.' }, { status: 500 });
  if (!connection || connection.status === 'not_connected' || connection.status === 'revoked') {
    return NextResponse.json({ error: 'ShipBob is not connected.' }, { status: 400 });
  }

  const { data: account } = await scopedClient
    .from('source_accounts')
    .select('id')
    .eq('connection_id', connection.id)
    .maybeSingle();

  try {
    const environment = connection.environment === 'sandbox' ? 'sandbox' : 'production';
    await recordShipBobAudit(serviceClient, { merchantId: context.merchantId, actorUserId: user.id, connectionId: connection.id, environment, action: 'shipbob_manual_sync_requested', status: 'started' });
    const result = await runShipBobAccountSync(serviceClient, {
      merchantId: context.merchantId,
      connectionId: connection.id,
      sourceAccountId: account?.id ?? null,
    });

    const { data: updated } = await serviceClient
      .from('merchant_integrations')
      .select('last_sync_completed_at,imported_record_count,last_error_code')
      .eq('id', connection.id)
      .maybeSingle();

    if (!result.ran) {
      return NextResponse.json({
        ok: true,
        ran: false,
        reason: result.reason,
        importedRecords: updated?.imported_record_count ?? null,
        lastSyncAt: updated?.last_sync_completed_at ?? null,
      });
    }
    await recordShipBobAudit(serviceClient, {
      merchantId: context.merchantId, actorUserId: user.id, connectionId: connection.id, environment,
      action: result.state.status === 'completed' ? 'shipbob_manual_sync_completed' : 'shipbob_manual_sync_failed',
      status: result.state.status === 'completed' ? 'completed' : 'failed',
      metadata: { jobId: result.jobId, recordCount: updated?.imported_record_count ?? 0, failureCategory: result.state.lastErrorCode ?? undefined },
    });
    return NextResponse.json({
      ok: result.state.status === 'completed' || result.state.status === 'running',
      ran: true,
      status: result.state.status,
      errorCode: result.state.lastErrorCode,
      importedRecords: updated?.imported_record_count ?? null,
      lastSyncAt: updated?.last_sync_completed_at ?? null,
    }, { status: result.state.status === 'completed' || result.state.status === 'running' ? 200 : 502 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'shipbob_account_sync_failed';
    console.error('ShipBob account sync failed', { message });
    return NextResponse.json({ error: 'ShipBob account sync failed.', code: message.slice(0, 80) }, { status: 500 });
  }
}
