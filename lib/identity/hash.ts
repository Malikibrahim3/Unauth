import { createHmac } from 'node:crypto';
import { normaliseEmail, normaliseAddress, normalisePhone } from './normalise';
import { env } from '@/lib/utils/env';

// Re-export so existing imports from this file keep working.
export { normaliseEmail, normaliseAddress, normalisePhone };

export function hashIdentifier(value: string): string {
  return createHmac('sha256', env.IDENTITY_SALT).update(value).digest('hex');
}

