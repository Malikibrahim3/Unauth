import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getIntegrationCredential } from '@/lib/integrations/auth';
import { enqueueIngestionEvent } from '@/lib/connectors/ingestionInbox';
import { recordDomainEvent } from '@/lib/connectors/domainEvents';
import { verifyShipBobWebhookSignature } from '@/lib/connectors/providers/shipbob/api';

export async function POST(request: NextRequest) {
  const connectionId = request.nextUrl.searchParams.get('connectionId');
  if (!connectionId) return NextResponse.json({ error: 'connectionId_required' }, { status: 400 });
  const client = createServiceClient();
  const { data: connection, error } = await client.from('merchant_integrations').select('id,merchant_id,provider_id,status,provider_account_id').eq('id', connectionId).eq('provider_id', 'shipbob').maybeSingle();
  if (error || !connection || !['connected', 'syncing', 'degraded'].includes(connection.status)) return NextResponse.json({ error: 'connection_unavailable' }, { status: 404 });
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

  const payload = JSON.parse(rawBody) as Record<string, unknown>;
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
  return NextResponse.json({ ok: true, queued: true });
}
