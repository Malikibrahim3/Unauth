import { NextResponse } from 'next/server';

export type RateLimitOptions = {
  max: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfter: number;
  limit: number;
  remaining: number;
};

type MemoryCounter = {
  count: number;
  expiresAt: number;
};

const memoryCounters = new Map<string, MemoryCounter>();

function envFlag(name: string): boolean {
  const value = process.env[name]?.toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

function envInt(name: string, fallback: number): number {
  const value = process.env[name];
  if (value == null || value.trim() === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function limitFromEnv(
  maxEnvName: string,
  defaultMax: number,
  defaultWindowSeconds: number,
  windowEnvName = `${maxEnvName}_WINDOW_SECONDS`
): RateLimitOptions {
  return {
    max: envInt(maxEnvName, defaultMax),
    windowSeconds: envInt(windowEnvName, defaultWindowSeconds),
  };
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (
    forwardedFor ||
    headers.get('x-real-ip')?.trim() ||
    headers.get('cf-connecting-ip')?.trim() ||
    'unknown'
  );
}

export function rateLimitKey(...parts: Array<string | number | null | undefined>): string {
  return parts
    .map((part) => String(part ?? 'unknown').replace(/[^a-zA-Z0-9:_-]/g, '_'))
    .join(':');
}

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ''), token };
}

function inMemoryRateLimit(
  redisKey: string,
  max: number,
  retryAfter: number
): RateLimitResult {
  const now = Date.now();
  const existing = memoryCounters.get(redisKey);
  const current =
    existing && existing.expiresAt > now
      ? existing
      : { count: 0, expiresAt: now + retryAfter * 1000 };

  current.count += 1;
  memoryCounters.set(redisKey, current);

  if (memoryCounters.size > 10000) {
    for (const [key, counter] of memoryCounters.entries()) {
      if (counter.expiresAt <= now) memoryCounters.delete(key);
    }
  }

  return {
    allowed: current.count <= max,
    retryAfter,
    limit: max,
    remaining: Math.max(0, max - current.count),
  };
}

export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (envFlag('RATE_LIMIT_DISABLED') || max <= 0 || windowSeconds <= 0) {
    return { allowed: true, retryAfter: 0, limit: max, remaining: Math.max(0, max) };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(nowSeconds / windowSeconds);
  const retryAfter = Math.max(1, (bucket + 1) * windowSeconds - nowSeconds);
  const redisKey = rateLimitKey('rl', key, bucket);
  const upstash = getUpstashConfig();

  if (!upstash) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Upstash Redis rate limiting is not configured');
    }
    return inMemoryRateLimit(redisKey, max, retryAfter);
  }

  const response = await fetch(`${upstash.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${upstash.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', redisKey],
      ['EXPIRE', redisKey, retryAfter + 5],
    ]),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Upstash Redis rate limit check failed: ${response.status}`);
  }

  const results = (await response.json()) as Array<{ result?: unknown; error?: string }>;
  if (results[0]?.error) {
    throw new Error(`Upstash Redis rate limit check failed: ${results[0].error}`);
  }

  const count = Number(results[0]?.result ?? 0);
  if (!Number.isFinite(count)) {
    throw new Error('Upstash Redis returned an invalid rate limit counter');
  }

  return {
    allowed: count <= max,
    retryAfter,
    limit: max,
    remaining: Math.max(0, max - count),
  };
}

export function rateLimitExceededResponse(result: RateLimitResult): NextResponse {
  const retryAfter = String(Math.max(1, Math.ceil(result.retryAfter)));
  return NextResponse.json(
    { error: 'rate_limited', retryAfter: Number(retryAfter) },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfter,
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
      },
    }
  );
}

export async function enforceRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const result = await rateLimit(key, options.max, options.windowSeconds);
  return result.allowed ? null : rateLimitExceededResponse(result);
}
