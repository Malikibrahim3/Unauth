/**
 * Scenario 3 — INR claim, full classification.
 * An "item not received" ticket classifies as an INR claim with high confidence
 * and rolls up into customer_claim_summary at claim_rate 1.0.
 */
import { CleanupRegistry, getClaimSummary, getIntakeRow, waitFor } from '../helpers/supabase';
import { assertEqual, assertGte, assertTrue, pass } from '../helpers/log';
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

const SUBJECT = 'Item not received — Order #TEST-001';
const BODY = "I ordered last week and my package never arrived. I'd like a refund please.";

async function run(ctx: ScenarioContext): Promise<void> {
  const email = uniqueEmail('inr');
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

    const res = await ingest(ctx.merchantId, {
      ticketId,
      subject: SUBJECT,
      body: BODY,
      email,
      tags: ['refund-requested'],
      order: { name: order.name, total_price: order.total_price, ordersCount: 1 },
    });
    assertEqual('webhook HTTP status', 200, res.status);

    await waitFor(
      async () => {
        const i = await getIntakeRow(String(ticketId), ctx.merchantId);
        return !!i && i.is_claim === true;
      },
      15000,
      500,
      `INR claim intake for ticket ${ticketId}`
    );

    const intake = await getIntakeRow(String(ticketId), ctx.merchantId);
    assertEqual('support_case_intake.is_claim', true, intake!.is_claim);
    assertEqual('support_case_intake.claim_type', 'INR', intake!.claim_type, 'subject/body did not match INR patterns');
    assertGte(
      'support_case_intake.claim_type_confidence',
      0.8,
      Number(intake!.claim_type_confidence),
      'INR confidence below 0.8'
    );

    await checkWebhookLogStatus(String(ticketId), 200);

    await waitFor(
      async () => !!(await getClaimSummary(emailHash, ctx.merchantId)),
      10000,
      500,
      'customer_claim_summary row'
    );
    const summary = await getClaimSummary(emailHash, ctx.merchantId);
    assertEqual('customer_claim_summary.total_claims', 1, Number(summary!.total_claims));
    assertEqual('customer_claim_summary.claim_rate', 1.0, Number(summary!.claim_rate));

    pass(`INR claim #${ticketId} classified (confidence ${intake!.claim_type_confidence}), claim_rate 1.0`);
  } finally {
    await cleanup.run();
  }
}

export const scenario3: Scenario = { num: 3, title: 'INR claim classification', run };

/** Re-exported so Scenario 8 can reuse the same customer + ticket text. */
export const SCENARIO3 = { SUBJECT, BODY };
