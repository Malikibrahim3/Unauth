import { createHash, randomBytes } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';

const WIDGET_TOKEN_PREFIX = 'unauth_wt_';
const RANDOM_SEGMENT_LENGTH = 32;

export function generateWidgetTokenPlaintext(): string {
  const random = randomBytes(Math.ceil(RANDOM_SEGMENT_LENGTH / 2))
    .toString('hex')
    .slice(0, RANDOM_SEGMENT_LENGTH);
  return `${WIDGET_TOKEN_PREFIX}${random}`;
}

export function hashWidgetToken(plaintext: string): string {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

export function widgetTokenDisplayPrefix(plaintext: string): string {
  const suffix = plaintext.startsWith(WIDGET_TOKEN_PREFIX)
    ? plaintext.slice(WIDGET_TOKEN_PREFIX.length)
    : plaintext;
  return `${WIDGET_TOKEN_PREFIX}${suffix.slice(0, 8)}...`;
}

export function isValidWidgetTokenFormat(plaintext: string): boolean {
  if (!plaintext.startsWith(WIDGET_TOKEN_PREFIX)) return false;
  return /^[a-f0-9]{32}$/i.test(plaintext.slice(WIDGET_TOKEN_PREFIX.length));
}

export type ValidatedWidgetToken = {
  merchantId: string;
  apiKeyId: string;
  tokenId: string;
};

export async function validateWidgetToken(
  plaintext: string
): Promise<ValidatedWidgetToken | { status: 401; message: string } | { status: 500; message: string }> {
  const token = plaintext.trim();
  if (!token) return { status: 401, message: 'Widget token is required' };
  if (!isValidWidgetTokenFormat(token)) return { status: 401, message: 'Invalid widget token' };

  const service = createServiceClient();
  const tokenHash = hashWidgetToken(token);

  const { data, error } = await service
    .from(TABLES.MERCHANT_WIDGET_TOKENS)
    .select('id, merchant_id, api_key_id, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle() as unknown as {
    data: { id: string; merchant_id: string; api_key_id: string; revoked_at: string | null } | null;
    error: { message: string } | null;
  };

  if (error) {
    return { status: 500, message: 'Widget token validation failed' };
  }
  if (!data || data.revoked_at) {
    return { status: 401, message: 'Invalid or revoked widget token' };
  }

  if (!data.api_key_id) {
    return { status: 401, message: 'Invalid or revoked widget token' };
  }

  const { data: apiKey, error: apiKeyError } = await service
    .from(TABLES.MERCHANT_API_KEYS)
    .select('id, merchant_id, revoked_at')
    .eq('id', data.api_key_id)
    .eq('merchant_id', data.merchant_id)
    .maybeSingle() as unknown as {
    data: { id: string; merchant_id: string; revoked_at: string | null } | null;
    error: { message: string } | null;
  };

  if (apiKeyError) {
    return { status: 500, message: 'Widget token validation failed' };
  }
  if (!apiKey || apiKey.revoked_at) {
    return { status: 401, message: 'Invalid or revoked widget token' };
  }

  return {
    merchantId: data.merchant_id,
    apiKeyId: data.api_key_id,
    tokenId: data.id,
  };
}
