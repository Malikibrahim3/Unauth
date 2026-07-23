import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { verifyCollectorToken } from '@/lib/checkout/collectorToken';
import { readBoundedWebhookBody, WebhookBodyError } from '@/lib/webhooks/body';

export const runtime = 'nodejs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_RE = /^[0-9a-f]{64}$/i;
const PLATFORMS = new Set(['shopify', 'woocommerce', 'bigcommerce']);
const EVENT_TYPES = new Set(['pageview', 'checkout', 'email_capture']);
const ACCOUNT_TYPES = new Set(['guest', 'registered', 'unknown']);
const MAX_CHECKOUT_SIGNAL_BODY_BYTES = 32 * 1024;

type ServiceClient = ReturnType<typeof createServiceClient>;

type ParsedSignal = {
  eventId: string | null;
  merchantId: string;
  visitorId: string;
  sessionId: string;
  deviceFp: string | null;
  emailHash: string | null;
  accountType: 'guest' | 'registered' | 'unknown';
  platform: 'shopify' | 'woocommerce' | 'bigcommerce';
  page: string;
  referrer: string | null;
  checkoutReached: boolean;
  cartCount: number | null;
  eventType: 'pageview' | 'checkout' | 'email_capture';
  ts: number;
};

function json(body: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function text(value: unknown, max = 2048): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function hashOrNull(value: unknown): string | null {
  const v = text(value, 128);
  return v && SHA256_RE.test(v) ? v.toLowerCase() : null;
}

function integerOrNull(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return null;
  return Math.min(n, 100000);
}

function eventIdOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > 128) return null;
  return normalized;
}

function parseSignalBody(body: Record<string, unknown>, merchantId: string): ParsedSignal | null {
  const visitorId = text(body.visitorId, 128);
  const sessionId = text(body.sessionId, 128);
  const platform = text(body.platform, 32);
  const eventType = text(body.eventType, 32);
  const ts = Number(body.ts);
  if (!visitorId || !sessionId || !platform || !PLATFORMS.has(platform)) return null;
  if (!eventType || !EVENT_TYPES.has(eventType)) return null;
  if (!Number.isFinite(ts) || ts <= 0) return null;

  const account = text(body.accountType, 32);
  const emailHash = hashOrNull(body.emailHash);
  if (eventType === 'email_capture' && !emailHash) return null;

  return {
    eventId: eventIdOrNull(body.eventId),
    merchantId,
    visitorId,
    sessionId,
    deviceFp: hashOrNull(body.deviceFp),
    emailHash,
    accountType: ACCOUNT_TYPES.has(account ?? '') ? account as ParsedSignal['accountType'] : 'unknown',
    platform: platform as ParsedSignal['platform'],
    page: text(body.page, 2048) ?? '',
    referrer: text(body.referrer, 2048),
    checkoutReached: body.checkoutReached === true,
    cartCount: integerOrNull(body.cartCount),
    eventType: eventType as ParsedSignal['eventType'],
    ts,
  };
}

async function checkRateLimit(supabase: ServiceClient, ipHash: string): Promise<boolean> {
  const windowStart = new Date();
  windowStart.setSeconds(0, 0);
  const windowIso = windowStart.toISOString();

  const { data, error } = await supabase.rpc('increment_rate_limit', {
    p_ip_hash: ipHash,
    p_window_start: windowIso,
  });

  if (!error && typeof data === 'number') {
    return data <= 100;
  }
  return false;
}

async function resolveMerchantId(
  supabase: ServiceClient,
  body: Record<string, unknown>
): Promise<string | null> {
  const platform = text(body.platform, 32);
  const merchantRef = text(body.merchantId, 255) ?? text(body.shopifyDomain, 255);
  if (!merchantRef) return null;

  if (UUID_RE.test(merchantRef)) {
    const { data } = await supabase
      .from(TABLES.MERCHANTS)
      .select('id')
      .eq('id', merchantRef)
      .maybeSingle();
    return data?.id ?? null;
  }

  if (platform === 'shopify') {
    const { data } = await supabase
      .from(TABLES.MERCHANT_SHOPIFY_CONNECTIONS)
      .select('merchant_id')
      .eq('platform', 'shopify')
      .eq('store_key', merchantRef.toLowerCase())
      .eq('status', 'active')
      .maybeSingle();
    return data?.merchant_id ?? null;
  }

  return null;
}

function sanitizedRawPayload(signal: ParsedSignal): Record<string, unknown> {
  return {
    eventId: signal.eventId,
    merchantId: signal.merchantId,
    visitorId: signal.visitorId,
    sessionId: signal.sessionId,
    deviceFp: signal.deviceFp,
    emailHash: signal.emailHash,
    accountType: signal.accountType,
    platform: signal.platform,
    page: signal.page,
    referrer: signal.referrer,
    checkoutReached: signal.checkoutReached,
    cartCount: signal.cartCount,
    eventType: signal.eventType,
    ts: signal.ts,
  };
}

function signalIdempotencyKey(signal: ParsedSignal): string {
  if (signal.eventId) return `event:${sha256(signal.eventId)}`;
  return `legacy:${sha256(JSON.stringify(sanitizedRawPayload(signal)))}`;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await readBoundedWebhookBody(request, MAX_CHECKOUT_SIGNAL_BODY_BYTES);
  } catch (error) {
    if (error instanceof WebhookBodyError) {
      return json({ ok: false, error: error.code }, { status: error.status });
    }
    throw error;
  }
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid_json');
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false }, { status: 400 });
  }

  const supabase = createServiceClient();
  const merchantId = await resolveMerchantId(supabase, body);
  if (!merchantId) return json({ ok: true });

  // The merchantId is client-supplied. Require a signed collector token (minted
  // by /api/shopify/collector-init) that binds this request to the resolved
  // merchant, so arbitrary UUIDs cannot be used to poison another tenant's
  // identity graph. Enforced whenever INTERNAL_HMAC_SECRET is set (always on
  // preview + production per env.ts).
  const collectorToken = text(body.collectorToken, 512);
  if (!verifyCollectorToken(collectorToken, merchantId)) {
    return json({ ok: false, error: 'invalid_collector_token' }, { status: 401 });
  }

  const signal = parseSignalBody(body, merchantId);
  if (!signal) return json({ ok: false }, { status: 400 });

  const rawIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '0.0.0.0';
  const ipHash = sha256(rawIp);
  const allowed = await checkRateLimit(supabase, ipHash);
  if (!allowed) return json({ ok: false }, { status: 429 });

  const { error: insertError } = await supabase
    .from(TABLES.CHECKOUT_SIGNALS)
    .insert({
      merchant_id: signal.merchantId,
      visitor_id: signal.visitorId,
      session_id: signal.sessionId,
      device_fp: signal.deviceFp,
      email_hash: signal.emailHash,
      ip_hash: ipHash,
      account_type: signal.accountType,
      platform: signal.platform,
      page: signal.page || null,
      referrer: signal.referrer,
      checkout_reached: signal.checkoutReached,
      cart_count: signal.cartCount,
      event_type: signal.eventType,
      idempotency_key: signalIdempotencyKey(signal),
      raw_payload: sanitizedRawPayload(signal),
    })
    .select('id')
    .single();

  if (insertError && (insertError as { code?: string }).code === '23505') {
    return json({ ok: true });
  }
  if (insertError) return json({ ok: false }, { status: 500 });

  return json({ ok: true });
}
