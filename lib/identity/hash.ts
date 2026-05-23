import { createHmac } from 'node:crypto';
import { normaliseEmail, normaliseAddress } from './normalise';
import { env } from '@/lib/utils/env';

// Re-export so existing imports of normaliseEmail/normaliseAddress from this file keep working.
export { normaliseEmail, normaliseAddress };

export function hashIdentifier(value: string): string {
  return createHmac('sha256', env.IDENTITY_SALT).update(value).digest('hex');
}

export function normalisePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');

  // Too short to be a real phone number
  if (digits.length < 7) return null;

  // For entity-matching purposes we use the last 10 digits as a canonical
  // local number. This is stable across +44 7xxx, 07xxx, +1 (xxx), (xxx)-xxx,
  // +61 4xxx, etc. — the suffix is identical regardless of country prefix.
  // Full E.164 reconstruction is not needed because we only compare the value
  // against other values normalised the same way.
  const canonical = digits.slice(-10);
  return canonical;
}
