/**
 * Scenario 8 — Widget data returns the correct shape.
 *
 * Ingests a real INR claim (→ customer_claim_summary, claim_rate 1.0), then seeds
 * the minimum core identity-graph row the widget needs to resolve the customer
 * (Gorgias intake never creates a core customer_profiles row — a separate product
 * limitation). The widget itself is exercised through the real
 * buildGorgiasClaimWidgetData against real Supabase data; thisStore comes from the
 * real ingested claim summary, not the seed.
 */
import { buildGorgiasClaimWidgetData } from '@/lib/gorgias/widgetData';
import { claimWidgetToJson } from '@/lib/gorgias/widgetJson';
import {
  CleanupRegistry,
  deleteCoreCustomerProfile,
  getClaimSummary,
  getIntakeRow,
  seedCoreCustomerProfile,
  serviceClient,
  waitFor,
} from '../helpers/supabase';
import { assertEqual, assertTrue, pass } from '../helpers/log';
import {
  emailHashOf,
  ingest,
  normalisedEmail,
  provisionShopify,
  provisionTicket,
  uniqueEmail,
  type Scenario,
  type ScenarioContext,
} from './common';

const SUBJECT = 'Item not received — widget test';
const BODY = "My package never arrived and I'd like a refund please.";

function isValidUrl(value: unknown): boolean {
  if (typeof value !== 'string' || !value) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function run(ctx: ScenarioContext): Promise<void> {
  const email = uniqueEmail('widget');
  const norm = normalisedEmail(email);
  const emailHash = emailHashOf(email);
  const cleanup = new CleanupRegistry([ctx.merchantId]);
  cleanup.register('supabase_rows', emailHash);

  try {
    // 1. Real INR claim → customer_claim_summary(claim_count=1, claim_rate=1.0)
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
        return !!i && i.is_claim === true && !!(await getClaimSummary(emailHash, ctx.merchantId));
      },
      15000,
      500,
      'INR claim summary for widget'
    );

    // 2. Seed the minimal core profile (registered for cleanup, marked e2e).
    const seeded = await seedCoreCustomerProfile({
      normEmail: norm,
      merchantId: ctx.merchantId,
      totalOrders: 3,
      totalRefundClaims: 1,
    });
    cleanup.defer('delete seeded core profile', () => deleteCoreCustomerProfile(seeded.profileId));

    // 3. Exercise the real widget data builder.
    const { result } = await buildGorgiasClaimWidgetData(
      serviceClient(),
      { merchantId: ctx.merchantId, apiKeyId: 'e2e-widget', requestIp: '127.0.0.1' },
      { rawEmail: email, rawName: '', orderId: '' }
    );

    assertTrue(
      'widget result ok',
      result.ok,
      result.ok ? '' : `widget returned ${(result as { kind: string }).kind} — core profile seed may not have matched`
    );
    if (!result.ok) return;

    const { data } = result;
    assertEqual('thisStore.claimCount', 1, data.thisStore.claimCount);
    assertEqual('thisStore.claimRate', 1.0, data.thisStore.claimRate);
    assertTrue('network is not null', data.network !== null, 'seeded total_merchants_seen_at should be > 1');
    assertTrue('profileUrl is a valid URL', isValidUrl(data.profileUrl), `got "${data.profileUrl}"`);

    // No "fraud" wording and no raw risk score key anywhere in the widget data.
    const serialized = JSON.stringify(data).toLowerCase();
    assertTrue('no "fraud" wording in widget data', !serialized.includes('fraud'));
    const topKeys = Object.keys(data as Record<string, unknown>);
    assertTrue(
      'no risk/score top-level key',
      !topKeys.some((k) => /risk|score|fraud/i.test(k)),
      `top-level keys: ${topKeys.join(', ')}`
    );

    // The rendered JSON the Gorgias card consumes must also be fraud-free.
    const json = claimWidgetToJson(result);
    assertTrue(
      'rendered widget JSON has no "fraud" wording',
      !JSON.stringify(json).toLowerCase().includes('fraud')
    );

    pass(`Widget ok · this store 1 claim @ 100% · network present · profile URL issued`);
  } finally {
    await cleanup.run();
  }
}

export const scenario8: Scenario = { num: 8, title: 'Widget data shape', run };
