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

export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 4,
  baseDelayMs = 500
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const jitter = Math.random() * 200;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i + jitter));
    }
  }
  throw lastErr;
}
