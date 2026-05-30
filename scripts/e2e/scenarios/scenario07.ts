/**
 * Scenario 7 — Day-1 claimer.
 * Order delivered today, claim opened today → order_claim_context records
 * days_since_delivery_at_claim <= 1.
 *
 * The spec ticket text ("...marked delivered but I haven't received anything")
 * does not on its own trip the is-claim detector, so a 'refund-requested' tag is
 * attached — exactly how a real day-1 INR claimant's ticket is tagged — to make
 * it a claim.
 */
import { CleanupRegistry, getIntakeRow, getOrderClaimContext, waitFor } from '../helpers/supabase';
import { assertEqual, assertTrue, pass } from '../helpers/log';
import {
  SHARED_ADDRESS,
  emailHashOf,
  ingest,
  provisionShopify,
  provisionTicket,
  uniqueEmail,
  type Scenario,
  type ScenarioContext,
} from './common';

const SUBJECT = 'Order marked delivered but not here';
const BODY = "My order was just marked delivered but I haven't received anything";

async function run(ctx: ScenarioContext): Promise<void> {
  const email = uniqueEmail('day1');
  const emailHash = emailHashOf(email);
  const cleanup = new CleanupRegistry([ctx.merchantId]);
  cleanup.register('supabase_rows', emailHash);

  try {
    const { order, fulfillment } = await provisionShopify(cleanup, {
      email,
      address: { ...SHARED_ADDRESS, address1: '12 Day One Drive' },
      fulfill: true,
    });
    const deliveredAt = fulfillment?.deliveredAt ?? new Date().toISOString();
    const ticketId = await provisionTicket(cleanup, {
      email,
      subject: SUBJECT,
      body: BODY,
      tags: ['refund-requested'],
    });

    const claimedAt = new Date().toISOString();
    const res = await ingest(ctx.merchantId, {
      ticketId,
      subject: SUBJECT,
      body: BODY,
      email,
      tags: ['refund-requested'],
      createdAt: claimedAt,
      order: {
        name: order.name,
        total_price: order.total_price,
        created_at: order.created_at,
        delivered_at: deliveredAt,
        delivery_status: 'delivered',
        fulfillment_status: 'fulfilled',
        tracking_number: fulfillment?.tracking_number ?? null,
        shipping_carrier: fulfillment?.tracking_company ?? null,
        ordersCount: 1,
      },
    });
    assertEqual('webhook HTTP status', 200, res.status);

    await waitFor(
      async () => {
        const i = await getIntakeRow(String(ticketId), ctx.merchantId);
        if (!i || i.is_claim !== true) return false;
        return !!(await getOrderClaimContext(i.id));
      },
      15000,
      500,
      `order_claim_context for ticket ${ticketId}`
    );

    const intake = await getIntakeRow(String(ticketId), ctx.merchantId);
    assertEqual('support_case_intake.is_claim', true, intake!.is_claim);

    const octx = await getOrderClaimContext(intake!.id);
    assertTrue('order_claim_context row present', !!octx);
    const days = Number(octx!.days_since_delivery_at_claim);
    assertTrue(
      'order_claim_context.days_since_delivery_at_claim <= 1',
      Number.isFinite(days) && days <= 1,
      `expected <= 1, got ${octx!.days_since_delivery_at_claim} — check delivered_at/claimed_at in payload`
    );

    pass(`Day-1 claim detected (days_since_delivery=${days})`);
  } finally {
    await cleanup.run();
  }
}

export const scenario7: Scenario = { num: 7, title: 'Day-1 claimer', run };
