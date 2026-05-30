/**
 * Scenario 6 — Cross-merchant identity linking.
 *
 * Two customers at two different merchants share an identical shipping address.
 * Ingesting an INR claim for each produces an address_match link candidate.
 *
 * The connection resolver assumes one Gorgias account per merchant (it routes by
 * account id / domain). To route distinct webhooks to merchant A and merchant B
 * we give B a synthetic account id ('e2e-merchant-b') with no real Gorgias host,
 * so its connection is created locally (no external API calls) yet resolves
 * unambiguously. The link itself is exercised against the real DB pipeline.
 */
import { TABLES } from '@/lib/supabase/tables';
import {
  createMerchantGorgiasSupportConnection,
  getMerchantGorgiasSupportConnection,
  rotateMerchantGorgiasWebhookSecret,
} from '@/lib/support/gorgias/settingsConnection';
import {
  CleanupRegistry,
  getIntakeRow,
  getLinkCandidates,
  serviceClient,
  waitFor,
} from '../helpers/supabase';
import { requireVar } from '../helpers/envVars';
import { getConnection, hasConnection, setConnection } from '../helpers/state';
import { assertEqual, assertGte, assertTrue, info, pass } from '../helpers/log';
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

const MERCHANT_B_ACCOUNT = 'e2e-merchant-b';
const SUBJECT = 'Item not received';
const BODY = "My order never arrived and I would like a refund.";

async function ensureMerchantBConnection(merchantIdB: string): Promise<void> {
  if (hasConnection(merchantIdB)) return;
  const svc = serviceClient();
  const existing = await getMerchantGorgiasSupportConnection(svc, merchantIdB);
  const cleanlyWiped = existing && existing.status === 'disabled' && !existing.gorgias_api_configured;

  let secretPlaintext: string;
  let accountId = MERCHANT_B_ACCOUNT;
  if (!existing || cleanlyWiped) {
    const created = await createMerchantGorgiasSupportConnection(svc, merchantIdB, {
      gorgias_api_email: requireVar('GORGIAS_API_EMAIL'),
      gorgias_api_key: requireVar('GORGIAS_API_TOKEN'),
      account_id: MERCHANT_B_ACCOUNT,
      name: 'Unauth E2E B',
    });
    secretPlaintext = created.webhook_secret_plaintext;
    accountId = created.connection.provider_account_id ?? MERCHANT_B_ACCOUNT;
  } else {
    const rotated = await rotateMerchantGorgiasWebhookSecret(svc, merchantIdB);
    secretPlaintext = rotated.webhook_secret_plaintext;
    accountId = existing.provider_account_id ?? MERCHANT_B_ACCOUNT;
  }

  setConnection({
    merchantId: merchantIdB,
    accountId,
    domain: accountId,
    secretPlaintext,
    supportWebhookIntegrationId: null,
    sidebarIntegrationId: null,
    sidebarWidgetId: null,
  });
}

async function run(ctx: ScenarioContext): Promise<void> {
  if (!ctx.merchantIdB) {
    throw new Error(
      'E2E_MERCHANT_ID_B is required for cross-merchant linking. Run preflight to auto-create it, then add it to .env.local.'
    );
  }
  const merchantIdB = ctx.merchantIdB;

  const emailA = uniqueEmail('linkA');
  const emailB = uniqueEmail('linkB');
  const hashA = emailHashOf(emailA);
  const hashB = emailHashOf(emailB);

  const cleanup = new CleanupRegistry([ctx.merchantId, merchantIdB]);
  cleanup.register('supabase_rows', hashA);
  cleanup.register('supabase_rows', hashB);

  try {
    await ensureMerchantBConnection(merchantIdB);
    info(`Merchant B connection ready (account "${getConnection(merchantIdB).accountId}")`);

    const provA = await provisionShopify(cleanup, { email: emailA, address: SHARED_ADDRESS });
    const provB = await provisionShopify(cleanup, { email: emailB, address: SHARED_ADDRESS });
    const ticketA = await provisionTicket(cleanup, { email: emailA, subject: SUBJECT, body: BODY });
    const ticketB = await provisionTicket(cleanup, { email: emailB, subject: SUBJECT, body: BODY });

    const orderShape = (name: string, total: string) => ({
      name,
      total_price: total,
      shipping_address: SHARED_ADDRESS,
      ordersCount: 1,
    });

    // Ingest A first so its hashed identity signals exist before B's detection runs.
    const resA = await ingest(ctx.merchantId, {
      ticketId: ticketA,
      subject: SUBJECT,
      body: BODY,
      email: emailA,
      tags: ['refund-requested'],
      order: orderShape(provA.order.name, provA.order.total_price),
    });
    assertEqual('merchant A webhook HTTP status', 200, resA.status);
    await waitFor(
      async () => {
        const i = await getIntakeRow(String(ticketA), ctx.merchantId);
        return !!i && i.is_claim === true;
      },
      15000,
      500,
      'merchant A INR intake'
    );

    const resB = await ingest(merchantIdB, {
      ticketId: ticketB,
      subject: SUBJECT,
      body: BODY,
      email: emailB,
      tags: ['refund-requested'],
      order: orderShape(provB.order.name, provB.order.total_price),
    });
    assertEqual('merchant B webhook HTTP status', 200, resB.status);
    await waitFor(
      async () => {
        const i = await getIntakeRow(String(ticketB), merchantIdB);
        return !!i && i.is_claim === true;
      },
      15000,
      500,
      'merchant B INR intake'
    );

    await waitFor(
      async () => (await getLinkCandidates(hashB)).length > 0,
      15000,
      500,
      'identity_link_candidates row'
    );

    const candidates = await getLinkCandidates(hashB);
    const link = candidates.find(
      (c) =>
        (c.primary_customer_email_hash === hashB && c.linked_customer_email_hash === hashA) ||
        (c.primary_customer_email_hash === hashA && c.linked_customer_email_hash === hashB)
    );
    assertTrue('link candidate joins the two email hashes', !!link, 'no candidate linked the two customers');
    assertEqual('identity_link_candidates.link_type', 'address_match', link!.link_type);
    assertGte('identity_link_candidates.link_confidence', 0.8, Number(link!.link_confidence));

    pass(`Cross-merchant address_match link recorded (confidence ${link!.link_confidence})`);
  } finally {
    // Remove merchant B's E2E connection row entirely so nothing is left behind.
    cleanup.defer('delete merchant B connection', async () => {
      await serviceClient()
        .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
        .delete()
        .eq('merchant_id', merchantIdB)
        .eq('provider_account_id', MERCHANT_B_ACCOUNT);
    });
    await cleanup.run();
  }
}

export const scenario6: Scenario = { num: 6, title: 'Cross-merchant linking', run };
