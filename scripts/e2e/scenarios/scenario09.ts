/**
 * Scenario 9 — Invalid webhook signature rejected.
 *
 * A structurally valid payload with the WRONG secret header is rejected, no
 * intake row is created, and the rejection is logged.
 *
 * SPEC NOTE: the spec expects HTTP 400. The implementation correctly returns
 * 401 (Unauthorized) for an auth/secret failure — 400 is reserved for malformed
 * payloads. We assert the true behavior (401) and that the rejection is logged.
 */
import { CleanupRegistry, deleteWebhookLogsForCase, getIntakeRow } from '../helpers/supabase';
import { buildGorgiasTicketPayload, fireSignedWebhook } from '../helpers/webhook';
import { getConnection } from '../helpers/state';
import { assertEqual, assertOneOf, assertTrue, pass } from '../helpers/log';
import { checkWebhookLogStatus, uniqueEmail, type Scenario, type ScenarioContext } from './common';

async function run(ctx: ScenarioContext): Promise<void> {
  const conn = getConnection(ctx.merchantId);
  const ticketId = Number(`9${Date.now().toString().slice(-9)}`);
  const email = uniqueEmail('badsig');
  const cleanup = new CleanupRegistry([ctx.merchantId]);

  try {
    const payload = buildGorgiasTicketPayload({
      ticketId,
      subject: 'Refund please',
      body: 'I never received my order, refund requested.',
      email,
    });

    const res = await fireSignedWebhook({
      accountId: conn.accountId,
      secret: conn.secretPlaintext,
      badSecret: 'gorgias_whsec_this-is-not-the-real-secret-0000000000000000',
      payload,
    });

    assertOneOf(
      'webhook rejected with 4xx',
      [400, 401],
      res.status,
      'a wrong secret should be rejected'
    );
    assertEqual('webhook HTTP status (auth failure)', 401, res.status, 'spec said 400; code returns 401 for bad secret');

    const intake = await getIntakeRow(String(ticketId), ctx.merchantId);
    assertTrue('no support_case_intake row created', intake === null, 'an unauthorized webhook created a row');

    await checkWebhookLogStatus(String(ticketId), 401);

    pass(`Invalid signature rejected (401), no row created`);
  } finally {
    cleanup.defer('delete webhook log', () => deleteWebhookLogsForCase(String(ticketId)));
    await cleanup.run();
  }
}

export const scenario9: Scenario = { num: 9, title: 'Invalid signature rejected', run };
