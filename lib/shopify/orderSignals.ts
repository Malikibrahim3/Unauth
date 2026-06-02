import crypto from 'node:crypto';

export type ShopifyOrderWebhookPayload = {
  id: number | string;
  order_number?: number | string | null;
  name?: string | null;
  email?: string | null;
  contact_email?: string | null;
  created_at?: string | null;
  total_price?: string | number | null;
  currency?: string | null;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  refunds?: unknown[];
  discount_codes?: unknown[];
  payment_gateway_names?: unknown[];
  shipping_address?: { country_code?: string; country?: string } | null;
  billing_address?: { country_code?: string; country?: string } | null;
  line_items?: unknown[];
  shipping_lines?: Array<{ price?: string | number }>;
  source_name?: string | null;
  tags?: string | unknown;
  landing_site?: string | null;
  referring_site?: string | null;
  risk?: { recommendation?: string; decision?: string; level?: string } | null;
  risk_level?: string | null;
  customer?: { id?: number | string; email?: string | null; phone?: string | null };
};

export function buildShopifyOrderSignalRow(
  shopDomain: string,
  payload: ShopifyOrderWebhookPayload,
  rawBody?: string
): Record<string, unknown> {
  const now = new Date().toISOString();
  const payloadHash = rawBody
    ? crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex')
    : crypto
        .createHash('sha256')
        .update(JSON.stringify(payload), 'utf8')
        .digest('hex');

  const customerId = payload.customer?.id ? String(payload.customer.id) : null;
  const shippingPrice = Array.isArray(payload.shipping_lines)
    ? payload.shipping_lines.reduce((sum: number, line) => {
        const v = Number(line?.price ?? 0);
        return sum + (Number.isFinite(v) ? v : 0);
      }, 0)
    : null;
  const riskRecommendation = payload?.risk?.recommendation ?? payload?.risk?.decision ?? null;
  const riskLevel = payload?.risk?.level ?? payload?.risk_level ?? null;
  const tagList =
    typeof payload.tags === 'string'
      ? payload.tags.split(',').flatMap((t: string) => { const v = t.trim(); return v ? [v] : []; })
      : Array.isArray(payload.tags)
        ? payload.tags
        : [];

  return {
    shop_domain: shopDomain,
    shopify_order_id: String(payload.id),
    order_number: payload.order_number
      ? String(payload.order_number)
      : payload.name
        ? String(payload.name)
        : null,
    customer_id: customerId,
    created_at_shopify: payload.created_at ?? null,
    total_price: payload.total_price ? Number(payload.total_price) : null,
    currency: payload.currency ?? null,
    financial_status: payload.financial_status ?? null,
    fulfillment_status: payload.fulfillment_status ?? null,
    cancelled_at: payload.cancelled_at ?? null,
    cancel_reason: payload.cancel_reason ?? null,
    refunds_count: Array.isArray(payload.refunds) ? payload.refunds.length : 0,
    discount_codes: Array.isArray(payload.discount_codes)
      ? payload.discount_codes.map((d) => {
          const entry = d as { code?: string; amount?: string; type?: string };
          return {
            code: entry?.code ?? null,
            amount: entry?.amount ?? null,
            type: entry?.type ?? null,
          };
        })
      : [],
    payment_gateway_names: Array.isArray(payload.payment_gateway_names)
      ? payload.payment_gateway_names
      : [],
    shipping_country:
      payload.shipping_address?.country_code ?? payload.shipping_address?.country ?? null,
    billing_country:
      payload.billing_address?.country_code ?? payload.billing_address?.country ?? null,
    line_items_count: Array.isArray(payload.line_items) ? payload.line_items.length : 0,
    shipping_price: shippingPrice,
    source_name: payload.source_name ?? null,
    tags: tagList,
    landing_site: payload.landing_site ?? null,
    referring_site: payload.referring_site ?? null,
    risk_recommendation: riskRecommendation,
    risk_level: riskLevel,
    raw_payload_hash: payloadHash,
    updated_at: now,
  };
}
