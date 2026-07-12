import crypto from 'crypto';
import { env } from '@/lib/utils/env';

/**
 * Signed collector-token handshake for the PUBLIC checkout-signal collector.
 *
 * The ingest endpoint (/api/checkout-signals/ingest) is unauthenticated by
 * necessity — it is called by a browser pixel on the merchant's storefront.
 * Previously it accepted any client-supplied `merchantId`, so anyone who knew a
 * merchant UUID (leaked by /api/shopify/collector-init) could write into that
 * tenant's identity graph. This token binds each request to a merchant via an
 * HMAC minted server-side by collector-init, adds a short expiry, and gives us a
 * single revocation lever (rotate INTERNAL_HMAC_SECRET to invalidate every
 * outstanding collector).
 *
 * NOTE: collector-init is itself public, so this raises the forgery bar
 * (expiry + must-have-bootstrapped) rather than being a hard identity proof.
 * Downstream consumers must still treat checkout-signal data as low-trust.
 *
 * Enforcement: active whenever INTERNAL_HMAC_SECRET is configured. env.ts
 * REQUIRES that secret on preview + production, so deployed environments always
 * enforce; a bare local dev without the secret runs permissively.
 */

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function collectorSecret(): string | null {
  return env.INTERNAL_HMAC_SECRET ?? null;
}

function sign(merchantId: string, exp: number, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`${merchantId}.${exp}`).digest('base64url');
}

/** Returns a `<exp>.<sig>` token, or null if no signing secret is configured. */
export function mintCollectorToken(merchantId: string, nowMs: number = Date.now()): string | null {
  const secret = collectorSecret();
  if (!secret) return null;
  const exp = nowMs + TOKEN_TTL_MS;
  return `${exp}.${sign(merchantId, exp, secret)}`;
}

export function verifyCollectorToken(
  token: string | null | undefined,
  merchantId: string,
  nowMs: number = Date.now()
): boolean {
  const secret = collectorSecret();
  // No secret configured → local dev only (see env.ts): do not block ingestion.
  if (!secret) return true;
  if (!token) return false;

  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const exp = Number(token.slice(0, dot));
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(exp) || exp < nowMs) return false;

  const expected = sign(merchantId, exp, secret);
  const provided = Buffer.from(sig);
  const want = Buffer.from(expected);
  return provided.length === want.length && crypto.timingSafeEqual(provided, want);
}
