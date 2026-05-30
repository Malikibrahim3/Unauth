/**
 * Scenario 1 — Gorgias connection + webhook auto-registration.
 *
 * Foundation scenario: establishes an active connection for E2E_MERCHANT_ID and
 * captures the one-time webhook secret so every later scenario can sign its
 * webhook POSTs. The registered Gorgias integration is preserved (not torn down)
 * because the rest of the suite depends on it; Scenario 11 removes it.
 */
import {
  createMerchantGorgiasSupportConnection,
  disableMerchantGorgiasSupportConnection,
  getMerchantGorgiasSupportConnection,
} from '@/lib/support/gorgias/settingsConnection';
import { CleanupRegistry, getConnectionRow, serviceClient, waitFor } from '../helpers/supabase';
import { gorgiasDomain, requireVar, supportWebhookUrl } from '../helpers/envVars';
import { listWebhookIntegrations } from '../helpers/gorgias';
import { setConnection } from '../helpers/state';
import { assertEqual, assertTrue, info, pass } from '../helpers/log';
import type { Scenario, ScenarioContext } from './common';

async function run(ctx: ScenarioContext): Promise<void> {
  const cleanup = new CleanupRegistry([ctx.merchantId, ctx.merchantIdB].filter(Boolean) as string[]);
  try {
    const svc = serviceClient();
    const domain = gorgiasDomain();

    const existing = await getMerchantGorgiasSupportConnection(svc, ctx.merchantId);
    const cleanlyWiped = existing && existing.status === 'disabled' && !existing.gorgias_api_configured;

    // To prove auto-registration AND obtain a usable signing secret (an existing
    // connection's plaintext secret is never recoverable), reset to a clean slate
    // then run the real create path. A cleanly-wiped row can be reactivated directly.
    if (existing && !cleanlyWiped) {
      info('Existing connection found — disabling it first to run the real create + auto-register path');
      await disableMerchantGorgiasSupportConnection(svc, ctx.merchantId);
    }

    info('Creating connection (registers webhook + sidebar against E2E_WEBHOOK_URL)');
    const created = await createMerchantGorgiasSupportConnection(svc, ctx.merchantId, {
      gorgias_api_email: requireVar('GORGIAS_API_EMAIL'),
      gorgias_api_key: requireVar('GORGIAS_API_TOKEN'),
      domain,
      name: 'Unauth E2E',
    });
    const secretPlaintext = created.webhook_secret_plaintext;
    assertTrue(
      'support_webhook auto-registered on create',
      created.support_webhook_auto_registered || created.connection.support_webhook_registered,
      'registerGorgiasSupportWebhook failed — check Gorgias credentials and that NEXT_PUBLIC_APP_URL == E2E_WEBHOOK_URL'
    );

    await waitFor(
      async () => {
        const c = await getMerchantGorgiasSupportConnection(svc, ctx.merchantId);
        return !!c && c.status === 'active';
      },
      15000,
      500,
      'active support_provider_connections row'
    );

    const conn = await getMerchantGorgiasSupportConnection(svc, ctx.merchantId);
    assertTrue('connection row present', !!conn);
    assertEqual('connection.status', 'active', conn!.status, 'connection did not reach active state');
    assertTrue(
      'support_webhook_registered = true',
      conn!.support_webhook_registered,
      'webhook integration scope missing on the connection'
    );

    const raw = await getConnectionRow(ctx.merchantId);
    assertTrue(
      'access_token_encrypted is not null',
      !!(raw && raw.access_token_encrypted),
      'credentials were not stored encrypted'
    );
    assertTrue(
      'webhook_secret_hash is not null',
      !!(raw && raw.webhook_secret_hash),
      'webhook secret hash was not stored'
    );

    const target = supportWebhookUrl();
    const integrations = await listWebhookIntegrations();
    const match = integrations.find((i) => {
      const url = (i.http?.url ?? '').replace(/\/$/, '');
      return url === target || url.startsWith(`${target}?`) || url.includes(target);
    });
    assertTrue(
      `Gorgias HTTP Integration points at ${target}`,
      !!match,
      'no Gorgias integration found for the E2E webhook URL — auto-registration may have failed'
    );

    const accountId = conn!.provider_account_id ?? domain;
    setConnection({
      merchantId: ctx.merchantId,
      accountId,
      domain,
      secretPlaintext,
      supportWebhookIntegrationId: match?.id ?? conn!.support_webhook_integration_id ?? null,
      sidebarIntegrationId: conn!.sidebar_integration_id,
      sidebarWidgetId: conn!.sidebar_widget_id,
    });

    // Preserve: subsequent scenarios depend on this integration. Scenario 11 removes it.
    if (match) cleanup.register('gorgias_integration', String(match.id), { preserve: true });

    pass(`Connection active · webhook integration #${match?.id} → ${target}`);
  } finally {
    await cleanup.run();
  }
}

export const scenario1: Scenario = {
  num: 1,
  title: 'Connection + webhook auto-registration',
  run,
};
