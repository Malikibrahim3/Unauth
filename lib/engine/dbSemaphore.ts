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
  baseDelayMs = 500
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // Bail immediately on upstream-down — retries amplify the problem.
      if (isUpstreamDown(err)) throw err;
      const jitter = Math.random() * 200;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i + jitter));
    }
  }
  throw lastErr;
}
