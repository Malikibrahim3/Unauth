import { after, NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { buildFastContext } from '@/lib/engine/fastContext';
import type { NormalisedOrder } from '@/lib/engine/types';
import { canonicalizeEdgePair, type IdentifierRef } from '@/lib/identity/identifierGraph';

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

type ServiceClient = ReturnType<typeof createServiceClient>;

type ParsedSignal = {
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
  ts: number | null;
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

function parseSignalBody(body: Record<string, unknown>, merchantId: string): ParsedSignal | null {
  const visitorId = text(body.visitorId, 128);
  const sessionId = text(body.sessionId, 128);
  const platform = text(body.platform, 32);
  const eventType = text(body.eventType, 32);
  if (!visitorId || !sessionId || !platform || !PLATFORMS.has(platform)) return null;
  if (!eventType || !EVENT_TYPES.has(eventType)) return null;

  const account = text(body.accountType, 32);
  const emailHash = hashOrNull(body.emailHash);
  if (eventType === 'email_capture' && !emailHash) return null;

  return {
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
    ts: Number.isFinite(Number(body.ts)) ? Number(body.ts) : null,
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

  const { data: existing, error: readError } = await supabase
    .from(TABLES.INGEST_RATE_LIMITS)
    .select('request_count')
    .eq('ip_hash', ipHash)
    .eq('window_start', windowIso)
    .maybeSingle();
  if (readError) return false;

  if (!existing) {
    const { error: insertError } = await supabase
      .from(TABLES.INGEST_RATE_LIMITS)
      .insert({ ip_hash: ipHash, window_start: windowIso, request_count: 1 });
    return !insertError;
  }

  const nextCount = Number(existing.request_count ?? 0) + 1;
  const { error: updateError } = await supabase
    .from(TABLES.INGEST_RATE_LIMITS)
    .update({ request_count: nextCount })
    .eq('ip_hash', ipHash)
    .eq('window_start', windowIso);
  return !updateError && nextCount <= 100;
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

async function isDuplicate(
  supabase: ServiceClient,
  signal: Pick<ParsedSignal, 'merchantId' | 'visitorId' | 'sessionId' | 'eventType' | 'page'>
): Promise<boolean> {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from(TABLES.CHECKOUT_SIGNALS)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', signal.merchantId)
    .eq('visitor_id', signal.visitorId)
    .eq('session_id', signal.sessionId)
    .eq('event_type', signal.eventType)
    .eq('page', signal.page ?? '')
    .gte('created_at', since);
  return (count ?? 0) > 0;
}

function sanitizedRawPayload(signal: ParsedSignal): Record<string, unknown> {
  return {
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

function fastContextOrder(emailHash: string, visitorId: string, deviceFp: string | null): NormalisedOrder {
  return {
    orderId: `checkout_signal:${visitorId}`,
    orderDate: new Date(),
    emailHash,
    addressHash: null,
    phoneHash: null,
    billingAddressHash: null,
    ipHash: null,
    deviceIdHash: deviceFp,
    browserFingerprint: deviceFp,
    cookieIdHash: visitorId,
    customerNameNorm: '',
    orderTotal: 0,
    currency: 'UNK',
    orderStatus: 'pending',
    refundStatus: 'none',
    refundReason: null,
    refundDate: null,
    refundAmount: null,
    paymentMethod: null,
  };
}

async function runFastContextGate(
  supabase: ServiceClient,
  merchantId: string,
  emailHash: string,
  visitorId: string,
  deviceFp: string | null
): Promise<void> {
  await buildFastContext([fastContextOrder(emailHash, visitorId, deviceFp)], supabase as any, merchantId);
}

async function upsertCheckoutIdentifiers(
  supabase: ServiceClient,
  signal: ParsedSignal
): Promise<void> {
  const identifiers = [
    {
      identifier_type: 'visitor_id',
      identifier_hash: signal.visitorId,
      raw_vs_hashed_storage: 'raw',
    },
  ];
  if (signal.deviceFp) {
    identifiers.push({
      identifier_type: 'device_fingerprint',
      identifier_hash: signal.deviceFp,
      raw_vs_hashed_storage: 'hashed',
    });
  }

  const { error } = await supabase.rpc('bulk_upsert_identity_identifiers', {
    p_identifiers: identifiers,
    p_source_provider: signal.platform,
  });
  if (error) throw new Error(`checkout_identifier_upsert_failed: ${error.message}`);
}

async function linkSignalToIdentityGraph(
  supabase: ServiceClient,
  signal: ParsedSignal
): Promise<void> {
  if (!signal.emailHash) return;

  await runFastContextGate(
    supabase,
    signal.merchantId,
    signal.emailHash,
    signal.visitorId,
    signal.deviceFp
  );

  await upsertCheckoutIdentifiers(supabase, signal);

  const { data: emailIdentifier, error: emailError } = await supabase
    .from(TABLES.IDENTITY_IDENTIFIERS)
    .select('id')
    .eq('identifier_type', 'normalized_email_hash')
    .eq('identifier_hash', signal.emailHash)
    .maybeSingle();
  if (emailError || !emailIdentifier) return;

  const emailRef: IdentifierRef = {
    type: 'normalized_email_hash',
    hash: signal.emailHash,
    rawVsHashedStorage: 'hashed',
  };
  const visitorRef: IdentifierRef = {
    type: 'visitor_id',
    hash: signal.visitorId,
    rawVsHashedStorage: 'raw',
  };
  const pairs = [canonicalizeEdgePair(emailRef, visitorRef)];

  if (signal.deviceFp) {
    pairs.push(canonicalizeEdgePair(emailRef, {
      type: 'device_fingerprint',
      hash: signal.deviceFp,
      rawVsHashedStorage: 'hashed',
    }));
  }

  const { error: edgeError } = await supabase.rpc('bulk_upsert_identifier_co_occurrence_edges', {
    p_merchant_id: signal.merchantId,
    p_edges: pairs.map((pair) => ({
      left_type: pair.left.type,
      left_hash: pair.left.hash,
      right_type: pair.right.type,
      right_hash: pair.right.hash,
      count_delta: 1,
    })),
    p_source_provider: signal.platform,
  });
  if (edgeError) throw new Error(`checkout_edge_upsert_failed: ${edgeError.message}`);
}

async function updateCrossMerchantDeviceHits(
  supabase: ServiceClient,
  signalId: string | undefined,
  deviceFp: string | null,
  merchantId: string
): Promise<void> {
  if (!signalId || !deviceFp) return;

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from(TABLES.CHECKOUT_SIGNALS)
    .select('merchant_id')
    .eq('device_fp', deviceFp)
    .neq('merchant_id', merchantId)
    .gte('created_at', since)
    .limit(1000);
  if (error || !data?.length) return;

  const otherMerchantCount = new Set(data.map((row: { merchant_id: string }) => row.merchant_id)).size;
  if (otherMerchantCount <= 0) return;

  await supabase.rpc('set_checkout_signal_cross_merchant_hits', {
    p_signal_id: signalId,
    p_hit_count: otherMerchantCount,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const rawIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '0.0.0.0';
  const ipHash = sha256(rawIp);

  const allowed = await checkRateLimit(supabase, ipHash);
  if (!allowed) return json({ ok: false }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false }, { status: 400 });
  }

  const merchantId = await resolveMerchantId(supabase, body);
  if (!merchantId) return json({ ok: true });

  const signal = parseSignalBody(body, merchantId);
  if (!signal) return json({ ok: false }, { status: 400 });

  if (await isDuplicate(supabase, signal)) {
    return json({ ok: true });
  }

  const { data: inserted, error: insertError } = await supabase
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
      raw_payload: sanitizedRawPayload(signal),
    })
    .select('id')
    .single();

  if (insertError) return json({ ok: false }, { status: 500 });

  if (signal.emailHash) {
    try {
      await linkSignalToIdentityGraph(supabase, signal);
    } catch (error) {
      console.error('checkout_signal_identity_link_failed', {
        signalId: inserted?.id,
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  if (signal.deviceFp) {
    after(async () => {
      await updateCrossMerchantDeviceHits(supabase, inserted?.id, signal.deviceFp, signal.merchantId);
    });
  }

  return json({ ok: true });
}
