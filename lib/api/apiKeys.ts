import { createHash, randomBytes } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import {
  generateWidgetTokenPlaintext,
  hashWidgetToken,
  widgetTokenDisplayPrefix,
} from '@/lib/api/widgetTokens';

export const API_KEY_PREFIX = 'unauth_sk_';
const RANDOM_SEGMENT_LENGTH = 32;

/** Generate a new API key (plaintext). Store only the hash in the database. */
export function generateApiKeyPlaintext(): string {
  const random = randomBytes(Math.ceil(RANDOM_SEGMENT_LENGTH / 2))
    .toString('hex')
    .slice(0, RANDOM_SEGMENT_LENGTH);
  return `${API_KEY_PREFIX}${random}`;
}

/** SHA-256 hash of the full API key string. */
export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

/** Display prefix: first 8 characters of the random segment after unauth_sk_. */
export function apiKeyDisplayPrefix(plaintext: string): string {
  const suffix = plaintext.startsWith(API_KEY_PREFIX)
    ? plaintext.slice(API_KEY_PREFIX.length)
    : plaintext;
  const segment = suffix.slice(0, 8);
  return `${API_KEY_PREFIX}${segment}...`;
}

export function isValidApiKeyFormat(plaintext: string): boolean {
  if (!plaintext.startsWith(API_KEY_PREFIX)) return false;
  const suffix = plaintext.slice(API_KEY_PREFIX.length);
  return /^[a-f0-9]{32}$/i.test(suffix);
}

export type CreatedMerchantApiKey = {
  id: string;
  secret: string;
  keyPrefix: string;
  widgetToken: string;
  widgetTokenPrefix: string;
  row: {
    id: string;
    key_prefix: string;
    name: string;
    created_at: string;
    rate_limit_per_minute: number;
  };
};

/**
 * Mint a new merchant API key together with its paired widget token, persisting
 * both. Returns the plaintext secrets (shown once) or null on failure. The key
 * and widget token are created atomically — if the widget token insert fails the
 * key row is rolled back.
 */
export async function createMerchantApiKey(
  service: ReturnType<typeof createServiceClient>,
  merchantId: string,
  name: string
): Promise<CreatedMerchantApiKey | null> {
  const plaintext = generateApiKeyPlaintext();
  const keyHash = hashApiKey(plaintext);
  const keyPrefix = apiKeyDisplayPrefix(plaintext);
  const widgetToken = generateWidgetTokenPlaintext();
  const widgetTokenHash = hashWidgetToken(widgetToken);
  const widgetTokenPrefix = widgetTokenDisplayPrefix(widgetToken);

  const { data: inserted, error } = await service
    .from(TABLES.MERCHANT_API_KEYS)
    .insert({
      merchant_id: merchantId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name,
    })
    .select('id, key_prefix, name, created_at, rate_limit_per_minute')
    .single();

  if (error || !inserted) return null;
  const insertedKey = inserted as CreatedMerchantApiKey['row'];

  const { error: widgetError } = await service
    .from(TABLES.MERCHANT_WIDGET_TOKENS)
    .insert({
      merchant_id: merchantId,
      api_key_id: insertedKey.id,
      token_hash: widgetTokenHash,
      token_prefix: widgetTokenPrefix,
    });

  if (widgetError) {
    await service.from(TABLES.MERCHANT_API_KEYS).delete().eq('id', insertedKey.id);
    return null;
  }

  return {
    id: insertedKey.id,
    secret: plaintext,
    keyPrefix,
    widgetToken,
    widgetTokenPrefix,
    row: insertedKey,
  };
}
