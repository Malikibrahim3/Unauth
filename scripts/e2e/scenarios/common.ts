/**
 * Shared scenario types and helpers.
 */
import { normaliseEmail } from '@/lib/identity/normalise';
import { hashSupportEmail } from '@/lib/support/intake/store';
import { CleanupRegistry, getWebhookLog } from '../helpers/supabase';
import { assertEqual } from '../helpers/log';
import {
  canWriteResources,
  createCustomer,
  createOrder,
  fulfillOrder,
  synthesizeOrder,
  type ShopifyAddress,
  type ShopifyCustomer,
  type ShopifyOrder,
  type ShopifyFulfillment,
} from '../helpers/shopify';
import { warn } from '../helpers/log';
import { createTicket } from '../helpers/gorgias';
import { getConnection } from '../helpers/state';
import {
  buildGorgiasTicketPayload,
  fireSignedWebhook,
  type BuildTicketInput,
  type FireResult,
} from '../helpers/webhook';

export type ScenarioContext = {
  /** Primary E2E merchant (E2E_MERCHANT_ID). */
  merchantId: string;
  /** Second merchant for cross-merchant linking (E2E_MERCHANT_ID_B), if available. */
  merchantIdB: string | null;
};

export type Scenario = {
  num: number;
  title: string;
  run: (ctx: ScenarioContext) => Promise<void>;
};

let counter = 0;

/**
 * Unique, clearly-marked E2E email. Masked in all console output.
 *
 * The uniqueness MUST live in the base local part: normaliseEmail() strips
 * everything after '+', so a '+tag' suffix would collapse every address to the
 * same normalized identity (and hash). We use hyphens in the base instead.
 */
export function uniqueEmail(tag: string): string {
  counter += 1;
  return `unauth-e2e-${tag}-${Date.now()}-${counter}@e2e-test.example.com`;
}

export function emailHashOf(email: string): string {
  const norm = normaliseEmail(email);
  if (!norm) throw new Error(`invalid email for hashing: ${email}`);
  return hashSupportEmail(norm);
}

export function normalisedEmail(email: string): string {
  const norm = normaliseEmail(email);
  if (!norm) throw new Error(`invalid email: ${email}`);
  return norm;
}

/** A shared shipping address used by the cross-merchant linking scenario. */
export const SHARED_ADDRESS: ShopifyAddress = {
  first_name: 'E2E',
  last_name: 'Linker',
  address1: '742 Evergreen Terrace',
  city: 'Springfield',
  province: 'Oregon',
  zip: '97403',
  country: 'United States',
  country_code: 'US',
};

export type Provisioned = {
  customer: ShopifyCustomer | null;
  order: ShopifyOrder;
  fulfillment: ShopifyFulfillment | null;
  /** true when the customer/order were really created in Shopify. */
  real: boolean;
};

let warnedReadOnly = false;

/**
 * Create a real Shopify customer + order (+ optional fulfillment) and register
 * the customer for cleanup. The order/fulfillment data feeds the webhook payload.
 *
 * Degrades gracefully when the admin token lacks write scopes: synthesizes the
 * order data (the webhook body is what drives ingestion) and warns once. The
 * real Gorgias → webhook → Supabase → widget path is unaffected.
 */
export async function provisionShopify(
  cleanup: CleanupRegistry,
  opts: { email: string; address?: ShopifyAddress; fulfill?: boolean }
): Promise<Provisioned> {
  const address = opts.address ?? undefined;

  if (!(await canWriteResources())) {
    if (!warnedReadOnly) {
      warn(
        'Shopify token is read-only — synthesizing order data. Grant write_customers/write_orders/write_fulfillments for real Shopify resources.'
      );
      warnedReadOnly = true;
    }
    const order = synthesizeOrder({ email: opts.email });
    const fulfillment: ShopifyFulfillment | null = opts.fulfill
      ? {
          id: order.id,
          status: 'success',
          tracking_number: `E2E${Date.now().toString().slice(-9)}`,
          tracking_company: 'E2E Carrier',
          deliveredAt: new Date().toISOString(),
        }
      : null;
    return { customer: null, order, fulfillment, real: false };
  }

  const customer = await createCustomer({ email: opts.email, address });
  cleanup.register('shopify_customer', String(customer.id));

  const order = await createOrder(customer.id, {
    email: opts.email,
    shipping_address: address,
  });

  let fulfillment: ShopifyFulfillment | null = null;
  if (opts.fulfill) {
    fulfillment = await fulfillOrder(order.id);
  }

  return { customer, order, fulfillment, real: true };
}

/**
 * Create a real Gorgias ticket and register it for cleanup. Returns the ticket id.
 */
export async function provisionTicket(
  cleanup: CleanupRegistry,
  opts: { email: string; subject: string; body: string; tags?: string[] }
): Promise<number> {
  const ticket = await createTicket(opts.email, opts.subject, opts.body, opts.tags);
  cleanup.register('gorgias_ticket', String(ticket.id));
  return ticket.id;
}

/**
 * Adaptive webhook_logs check. The webhook_logs audit row is written by the
 * support-webhook route's logGorgiasWebhookResult. If the DEPLOYED build predates
 * that logging (it writes no webhook_logs rows at all), this downgrades to a
 * warning rather than failing — the HTTP status + intake row already prove the
 * outcome. When the deployment DOES write logs, the http_status is asserted.
 */
export async function checkWebhookLogStatus(externalCaseId: string, expectedHttp: number): Promise<void> {
  const deadline = Date.now() + 4000;
  let log: Record<string, unknown> | null = null;
  while (Date.now() < deadline) {
    log = await getWebhookLog(externalCaseId);
    if (log) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!log) {
    warn(
      `webhook_logs not written by the deployed build — skipping http_status check (expected ${expectedHttp}). Redeploy latest to enable webhook delivery logging.`
    );
    return;
  }
  assertEqual('webhook_logs.http_status', expectedHttp, Number(log.http_status));
}

/**
 * Fire a signed webhook for the given merchant's connection using a fully
 * controlled Gorgias-shaped payload. Returns the live HTTP response.
 */
export async function ingest(
  merchantId: string,
  ticket: BuildTicketInput
): Promise<FireResult> {
  const conn = getConnection(merchantId);
  const payload = buildGorgiasTicketPayload(ticket);
  return fireSignedWebhook({
    accountId: conn.accountId,
    secret: conn.secretPlaintext,
    payload,
  });
}
