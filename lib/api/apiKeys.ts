import { createHash, randomBytes } from 'crypto';

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
