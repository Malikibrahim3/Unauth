/**
 * Shopify Admin REST API helpers for the E2E suite.
 * Real API calls only. Resources are returned to the caller for cleanup.
 */
import { SHOPIFY_REST_API_VERSION } from '@/lib/shopify/apiVersion';
import { getVar, shopifyStoreDomain } from './envVars';

const API_VERSION = SHOPIFY_REST_API_VERSION;

let cachedClientCredentialsToken: { accessToken: string; expiresAt: number } | null = null;

function adminBaseUrl(): string {
  return `https://${shopifyStoreDomain()}/admin/api/${API_VERSION}`;
}

function adminUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized.startsWith('/oauth/')) {
    return `https://${shopifyStoreDomain()}/admin${normalized}`;
  }
  return `${adminBaseUrl()}${normalized}`;
}

async function shopifyRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = adminUrl(path);
  const res = await fetch(url, {
    method,
    headers: {
      'X-Shopify-Access-Token': await accessToken(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Shopify ${method} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

async function accessToken(): Promise<string> {
  const clientId = getVar('SHOPIFY_API_KEY');
  const clientSecret = getVar('SHOPIFY_API_SECRET');

  if (clientId && clientSecret) {
    if (cachedClientCredentialsToken && cachedClientCredentialsToken.expiresAt > Date.now() + 60_000) {
      return cachedClientCredentialsToken.accessToken;
    }

    const response = await fetch(`https://${shopifyStoreDomain()}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });
    const raw = await response.text();
    let payload: { access_token?: unknown; expires_in?: unknown } = {};
    try {
      payload = raw ? (JSON.parse(raw) as typeof payload) : {};
    } catch {
      // Keep the bounded response below for a non-JSON provider error.
    }
    if (!response.ok) {
      throw new Error(`Shopify client-credentials request → ${response.status}: ${raw.slice(0, 400)}`);
    }

    const value = typeof payload.access_token === 'string' ? payload.access_token.trim() : '';
    if (!value) throw new Error('Shopify client-credentials response omitted an access token');
    const expiresIn = typeof payload.expires_in === 'number' && Number.isFinite(payload.expires_in)
      ? payload.expires_in
      : 86_400;
    cachedClientCredentialsToken = {
      accessToken: value,
      expiresAt: Date.now() + Math.max(60, expiresIn) * 1000,
    };
    return value;
  }

  const legacyToken = getVar('SHOPIFY_ADMIN_API_TOKEN');
  if (legacyToken) return legacyToken;
  throw new Error(
    'Shopify authentication is missing: configure SHOPIFY_API_KEY + SHOPIFY_API_SECRET or SHOPIFY_ADMIN_API_TOKEN',
  );
}

export type ShopifyAddress = {
  first_name?: string;
  last_name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
  country_code?: string;
  phone?: string;
};

export type ShopifyCustomer = {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  default_address?: ShopifyAddress;
};

export type ShopifyOrder = {
  id: number;
  name: string;
  order_number: number;
  email: string;
  total_price: string;
  shipping_address?: ShopifyAddress;
  created_at: string;
};

export type ShopifyFulfillment = {
  id: number;
  status: string;
  tracking_number: string | null;
  tracking_company: string | null;
  /** ISO timestamp we treat as the delivery time for the claim payload. */
  deliveredAt: string;
};

export async function createCustomer(
  overrides: Partial<{
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    address: ShopifyAddress;
  }> = {}
): Promise<ShopifyCustomer> {
  const address: ShopifyAddress = overrides.address ?? {
    first_name: overrides.first_name ?? 'E2E',
    last_name: overrides.last_name ?? 'Tester',
    address1: '500 E2E Test Way',
    city: 'Austin',
    province: 'Texas',
    zip: '78701',
    country: 'United States',
    country_code: 'US',
  };
  const payload = {
    customer: {
      email: overrides.email,
      first_name: overrides.first_name ?? 'E2E',
      last_name: overrides.last_name ?? 'Tester',
      phone: overrides.phone,
      verified_email: true,
      addresses: [address],
      tags: 'e2e-test',
    },
  };
  const { customer } = await shopifyRequest<{ customer: ShopifyCustomer }>(
    'POST',
    '/customers.json',
    payload
  );
  return customer;
}

export async function createOrder(
  customerId: number,
  overrides: Partial<{
    shipping_address: ShopifyAddress;
    line_item_title: string;
    price: string;
    email: string;
  }> = {}
): Promise<ShopifyOrder> {
  const payload = {
    order: {
      customer: { id: customerId },
      email: overrides.email,
      line_items: [
        {
          title: overrides.line_item_title ?? 'E2E Test Item',
          price: overrides.price ?? '24.00',
          quantity: 1,
        },
      ],
      financial_status: 'paid',
      shipping_address: overrides.shipping_address,
      inventory_behaviour: 'bypass',
      send_receipt: false,
      send_fulfillment_receipt: false,
      tags: 'e2e-test',
    },
  };
  const { order } = await shopifyRequest<{ order: ShopifyOrder }>('POST', '/orders.json', payload);
  return order;
}

type FulfillmentOrder = { id: number; line_items: Array<{ id: number; quantity: number }> };

/**
 * Fulfill an order through the modern fulfillment_orders flow, set a tracking
 * number, and emit a "delivered" fulfillment event. Returns the tracking number
 * and a delivered-at timestamp (now) used to build the claim webhook payload.
 */
export async function fulfillOrder(orderId: number): Promise<ShopifyFulfillment> {
  const { fulfillment_orders: fulfillmentOrders } = await shopifyRequest<{
    fulfillment_orders: FulfillmentOrder[];
  }>('GET', `/orders/${orderId}/fulfillment_orders.json`);

  const trackingNumber = `E2E${Date.now().toString().slice(-9)}`;
  const open = fulfillmentOrders.filter((fo) => fo.line_items.length > 0);
  if (open.length === 0) {
    throw new Error(`fulfillOrder: no fulfillment orders for order ${orderId}`);
  }

  const { fulfillment } = await shopifyRequest<{ fulfillment: { id: number; status: string } }>(
    'POST',
    '/fulfillments.json',
    {
      fulfillment: {
        notify_customer: false,
        tracking_info: { number: trackingNumber, company: 'E2E Carrier' },
        line_items_by_fulfillment_order: open.map((fo) => ({ fulfillment_order_id: fo.id })),
      },
    }
  );

  const deliveredAt = new Date().toISOString();
  // Best-effort delivered event — some stores reject custom events; the claim
  // payload uses deliveredAt regardless, so a failure here is non-fatal.
  try {
    await shopifyRequest('POST', `/fulfillments/${fulfillment.id}/events.json`, {
      event: { status: 'delivered', happened_at: deliveredAt },
    });
  } catch {
    /* non-fatal */
  }

  return {
    id: fulfillment.id,
    status: fulfillment.status,
    tracking_number: trackingNumber,
    tracking_company: 'E2E Carrier',
    deliveredAt,
  };
}

export async function deleteCustomer(customerId: number): Promise<void> {
  await shopifyRequest('DELETE', `/customers/${customerId}.json`);
}

// ---------------------------------------------------------------------------
// Write-capability detection (graceful degradation for read-only tokens)
// ---------------------------------------------------------------------------

let _canWrite: boolean | null = null;

/**
 * Returns true only if the admin token has the scopes needed to create the E2E
 * resources (write_customers + write_orders). Cached after the first check.
 * A read-only token returns false, letting scenarios fall back to a synthesized
 * order payload (the webhook body is what drives ingestion regardless).
 */
export async function canWriteResources(): Promise<boolean> {
  if (_canWrite !== null) return _canWrite;
  try {
    const { access_scopes } = await shopifyRequest<{ access_scopes: Array<{ handle: string }> }>(
      'GET',
      '/oauth/access_scopes.json'
    );
    const handles = new Set((access_scopes ?? []).map((s) => s.handle));
    _canWrite = handles.has('write_customers') && handles.has('write_orders');
  } catch {
    _canWrite = false;
  }
  return _canWrite;
}

/** Synthesize an order-shaped object when real Shopify writes are unavailable. */
export function synthesizeOrder(overrides: Partial<ShopifyOrder> = {}): ShopifyOrder {
  const n = Date.now().toString().slice(-6);
  return {
    id: Number(`8${Date.now().toString().slice(-9)}`),
    name: `#E2E-${n}`,
    order_number: Number(n),
    email: overrides.email ?? 'unknown@e2e-test.example.com',
    total_price: '24.00',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/** Best-effort variant used by the cleanup registry. */
export async function deleteShopifyCustomer(customerId: string | number): Promise<void> {
  await deleteCustomer(Number(customerId));
}

/** Lightweight connectivity probe: returns the store's myshopify domain. */
export async function getShopInfo(): Promise<{ domain: string; myshopify_domain: string }> {
  const { shop } = await shopifyRequest<{ shop: { domain: string; myshopify_domain: string } }>(
    'GET',
    '/shop.json'
  );
  return shop;
}
