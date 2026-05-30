/**
 * Scenario 5 — Macro outcome inference.
 * Applying a "Refund Approved" macro makes the ingested claim's outcome
 * 'approved'.
 *
 * NOTE: the DB column is support_case_intake.outcome (the spec calls it
 * claim_outcome — there is no claim_outcome column). The macro is also applied
 * to the real ticket best-effort; the webhook payload embeds it so inference is
 * deterministic regardless of Gorgias's own serialisation.
 */
import { CleanupRegistry, getIntakeRow, waitFor } from '../helpers/supabase';
import { applyMacro } from '../helpers/gorgias';
import { assertEqual, pass, info } from '../helpers/log';
import {
  emailHashOf,
  ingest,
  provisionShopify,
  provisionTicket,
  uniqueEmail,
  type Scenario,
  type ScenarioContext,
} from './common';

const SUBJECT = 'Where is my order';
const BODY = "My package never arrived and I'd like a refund.";
const MACRO = 'Refund Approved';

async function run(ctx: ScenarioContext): Promise<void> {
  const email = uniqueEmail('macro');
  const emailHash = emailHashOf(email);
  const cleanup = new CleanupRegistry([ctx.merchantId]);
  cleanup.register('supabase_rows', emailHash);

  try {
    const { order } = await provisionShopify(cleanup, { email });
    const ticketId = await provisionTicket(cleanup, { email, subject: SUBJECT, body: BODY });

    const applied = await applyMacro(ticketId, MACRO);
    if (!applied) info(`Macro "${MACRO}" not applied via API (embedded in payload for inference)`);

    const res = await ingest(ctx.merchantId, {
      ticketId,
      subject: SUBJECT,
      body: BODY,
      email,
      macros: [MACRO],
      order: { name: order.name, total_price: order.total_price, ordersCount: 1 },
    });
    assertEqual('webhook HTTP status', 200, res.status);

    await waitFor(
      async () => {
        const i = await getIntakeRow(String(ticketId), ctx.merchantId);
        return !!i && i.outcome === 'approved';
      },
      15000,
      500,
      `approved outcome for ticket ${ticketId}`
    );

    const intake = await getIntakeRow(String(ticketId), ctx.merchantId);
    assertEqual(
      'support_case_intake.outcome (claim_outcome)',
      'approved',
      intake!.outcome,
      'macro "Refund Approved" did not infer an approved outcome'
    );

    pass(`Macro outcome inferred 'approved' on ticket #${ticketId}`);
  } finally {
    await cleanup.run();
  }
}

export const scenario5: Scenario = { num: 5, title: 'Macro outcome inference', run };
