/**
 * Scenario 11 — Clean disconnect (runs last).
 * Disabling the connection wipes credentials + secret locally and deregisters the
 * Gorgias integration; a webhook fired afterwards 404s. The connection is then
 * recreated so the account is left working for the next run.
 */
import {
  createMerchantGorgiasSupportConnection,
  disableMerchantGorgiasSupportConnection,
  getMerchantGorgiasSupportConnection,
} from '@/lib/support/gorgias/settingsConnection';
import {
  CleanupRegistry,
  deleteWebhookLogsForCase,
  getConnectionRow,
  serviceClient,
  waitFor,
} from '../helpers/supabase';
import { buildGorgiasTicketPayload, fireSignedWebhook } from '../helpers/webhook';
import { gorgiasDomain, requireVar, supportWebhookUrl } from '../helpers/envVars';
import { listWebhookIntegrations } from '../helpers/gorgias';
import { getConnection, setConnection } from '../helpers/state';
import { assertEqual, assertTrue, info, pass } from '../helpers/log';
import { uniqueEmail, type Scenario, type ScenarioContext } from './common';

async function run(ctx: ScenarioContext): Promise<void> {
  const svc = serviceClient();
  const conn = getConnection(ctx.merchantId);
  const oldIntegrationId = conn.supportWebhookIntegrationId;
  const cleanup = new CleanupRegistry([ctx.merchantId]);

  try {
    // 1. Disconnect.
    await disableMerchantGorgiasSupportConnection(svc, ctx.merchantId);

    await waitFor(
      async () => {
        const c = await getMerchantGorgiasSupportConnection(svc, ctx.merchantId);
        return !!c && c.status === 'disabled';
      },
      10000,
      500,
      'connection status = disabled'
    );

    const raw = await getConnectionRow(ctx.merchantId);
    assertEqual('connection.status', 'disabled', raw!.status);
    assertTrue('access_token_encrypted is null', raw!.access_token_encrypted === null, 'credentials not wiped');
    assertTrue('webhook_secret_hash is null', raw!.webhook_secret_hash === null, 'secret hash not wiped');

    // 2. Gorgias integration removed.
    if (oldIntegrationId != null) {
      const integrations = await listWebhookIntegrations();
      assertTrue(
        `Gorgias integration #${oldIntegrationId} no longer exists`,
        !integrations.some((i) => i.id === oldIntegrationId),
        'webhook integration was not deregistered on disconnect'
      );
    } else {
      info('No tracked integration id from Scenario 1 — skipping deregistration check');
    }

    // 3. Webhook after disconnect → 404 (no active connection to resolve).
    const ghostTicketId = Number(`4${Date.now().toString().slice(-9)}`);
    const ghostEmail = uniqueEmail('postdisconnect');
    const res = await fireSignedWebhook({
      accountId: conn.accountId,
      secret: conn.secretPlaintext,
      payload: buildGorgiasTicketPayload({
        ticketId: ghostTicketId,
        subject: 'After disconnect',
        body: 'Refund please, never arrived.',
        email: ghostEmail,
      }),
    });
    assertEqual(
      'webhook after disconnect HTTP status',
      404,
      res.status,
      'expected connection_not_found (404) — deployment may allow a dev merchant fallback'
    );
    cleanup.defer('delete ghost webhook log', () => deleteWebhookLogsForCase(String(ghostTicketId)));

    // 4. Recreate so the account is left in a working state.
    const recreated = await createMerchantGorgiasSupportConnection(svc, ctx.merchantId, {
      gorgias_api_email: requireVar('GORGIAS_API_EMAIL'),
      gorgias_api_key: requireVar('GORGIAS_API_TOKEN'),
      domain: gorgiasDomain(),
      name: 'Unauth E2E',
    });
    const reconn = await getMerchantGorgiasSupportConnection(svc, ctx.merchantId);
    assertEqual('reconnected status', 'active', reconn!.status);

    const target = supportWebhookUrl();
    const integrations = await listWebhookIntegrations();
    const match = integrations.find((i) => (i.http?.url ?? '').includes(target));
    setConnection({
      merchantId: ctx.merchantId,
      accountId: reconn!.provider_account_id ?? gorgiasDomain(),
      domain: gorgiasDomain(),
      secretPlaintext: recreated.webhook_secret_plaintext,
      supportWebhookIntegrationId: match?.id ?? reconn!.support_webhook_integration_id ?? null,
      sidebarIntegrationId: reconn!.sidebar_integration_id,
      sidebarWidgetId: reconn!.sidebar_widget_id,
    });

    pass(`Disconnect wiped credentials + integration #${oldIntegrationId}; reconnected (active)`);
  } finally {
    await cleanup.run();
  }
}

export const scenario11: Scenario = { num: 11, title: 'Clean disconnect', run };
