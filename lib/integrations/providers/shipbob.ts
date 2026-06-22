import type { IntegrationProvider } from '@/lib/integrations/types';

export const shipbobProvider: IntegrationProvider = {
  id: 'shipbob',
  name: 'ShipBob',
  category: 'warehouse_3pl',
  authMode: 'api_key',
  buildStatus: 'live',
  evidenceCapabilities: ['warehouse_pick_pack', 'warehouse_exception', 'three_pl_sla_claim_status'],
  capabilities: { readFulfilment: true, readWarehouseEvents: true, readClaimStatus: true },
};

export type ShipBobOrder = {
  id: string;
  reference_id: string;
  status: string;
  shipments: Array<{
    id: string;
    status: string;
    tracking_number?: string;
    carrier?: string;
    ship_date?: string;
    estimated_delivery?: string;
    package_material_weight?: number;
    products: Array<{
      reference_id: string;
      name: string;
      quantity: number;
    }>;
  }>;
  products: Array<{
    reference_id: string;
    name: string;
    quantity: number;
  }>;
  raw: Record<string, any>;
};

export type ShipBobTimelineEvent = {
  description: string;
  event_date: string;
  location?: string;
};

export type ShipBobReturn = {
  id: string;
  status: string;
  products: Array<{
    reference_id: string;
    name: string;
    quantity: number;
    condition?: string;
  }>;
  raw: Record<string, any>;
};

function shipBobPatFromEnv(): string {
  const pat = process.env.SHIPBOB_PAT?.trim();
  if (!pat) throw new Error('shipbob_pat_missing: set SHIPBOB_PAT');
  return pat;
}

function shipBobBaseUrl(sandbox?: boolean): string {
  const isSandbox = sandbox ?? process.env.SHIPBOB_SANDBOX === 'true';
  return isSandbox
    ? 'https://sandbox-api.shipbob.com/2026-01'
    : 'https://api.shipbob.com/2026-01';
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function numberValue(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function shipBobHeaders(pat: string): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${pat}`,
  };
}

async function shipBobRequest<T>(
  path: string,
  options: { pat?: string; baseUrl?: string; sandbox?: boolean } = {},
): Promise<T | null> {
  const pat = options.pat ?? shipBobPatFromEnv();
  const baseUrl = (options.baseUrl ?? shipBobBaseUrl(options.sandbox)).replace(/\/$/, '');
  const res = await fetch(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
    headers: shipBobHeaders(pat),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (res.status === 401 || res.status === 403) {
    throw new Error('shipbob_auth_failed: check SHIPBOB_PAT');
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    console.warn('shipbob_rate_limited', { path, retryAfter });
    throw new Error(`shipbob_rate_limited${retryAfter ? `: retry after ${retryAfter}s` : ''}`);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`shipbob_request_failed: ${res.status} ${JSON.stringify(body).slice(0, 400)}`);
  }
  return body as T;
}

function productFromRaw(product: Record<string, any>) {
  return {
    reference_id: firstString(product.reference_id, product.referenceId, product.sku, product.id) ?? '',
    name: firstString(product.name, product.product_name, product.title) ?? 'Unknown product',
    quantity: numberValue(product.quantity ?? product.qty),
  };
}

function mapShipBobOrder(raw: Record<string, any>): ShipBobOrder {
  const shipmentsRaw = Array.isArray(raw.shipments) ? raw.shipments : [];
  const productsRaw = Array.isArray(raw.products) ? raw.products : Array.isArray(raw.items) ? raw.items : [];
  return {
    id: firstString(raw.id, raw.order_id) ?? '',
    reference_id: firstString(raw.reference_id, raw.referenceId, raw.order_number) ?? '',
    status: firstString(raw.status, raw.order_status) ?? 'unknown',
    shipments: shipmentsRaw.map((shipment: Record<string, any>) => ({
      id: firstString(shipment.id, shipment.shipment_id) ?? '',
      status: firstString(shipment.status, shipment.shipment_status) ?? 'unknown',
      ...(firstString(shipment.tracking_number, shipment.trackingNumber) ? { tracking_number: firstString(shipment.tracking_number, shipment.trackingNumber) } : {}),
      ...(firstString(shipment.carrier, shipment.carrier_name) ? { carrier: firstString(shipment.carrier, shipment.carrier_name) } : {}),
      ...(firstString(shipment.ship_date, shipment.shipDate) ? { ship_date: firstString(shipment.ship_date, shipment.shipDate) } : {}),
      ...(firstString(shipment.estimated_delivery, shipment.estimatedDelivery) ? { estimated_delivery: firstString(shipment.estimated_delivery, shipment.estimatedDelivery) } : {}),
      ...(shipment.package_material_weight != null ? { package_material_weight: numberValue(shipment.package_material_weight) } : {}),
      products: (Array.isArray(shipment.products) ? shipment.products : []).map(productFromRaw),
    })),
    products: productsRaw.map(productFromRaw),
    raw,
  };
}

function mapTimelineEvent(raw: Record<string, any>): ShipBobTimelineEvent {
  return {
    description: firstString(raw.description, raw.message, raw.event) ?? 'ShipBob timeline event',
    event_date: firstString(raw.event_date, raw.eventDate, raw.created_at, raw.date) ?? new Date().toISOString(),
    ...(firstString(raw.location, raw.facility_name, raw.warehouse) ? { location: firstString(raw.location, raw.facility_name, raw.warehouse) } : {}),
  };
}

function mapReturn(raw: Record<string, any>): ShipBobReturn {
  const products = Array.isArray(raw.products) ? raw.products : Array.isArray(raw.items) ? raw.items : [];
  return {
    id: firstString(raw.id, raw.return_id) ?? '',
    status: firstString(raw.status, raw.return_status) ?? 'unknown',
    products: products.map((product: Record<string, any>) => ({
      ...productFromRaw(product),
      ...(firstString(product.condition) ? { condition: firstString(product.condition) } : {}),
    })),
    raw,
  };
}

export async function getOrderByReferenceId(
  referenceId: string,
  pat?: string,
  sandbox?: boolean,
): Promise<ShipBobOrder | null> {
  const ref = referenceId.trim();
  if (!ref) return null;
  const body = await shipBobRequest<Record<string, any>>(`/order?reference_id=${encodeURIComponent(ref)}`, { pat, sandbox });
  const order = Array.isArray(body?.orders)
    ? body.orders[0]
    : Array.isArray(body)
      ? body[0]
      : body?.order ?? body;
  return order ? mapShipBobOrder(order) : null;
}

export async function getShipmentTimeline(
  shipmentId: string,
  pat?: string,
  sandbox?: boolean,
): Promise<ShipBobTimelineEvent[]> {
  const id = shipmentId.trim();
  if (!id) return [];
  const body = await shipBobRequest<Record<string, any>>(`/shipment/${encodeURIComponent(id)}/timeline`, { pat, sandbox });
  const events = Array.isArray(body?.events) ? body.events : Array.isArray(body) ? body : [];
  return events.map(mapTimelineEvent);
}

export async function getReturnForOrder(
  orderId: string,
  pat?: string,
  sandbox?: boolean,
): Promise<ShipBobReturn | null> {
  const id = orderId.trim();
  if (!id) return null;
  const body = await shipBobRequest<Record<string, any>>(`/return?order_id=${encodeURIComponent(id)}`, { pat, sandbox });
  const returnOrder = Array.isArray(body?.returns)
    ? body.returns[0]
    : Array.isArray(body)
      ? body[0]
      : body?.return ?? body;
  return returnOrder ? mapReturn(returnOrder) : null;
}
