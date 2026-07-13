import { NextRequest, NextResponse, after } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getIntegrationCredential } from '@/lib/integrations/auth';
import { enqueueIngestionEvent } from '@/lib/connectors/ingestionInbox';
import { recordDomainEvent } from '@/lib/connectors/domainEvents';
import { verifyShipBobWebhookSignature } from '@/lib/connectors/providers/shipbob/api';
import { runShipBobAccountSync } from '@/lib/integrations/providers/shipbobSync';
import { createScopedClient } from '@/lib/supabase/scoped';

export const maxDuration = 60;

/** Skip the sync nudge when a sync completed this recently (webhook bursts). */
const SYNC_NUDGE_DEBOUNCE_MS = 2 * 60 * 1000;

export async function POST(request: NextRequest) {
  const connectionId = request.nextUrl.searchParams.get('connectionId');
  if (!connectionId) return NextResponse.json({ error: 'connectionId_required' }, { status: 400 });
  const client = createServiceClient();
  const { data: connection, error } = await client.from('merchant_integrations').select('id,merchant_id,provider_id,status,provider_account_id,last_sync_completed_at').eq('id', connectionId).eq('provider_id', 'shipbob').maybeSingle();
  if (error || !connection || !['connected', 'syncing', 'degraded'].includes(connection.status)) return NextResponse.json({ error: 'connection_unavailable' }, { status: 404 });
  const scopedClient = createScopedClient(connection.merchant_id, client);
  const credentials = await getIntegrationCredential(client, connection.merchant_id, 'shipbob');
  const secret = typeof credentials?.webhookSecret === 'string' ? credentials.webhookSecret : null;
  const rawBody = await request.text();
  if (!secret || !verifyShipBobWebhookSignature({
    rawBody,
    secret,
    webhookId: request.headers.get('webhook-id'),
    timestamp: request.headers.get('webhook-timestamp'),
    signature: request.headers.get('webhook-signature'),
  })) return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const eventId = request.headers.get('webhook-id') ?? `body:${Buffer.from(rawBody).toString('base64url').slice(0, 32)}`;
  const topic = request.headers.get('x-webhook-topic') ?? request.headers.get('shipbob-topic') ?? 'unknown';
  const enqueue = await enqueueIngestionEvent(client, {
    merchantId: connection.merchant_id,
    connectionId,
    sourceSystem: 'shipbob',
    sourceAccountRef: connection.provider_account_id,
    providerEventId: eventId,
    eventType: topic,
    idempotencyKey: `shipbob:${connection.provider_account_id ?? connectionId}:${eventId}`,
    payload: { topic, event_id: eventId, payload },
  });
  if (enqueue.status === 'conflict') return NextResponse.json({ error: enqueue.reason }, { status: 409 });
  if (enqueue.duplicate) return NextResponse.json({ ok: true, duplicate: true });
  await recordDomainEvent(client, {
    merchantId: connection.merchant_id,
    connectionId,
    ingestionEventId: enqueue.ingestionEventId,
    eventType: topic === 'order.shipment.delivered' ? 'shipment.delivered' : 'shipment.updated',
    aggregateType: 'shipbob_webhook',
    idempotencyKey: `shipbob:webhook:${eventId}`,
    payload: { topic, event_id: eventId },
  });
  await client.from('merchant_integrations').update({ webhook_last_received_at: new Date().toISOString(), webhook_status: 'healthy', last_error: null }).eq('id', connectionId);

  // Nudge an incremental sync after responding, so the change this webhook
  // announces reaches canonical records without waiting for the daily worker
  // tick. Debounced per connection; runShipBobAccountSync is idempotent and
  // backs off if a job is already running.
  const lastCompleted = connection.last_sync_completed_at ? Date.parse(connection.last_sync_completed_at) : null;
  const recentlySynced = lastCompleted !== null && Number.isFinite(lastCompleted) && Date.now() - lastCompleted < SYNC_NUDGE_DEBOUNCE_MS;
  if (!recentlySynced) {
    after(async () => {
      try {
        const { data: account } = await scopedClient.from('source_accounts').select('id').eq('connection_id', connectionId).maybeSingle();
        await runShipBobAccountSync(client, { merchantId: connection.merchant_id, connectionId, sourceAccountId: account?.id ?? null });
      } catch (nudgeError) {
        // The daily worker remains the reconciliation backstop.
        console.warn('shipbob_webhook_sync_nudge_failed', { message: nudgeError instanceof Error ? nudgeError.message : 'unknown' });
      }
    });
  }
  return NextResponse.json({ ok: true, queued: true });
}
