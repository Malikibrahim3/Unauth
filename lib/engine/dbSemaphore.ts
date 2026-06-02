// Shared concurrency semaphore for all Supabase overlap/fetch queries.
// Keeps peak in-flight DB requests at 8 regardless of batch size or chunk count.
// Imported by entityResolution.ts and fastContext.ts.

const MAX_CONCURRENT_DB_REQUESTS = 8;

function makeSemaphore(limit: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  return async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= limit) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active++;
    try {
      return await fn();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}

export const dbSlot = makeSemaphore(MAX_CONCURRENT_DB_REQUESTS);

// Detect Supabase/Cloudflare upstream-down conditions. When we see these,
// retrying is counter-productive — the DB is overloaded and our retries make
// it worse. Best-effort writes should bail out instead.
export function isUpstreamDown(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message ?? err ?? '').toLowerCase();
  return (
    msg.includes('521') ||
    msg.includes('web server is down') ||
    msg.includes('cloudflare') ||
    msg.includes('schema cache') ||
    msg.includes('upstream') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('fetch failed') ||
    msg.includes('<!doctype html')
  );
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 500,
  attempt = 0
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isUpstreamDown(err) || attempt >= attempts - 1) throw err;
    const jitter = Math.random() * 200;
    await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt + jitter));
    return withRetry(fn, attempts, baseDelayMs, attempt + 1);
  }
}

// True upstream-down (server reported HTTP 521 / schema cache miss / etc.).
// These don't recover by retrying — the DB itself is unreachable, and our
// retries pile on. Distinguished from transport-level errors below.
export function isHardUpstreamDown(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message ?? err ?? '').toLowerCase();
  return (
    msg.includes('521') ||
    msg.includes('web server is down') ||
    msg.includes('cloudflare') ||
    msg.includes('schema cache') ||
    msg.includes('<!doctype html')
  );
}

// Read-path retry. Unlike withRetry (which bails on any isUpstreamDown match,
// including "fetch failed"), this DOES retry transport-level errors like
// `TypeError: fetch failed`, ECONNRESET, ETIMEDOUT — under load these are
// usually local socket exhaustion, not Supabase being down, and retrying with
// backoff recovers. We still bail on hard upstream-down (Cloudflare 521 etc).
//
// Returns { value, retries, failed }. Callers can surface the counters in the
// data-quality report without changing the success/failure contract.
async function withReadRetryAttempt<T>(
  fn: () => Promise<T>,
  attempts: number,
  baseDelayMs: number,
  attempt: number,
  retries: number
): Promise<{ value: T | null; retries: number; failed: boolean; lastError: unknown }> {
  try {
    const value = await fn();
    return { value, retries, failed: false, lastError: null };
  } catch (err) {
    if (isHardUpstreamDown(err)) {
      return { value: null, retries, failed: true, lastError: err };
    }
    if (attempt >= attempts - 1) {
      return { value: null, retries, failed: true, lastError: err };
    }
    const jitter = Math.random() * 200;
    await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt + jitter));
    return withReadRetryAttempt(fn, attempts, baseDelayMs, attempt + 1, retries + 1);
  }
}

export async function withReadRetry<T>(
  fn: () => Promise<T>,
  attempts = 5,
  baseDelayMs = 500
): Promise<{ value: T | null; retries: number; failed: boolean; lastError: unknown }> {
  return withReadRetryAttempt(fn, attempts, baseDelayMs, 0, 0);
}
