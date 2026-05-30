/**
 * Builds Gorgias-shaped ticket payloads and POSTs them, signed, to the real
 * deployed support-webhook endpoint.
 *
 * WHY WE POST DIRECTLY (instead of waiting for Gorgias's own webhook fan-out):
 * Gorgias's native webhook serialises only its ticket (subject, messages,
 * customer, tags) — it never carries the Shopify order block, shipping address,
 * delivery date, or orders_count. Yet the ingestion pipeline derives ALL order /
 * identity / delivery signals from the webhook *body* (see commerceSignals.ts).
 * So to exercise the real route → ingest → Supabase path deterministically with
 * the data Scenarios 3/6/7 assert on, we construct the same payload Gorgias
 * *would* send if its Shopify integration were attached, sign it with the
 * per-connection secret, and POST it to the live endpoint. Auth, routing,
 * classification, and persistence are all real and unmocked.
 */
import {
  GORGIAS_ACCOUNT_ID_HEADER,
  GORGIAS_DOMAIN_HEADER,
} from '@/lib/support/gorgias/accountIdentity';
import { GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME } from '@/lib/support/gorgias/supportConnectionShared';
import { GORGIAS_MERCHANT_ID_HEADER } from '@/lib/support/gorgias/resolveMerchantId';
import { GORGIAS_EVENT_TYPE_HEADER } from '@/lib/support/gorgias/ingestWebhook';
import { ingestWebhookUrl } from './envVars';
import type { ShopifyAddress } from './shopify';

export type EmbeddedOrder = {
  name?: string;
  total_price?: string | number;
  created_at?: string;
  shipping_address?: ShopifyAddress;
  billing_address?: ShopifyAddress;
  fulfillment_status?: string | null;
  delivery_status?: string | null;
  tracking_number?: string | null;
  shipping_carrier?: string | null;
  delivered_at?: string | null;
  payment_method?: string | null;
  ordersCount?: number | null;
};

export type BuildTicketInput = {
  ticketId: number;
  subject: string;
  body: string;
  email: string;
  tags?: string[];
  macros?: string[];
  createdAt?: string;
  updatedAt?: string;
  order?: EmbeddedOrder;
};

/** Construct the Gorgias ticket JSON the webhook route + normalizer expect. */
export function buildGorgiasTicketPayload(input: BuildTicketInput): Record<string, unknown> {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const shopifyOrder = input.order
    ? {
        name: input.order.name,
        order_number: input.order.name?.replace(/^#/, ''),
        total_price: input.order.total_price,
        created_at: input.order.created_at ?? createdAt,
        shipping_address: input.order.shipping_address,
        billing_address: input.order.billing_address,
        fulfillment_status: input.order.fulfillment_status ?? null,
        delivery_status: input.order.delivery_status ?? null,
        tracking_number: input.order.tracking_number ?? null,
        shipping_carrier: input.order.shipping_carrier ?? null,
        delivered_at: input.order.delivered_at ?? null,
        payment_method: input.order.payment_method ?? null,
        customer: {
          email: input.email,
          orders_count: input.order.ordersCount ?? null,
        },
      }
    : undefined;

  return {
    id: input.ticketId,
    subject: input.subject,
    status: 'open',
    channel: 'email',
    created_datetime: createdAt,
    updated_datetime: input.updatedAt ?? createdAt,
    customer: { email: input.email },
    tags: (input.tags ?? []).map((name) => ({ name })),
    macros: input.macros ?? [],
    messages: [
      {
        from_agent: false,
        source: { type: 'email', from: { address: input.email } },
        body_text: input.body,
        body: input.body,
      },
    ],
    ...(shopifyOrder ? { integrations: { shopify: { order: shopifyOrder } } } : {}),
  };
}

export type FireResult = { status: number; body: unknown };

export type FireOptions = {
  accountId: string;
  secret: string;
  payload: Record<string, unknown>;
  /** Override the secret header (Scenario 9 — invalid signature). */
  badSecret?: string;
  /** Optional dev-only merchant routing header. */
  merchantIdHeader?: string;
  eventType?: string;
};

/** POST a signed webhook to the live endpoint. Returns the HTTP status + JSON body. */
export async function fireSignedWebhook(opts: FireOptions): Promise<FireResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    [GORGIAS_ACCOUNT_ID_HEADER]: opts.accountId,
    [GORGIAS_DOMAIN_HEADER]: opts.accountId,
    [GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME]: opts.badSecret ?? opts.secret,
    [GORGIAS_EVENT_TYPE_HEADER]: opts.eventType ?? 'ticket-created',
  };
  if (opts.merchantIdHeader) headers[GORGIAS_MERCHANT_ID_HEADER] = opts.merchantIdHeader;

  const res = await fetch(ingestWebhookUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify(opts.payload),
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* leave as text */
  }
  return { status: res.status, body };
}
