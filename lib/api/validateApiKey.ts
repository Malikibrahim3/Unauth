import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { hashApiKey, isValidApiKeyFormat } from '@/lib/api/apiKeys';
import { getClientIp } from '@/lib/ratelimit';

export type ValidatedApiKey = {
  merchantId: string;
  keyId: string;
  rateLimitPerMinute: number;
  requestIp: string;
};

type ApiKeyRow = {
  id: string;
  merchant_id: string;
  rate_limit_per_minute: number;
  revoked_at: string | null;
};

const keyMinuteCounts = new Map<string, number>();

function checkKeyRateLimit(keyId: string, limit: number): boolean {
  const window = Math.floor(Date.now() / 60000);
  const mapKey = `${keyId}:${window}`;
  const count = (keyMinuteCounts.get(mapKey) ?? 0) + 1;
  keyMinuteCounts.set(mapKey, count);
  if (keyMinuteCounts.size > 20000) {
    const cutoff = window - 2;
    for (const k of keyMinuteCounts.keys()) {
      const minute = parseInt(k.split(':').pop() ?? '0', 10);
      if (minute < cutoff) keyMinuteCounts.delete(k);
    }
  }
  return count > limit;
}

function parseBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header?.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export type ApiKeyValidationError = {
  status: 401 | 429 | 500;
  message: string;
};

/**
 * Validates a raw API key string (Bearer header or query param).
 */
export async function validateApiKeyPlaintext(
  plaintext: string,
  requestIp: string
): Promise<ValidatedApiKey | ApiKeyValidationError> {
  if (!plaintext.trim()) {
    return { status: 401, message: 'API key is required' };
  }

  if (!isValidApiKeyFormat(plaintext)) {
    return { status: 401, message: 'Invalid API key' };
  }

  const service = createServiceClient();
  const keyHash = hashApiKey(plaintext);

  const { data: row, error } = await service
    .from(TABLES.MERCHANT_API_KEYS)
    .select('id, merchant_id, rate_limit_per_minute, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle() as unknown as { data: ApiKeyRow | null; error: { message: string } | null };

  if (error) {
    console.error('[validateApiKey] lookup failed:', error.message);
    return { status: 500, message: 'Authentication failed' };
  }

  if (!row || row.revoked_at) {
    return { status: 401, message: 'Invalid or revoked API key' };
  }

  const limit = row.rate_limit_per_minute ?? 60;
  if (checkKeyRateLimit(row.id, limit)) {
    return { status: 429, message: 'Rate limit exceeded for this API key' };
  }

  const usedAt = new Date().toISOString();
  service
    .from(TABLES.MERCHANT_API_KEYS)
    .update({ last_used_at: usedAt })
    .eq('id', row.id)
    .then((res: { error: { message: string } | null }) => {
      if (res.error) {
        console.error('[validateApiKey] last_used_at update failed:', res.error.message);
      }
    });

  return {
    merchantId: row.merchant_id,
    keyId: row.id,
    rateLimitPerMinute: limit,
    requestIp,
  };
}

/**
 * Validates Authorization: Bearer {api_key}.
 * Returns merchant context or a NextResponse error (401 / 429).
 */
export async function validateApiKey(
  request: NextRequest
): Promise<ValidatedApiKey | NextResponse> {
  const requestIp = getClientIp(request.headers);
  const plaintext = parseBearerToken(request);

  if (!plaintext) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }

  const result = await validateApiKeyPlaintext(plaintext, requestIp);
  if ('status' in result) {
    if (result.status === 429) {
      return NextResponse.json(
        { error: result.message },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return result;
}

export function isValidatedApiKey(
  result: ValidatedApiKey | NextResponse
): result is ValidatedApiKey {
  return !(result instanceof NextResponse);
}
