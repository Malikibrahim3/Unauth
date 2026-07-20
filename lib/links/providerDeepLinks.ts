/**
 * Canonical deep links into the merchant-facing provider consoles.
 *
 * Provider API URLs are deliberately not used here.  A connector may store an
 * API base URL for calls while the merchant needs a browser URL for the
 * provider's dashboard.
 */

export type ProviderEnvironment = "sandbox" | "production";

const SHIPBOB_MERCHANT_BASE: Record<ProviderEnvironment, string> = {
  sandbox: "https://webstage.shipbob.dev/app/merchant",
  production: "https://app.shipbob.com/app/merchant",
};

function httpOrigin(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function pathId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? encodeURIComponent(trimmed) : null;
}

/** Shopify Admin order URL, using the numeric/legacy Shopify order id. */
export function shopifyOrderUrl(
  storeBaseUrl: string | null | undefined,
  externalOrderId: string | null | undefined,
): string | null {
  const origin = httpOrigin(storeBaseUrl);
  const id = pathId(externalOrderId);
  return origin && id ? `${origin}/admin/orders/${id}` : null;
}

/** Shopify Admin customer URL, using the numeric Shopify customer id. */
export function shopifyCustomerUrl(
  storeBaseUrl: string | null | undefined,
  externalCustomerId: string | null | undefined,
): string | null {
  const origin = httpOrigin(storeBaseUrl);
  const id = pathId(externalCustomerId);
  return origin && id ? `${origin}/admin/customers/${id}` : null;
}

export function shipBobMerchantBaseUrl(
  environment: ProviderEnvironment | string | null | undefined,
): string {
  return environment === "sandbox"
    ? SHIPBOB_MERCHANT_BASE.sandbox
    : SHIPBOB_MERCHANT_BASE.production;
}

export function shipBobOrdersUrl(
  environment: ProviderEnvironment | string | null | undefined,
): string {
  return `${shipBobMerchantBaseUrl(environment)}/#/order-shipment-management/orders`;
}

/**
 * ShipBob's merchant order/shipments detail route.  Both ids are ShipBob
 * provider ids (not the Shopify order number).
 */
export function shipBobShipmentUrl(
  environment: ProviderEnvironment | string | null | undefined,
  orderId: string | null | undefined,
  shipmentId: string | null | undefined,
): string | null {
  const encodedOrderId = pathId(orderId);
  const encodedShipmentId = pathId(shipmentId);
  return encodedOrderId && encodedShipmentId
    ? `${shipBobMerchantBaseUrl(environment)}/#/order-shipment-management/orders/${encodedOrderId}/shipments/${encodedShipmentId}`
    : null;
}

