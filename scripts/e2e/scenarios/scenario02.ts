/**
 * Scenario 2 — Clean customer, no claim.
 * A benign ticket ingests successfully (200) but is not classified as a claim,
 * and produces no claim summary.
 */
import { CleanupRegistry, getIntakeRow, getClaimSummary, waitFor } from '../helpers/supabase';
import { assertEqual, assertTrue, pass } from '../helpers/log';
import {
  checkWebhookLogStatus,
  emailHashOf,
  ingest,
  provisionShopify,
  provisionTicket,
  uniqueEmail,
  type Scenario,
  type ScenarioContext,
} from './common';

async function run(ctx: ScenarioContext): Promise<void> {
  const email = uniqueEmail('clean');
  const emailHash = emailHashOf(email);
  const cleanup = new CleanupRegistry([ctx.merchantId]);
  cleanup.register('supabase_rows', emailHash);

  try {
    const { order } = await provisionShopify(cleanup, { email });
    const subject = 'Quick question about my order';
    const body = 'Hi, just checking when it arrives';
    const ticketId = await provisionTicket(cleanup, { email, subject, body });

    const res = await ingest(ctx.merchantId, {
      ticketId,
      subject,
      body,
      email,
      order: { name: order.name, total_price: order.total_price, ordersCount: 1 },
    });
    assertEqual('webhook HTTP status', 200, res.status, 'ingest endpoint rejected a valid signed webhook');

    await waitFor(
      async () => !!(await getIntakeRow(String(ticketId), ctx.merchantId)),
      15000,
      500,
      `support_case_intake row for ticket ${ticketId}`
    );

    const intake = await getIntakeRow(String(ticketId), ctx.merchantId);
    assertEqual('support_case_intake.is_claim', false, intake!.is_claim, 'benign ticket misclassified as a claim');

    await checkWebhookLogStatus(String(ticketId), 200);

    const summary = await getClaimSummary(emailHash, ctx.merchantId);
    assertTrue(
      'customer_claim_summary absent or claim_count = 0',
      !summary || Number(summary.total_claims) === 0,
      'a claim summary was created for a non-claim ticket'
    );

    pass(`Clean ticket #${ticketId} ingested, is_claim=false, no claim summary`);
  } finally {
    await cleanup.run();
  }
}

export const scenario2: Scenario = { num: 2, title: 'Clean customer', run };
