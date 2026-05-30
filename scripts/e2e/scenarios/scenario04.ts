/**
 * Scenario 4 — Chargeback threat detection.
 * A ticket that threatens a bank dispute is flagged chargeback_threatened and
 * is_claim.
 */
import { CleanupRegistry, getIntakeRow, waitFor } from '../helpers/supabase';
import { assertEqual, pass } from '../helpers/log';
import {
  emailHashOf,
  ingest,
  provisionShopify,
  provisionTicket,
  uniqueEmail,
  type Scenario,
  type ScenarioContext,
} from './common';

const SUBJECT = 'Still no order';
const BODY =
  "I have not received my order. If this isn't resolved today I will dispute the charge with my bank.";

async function run(ctx: ScenarioContext): Promise<void> {
  const email = uniqueEmail('cbthreat');
  const emailHash = emailHashOf(email);
  const cleanup = new CleanupRegistry([ctx.merchantId]);
  cleanup.register('supabase_rows', emailHash);

  try {
    const { order } = await provisionShopify(cleanup, { email });
    const ticketId = await provisionTicket(cleanup, { email, subject: SUBJECT, body: BODY });

    const res = await ingest(ctx.merchantId, {
      ticketId,
      subject: SUBJECT,
      body: BODY,
      email,
      order: { name: order.name, total_price: order.total_price, ordersCount: 1 },
    });
    assertEqual('webhook HTTP status', 200, res.status);

    await waitFor(
      async () => {
        const i = await getIntakeRow(String(ticketId), ctx.merchantId);
        return !!i && i.chargeback_threatened === true;
      },
      15000,
      500,
      `chargeback flag for ticket ${ticketId}`
    );

    const intake = await getIntakeRow(String(ticketId), ctx.merchantId);
    assertEqual(
      'support_case_intake.chargeback_threatened',
      true,
      intake!.chargeback_threatened,
      'bank-dispute language not detected'
    );
    assertEqual('support_case_intake.is_claim', true, intake!.is_claim);

    pass(`Chargeback threat detected on ticket #${ticketId}`);
  } finally {
    await cleanup.run();
  }
}

export const scenario4: Scenario = { num: 4, title: 'Chargeback threat', run };
