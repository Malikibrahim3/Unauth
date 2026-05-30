/**
 * Scenario 10 — Repeat ticket upsert, no duplicate.
 * Firing the identical signed webhook twice yields exactly one intake row and a
 * claim_count of 1 (not 2).
 */
import {
  CleanupRegistry,
  countIntakeRows,
  getClaimSummary,
  getIntakeRow,
  waitFor,
} from '../helpers/supabase';
import { buildGorgiasTicketPayload, fireSignedWebhook } from '../helpers/webhook';
import { getConnection } from '../helpers/state';
import { assertEqual, pass } from '../helpers/log';
import {
  emailHashOf,
  provisionShopify,
  provisionTicket,
  uniqueEmail,
  type Scenario,
  type ScenarioContext,
} from './common';

const SUBJECT = 'Item not received';
const BODY = "My order never arrived, please refund.";

async function run(ctx: ScenarioContext): Promise<void> {
  const conn = getConnection(ctx.merchantId);
  const email = uniqueEmail('dedup');
  const emailHash = emailHashOf(email);
  const cleanup = new CleanupRegistry([ctx.merchantId]);
  cleanup.register('supabase_rows', emailHash);

  try {
    const { order } = await provisionShopify(cleanup, { email });
    const ticketId = await provisionTicket(cleanup, {
      email,
      subject: SUBJECT,
      body: BODY,
      tags: ['refund-requested'],
    });

    // Build ONE payload and fire it twice — byte-identical webhook delivery.
    const payload = buildGorgiasTicketPayload({
      ticketId,
      subject: SUBJECT,
      body: BODY,
      email,
      tags: ['refund-requested'],
      createdAt: new Date().toISOString(),
      order: { name: order.name, total_price: order.total_price, ordersCount: 1 },
    });

    const fire = () =>
      fireSignedWebhook({ accountId: conn.accountId, secret: conn.secretPlaintext, payload });

    const first = await fire();
    assertEqual('first webhook HTTP status', 200, first.status);
    await waitFor(
      async () => !!(await getIntakeRow(String(ticketId), ctx.merchantId)),
      15000,
      500,
      'first intake row'
    );

    const second = await fire();
    assertEqual('second webhook HTTP status', 200, second.status);
    // Give the upsert a moment to settle, then verify no duplicate appeared.
    await new Promise((r) => setTimeout(r, 1500));

    const count = await countIntakeRows(String(ticketId), ctx.merchantId);
    assertEqual('support_case_intake row count', 1, count, 'duplicate webhook created a second row');

    const summary = await getClaimSummary(emailHash, ctx.merchantId);
    assertEqual('customer_claim_summary.total_claims', 1, Number(summary?.total_claims));

    pass(`Duplicate webhook deduped — 1 intake row, claim_count 1`);
  } finally {
    await cleanup.run();
  }
}

export const scenario10: Scenario = { num: 10, title: 'Upsert dedup', run };
