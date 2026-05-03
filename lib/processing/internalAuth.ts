/* ────────────────────────────────────────────────────────────────────────────
 * 🔒 LOCKED FILE — DO NOT MODIFY WITHOUT EXPLICIT USER PERMISSION 🔒
 *
 * Internal HMAC token used to authenticate server-to-server fetches between
 * /api/audit (initial dispatcher) and /api/process-csv-chunk (chunk worker).
 * Both routes share the same Vercel deployment and the same env var, so the
 * server-only SUPABASE_SERVICE_ROLE_KEY is a safe shared secret.
 * ──────────────────────────────────────────────────────────────────────── */

import { createHmac, timingSafeEqual } from 'crypto';

const HEADER = 'x-internal-chunk-token';

function secret(): string {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set — cannot sign internal chunk requests');
  return k;
}

/** Sign a job-scoped chunk dispatch. Token is bound to the jobId so it can't
 *  be replayed across jobs. */
export function signChunkToken(jobId: string): string {
  return createHmac('sha256', secret()).update(jobId).digest('hex');
}

export function verifyChunkToken(jobId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = signChunkToken(jobId);
  // Length check first to keep timingSafeEqual happy
  if (expected.length !== token.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(token, 'hex'));
  } catch {
    return false;
  }
}

export const INTERNAL_CHUNK_TOKEN_HEADER = HEADER;
