import type { SupabaseClient } from '@supabase/supabase-js';
import { getIntegrationCredential } from '@/lib/integrations/auth';
import { ensureShipBobSyncJob } from '@/lib/integrations/providers/shipbobSync';
import { recordShipBobAudit } from '@/lib/integrations/providers/shipbobAudit';
import {
  ensureShipBobWebhookSubscriptions,
  exchangeShipBobOAuthCode,
  persistShipBobOAuthConnection,
  storeShipBobWebhookSecret,
} from '@/lib/integrations/providers/shipbobOAuth';
import { getAppUrl } from '@/lib/utils/appUrl';

export type ShipBobOAuthToken = Awaited<ReturnType<typeof exchangeShipBobOAuthCode>>;
export type ShipBobSelectedChannel = {
  id: string | number;
  name?: string;
  application_name?: string;
  scopes?: string[];
};

/** Completes the shared post-discovery lifecycle for direct and selected-account OAuth callbacks. */
export async function completeShipBobConnection(input: {
  client: SupabaseClient;
  merchantId: string;
  userId: string;
  token: ShipBobOAuthToken;
  channel: ShipBobSelectedChannel;
  sandbox: boolean;
}): Promise<{
  connectionId: string;
  sourceAccountId: string;
  reconnected: boolean;
  subscriptionHealthy: boolean;
}> {
  const persisted = await persistShipBobOAuthConnection({
    client: input.client,
    merchantId: input.merchantId,
    token: input.token,
    channel: input.channel,
    sandbox: input.sandbox,
  });
  const environment = input.sandbox ? 'sandbox' : 'production';
  await recordShipBobAudit(input.client, {
    merchantId: input.merchantId,
    actorUserId: input.userId,
    connectionId: persisted.connectionId,
    environment,
    action: 'shipbob_connection_completed',
    status: 'completed',
    metadata: { sourceAccountId: persisted.sourceAccountId },
  });
  if (persisted.reconnected) {
    await recordShipBobAudit(input.client, {
      merchantId: input.merchantId,
      actorUserId: input.userId,
      connectionId: persisted.connectionId,
      environment,
      action: 'shipbob_reconnected',
      status: 'completed',
      metadata: { sourceAccountId: persisted.sourceAccountId },
    });
  }

  const webhookUrl = `${getAppUrl()}/api/integrations/shipbob/webhook?connectionId=${encodeURIComponent(persisted.connectionId)}`;
  let subscriptionHealthy = false;
  try {
    const storedCredentials = await getIntegrationCredential(
      input.client,
      input.merchantId,
      'shipbob',
      { connectionId: persisted.connectionId },
    );
    const subscription = await ensureShipBobWebhookSubscriptions({
      client: input.client,
      connectionId: persisted.connectionId,
      accessToken: input.token.access_token,
      sandbox: input.sandbox,
      webhookUrl,
      hasStoredSecret: typeof storedCredentials?.webhookSecret === 'string',
    });
    subscriptionHealthy = subscription.healthy;
    if (subscription.webhookSecret) {
      await storeShipBobWebhookSecret({
        client: input.client,
        merchantId: input.merchantId,
        connectionId: persisted.connectionId,
        webhookSecret: subscription.webhookSecret,
      });
    }
    await recordShipBobAudit(input.client, {
      merchantId: input.merchantId,
      actorUserId: input.userId,
      connectionId: persisted.connectionId,
      environment,
      action: 'shipbob_webhook_subscription_created',
      status: 'completed',
      metadata: { subscriptionCount: subscription.subscriptionIds.length },
    });
    await input.client.from('merchant_integrations').update({
      subscribed: subscriptionHealthy,
      webhook_status: subscriptionHealthy ? 'healthy' : 'degraded',
    }).eq('id', persisted.connectionId).eq('merchant_id', input.merchantId);
  } catch (subscriptionError) {
    const category = subscriptionError instanceof Error
      ? subscriptionError.message.split(':', 1)[0]
      : 'shipbob_webhook_subscription_failed';
    console.error('ShipBob webhook subscription setup failed', {
      category,
    });
    await input.client.from('merchant_integrations').update({
      status: 'degraded',
      subscribed: false,
      webhook_status: 'missing',
    }).eq('id', persisted.connectionId).eq('merchant_id', input.merchantId);
  }

  const queued = await ensureShipBobSyncJob(input.client, {
    merchantId: input.merchantId,
    connectionId: persisted.connectionId,
    sourceAccountId: persisted.sourceAccountId,
  });
  if (queued.created && queued.job.job_kind === 'initial_import') {
    await recordShipBobAudit(input.client, {
      merchantId: input.merchantId,
      actorUserId: input.userId,
      connectionId: persisted.connectionId,
      environment,
      action: 'shipbob_initial_import_queued',
      status: 'queued',
      metadata: { jobId: queued.job.id },
    });
  }

  return { ...persisted, subscriptionHealthy };
}
