import { createHmac, timingSafeEqual } from 'node:crypto';

export type ShipBobCredentials = {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  sandbox?: boolean;
  channelId?: string;
  providerAccountId?: string;
  webhookSecret?: string;
};

export type ShipBobPage<T> = { items: T[]; next: string | null };

export type ShipBobWebhookSubscription = {
  id: string;
  topics: string[];
  url: string;
  enabled?: boolean;
  secret?: string;
};

export const SHIPBOB_WEBHOOK_TOPICS = [
  'order.shipped',
  'order.shipment.delivered',
  'order.shipment.exception',
  'order.shipment.on_hold',
  'order.shipment.cancelled',
] as const;

export function shipBobToken(credentials: ShipBobCredentials): string | null {
  const token = credentials.accessToken ?? credentials.apiKey;
  return typeof token === 'string' && token.trim() ? token.trim() : null;
}

export function shipBobApiBaseUrl(sandbox: boolean): string {
  return sandbox ? 'https://sandbox-api.shipbob.com/2026-07' : 'https://api.shipbob.com/2026-07';
}

function queryString(params: Record<string, string | null | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const rendered = query.toString();
  return rendered ? `?${rendered}` : '';
}

export async function shipBobRequest<T>(
  path: string,
  credentials: ShipBobCredentials,
  options: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown } = {},
): Promise<T> {
  const { payload } = await shipBobResponse<T>(path, credentials, options);
  return payload;
}

async function shipBobResponse<T>(
  path: string,
  credentials: ShipBobCredentials,
  options: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown } = {},
): Promise<{ payload: T; headers: Headers }> {
  const token = shipBobToken(credentials);
  if (!token) throw new Error('shipbob_access_token_missing');
  const base = shipBobApiBaseUrl(credentials.sandbox === true);
  const response = await fetch(`${base}${path.startsWith('/') ? path : `/${path}`}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(credentials.channelId ? { shipbob_channel_id: credentials.channelId } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = response.status === 401 || response.status === 403 ? 'shipbob_auth_failed' : 'shipbob_api_failed';
    throw new Error(`${code}:${response.status}`);
  }
  return { payload: payload as T, headers: response.headers };
}

function pageItems<T>(payload: unknown): ShipBobPage<T> {
  if (Array.isArray(payload)) return { items: payload as T[], next: null };
  const body = (payload ?? {}) as Record<string, unknown>;
  const items = Array.isArray(body.items)
    ? body.items
    : Array.isArray(body.orders)
      ? body.orders
      : Array.isArray(body.returns)
        ? body.returns
        : [];
  const next = typeof body.next === 'string' && body.next.trim()
    ? body.next
    : typeof body.next_cursor === 'string' && body.next_cursor.trim()
      ? body.next_cursor
      : null;
  return { items: items as T[], next };
}

function nextPage(headers: Headers): string | null {
  const nextPagePath = headers.get('next-page');
  if (nextPagePath) {
    try {
      const url = new URL(nextPagePath, 'https://api.shipbob.com');
      const page = url.searchParams.get('page');
      if (page) return page;
    } catch {
      // Fall through to the numeric pagination headers below.
    }
  }

  const current = Number(headers.get('page-number'));
  const total = Number(headers.get('total-pages'));
  return Number.isInteger(current) && Number.isInteger(total) && current < total
    ? String(current + 1)
    : null;
}

export async function listShipBobLocations(credentials: ShipBobCredentials, cursor?: string | null) {
  const payload = await shipBobRequest<unknown>(`/location${queryString({ RecordsPerPage: '250', Cursor: cursor })}`, credentials);
  return pageItems<Record<string, unknown>>(payload);
}

export async function listShipBobOrders(credentials: ShipBobCredentials, cursor?: string | null) {
  const { payload, headers } = await shipBobResponse<unknown>(
    `/order${queryString({ Limit: '100', Page: cursor ?? '1' })}`,
    credentials,
  );
  const page = pageItems<Record<string, unknown>>(payload);
  return { ...page, next: nextPage(headers) ?? page.next };
}

export async function listShipBobReturns(credentials: ShipBobCredentials, cursor?: string | null) {
  const payload = await shipBobRequest<unknown>(`/return${queryString({ RecordsPerPage: '250', Cursor: cursor })}`, credentials);
  return pageItems<Record<string, unknown>>(payload);
}

export async function listShipBobSubscriptions(credentials: ShipBobCredentials, cursor?: string | null) {
  const payload = await shipBobRequest<unknown>(`/webhook${queryString({ RecordsPerPage: '250', Cursor: cursor })}`, credentials);
  return pageItems<ShipBobWebhookSubscription>(payload);
}

export async function createShipBobSubscription(
  credentials: ShipBobCredentials,
  input: { url: string; topics: string[]; description: string; secret: string },
) {
  return shipBobRequest<ShipBobWebhookSubscription>('/webhook', credentials, { method: 'POST', body: input });
}

export async function deleteShipBobSubscription(credentials: ShipBobCredentials, subscriptionId: string) {
  await shipBobRequest<unknown>(`/webhook/${encodeURIComponent(subscriptionId)}`, credentials, { method: 'DELETE' });
}

export function verifyShipBobWebhookSignature(input: {
  rawBody: string;
  webhookId: string | null;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): boolean {
  if (!input.webhookId || !input.timestamp || !input.signature || !input.secret.startsWith('whsec_')) return false;
  const timestampSeconds = Number(input.timestamp);
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(timestampSeconds) || Math.abs(now - timestampSeconds) > (input.toleranceSeconds ?? 300)) return false;
  const key = Buffer.from(input.secret.slice('whsec_'.length), 'base64');
  const signedContent = `${input.webhookId}.${input.timestamp}.${input.rawBody}`;
  const expected = createHmac('sha256', key).update(signedContent).digest('base64');
  const values = input.signature.split(' ').map((part) => part.includes(',') ? part.split(',').pop() ?? '' : part);
  return values.some((value) => {
    const received = Buffer.from(value);
    const expectedBuffer = Buffer.from(expected);
    return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
  });
}
