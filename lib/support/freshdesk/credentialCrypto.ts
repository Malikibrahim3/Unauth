import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '@/lib/utils/env';

export type FreshdeskApiCredentials = {
  api_key: string;
};

function resolveCredentialKey(): Buffer {
  const material = env.INTERNAL_HMAC_SECRET ?? env.IDENTITY_SALT;
  return createHash('sha256').update(`freshdesk-api-credentials:${material}`, 'utf8').digest();
}

export function encryptFreshdeskApiCredentials(credentials: FreshdeskApiCredentials): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', resolveCredentialKey(), iv);
  const payload = JSON.stringify({
    api_key: credentials.api_key.trim(),
  });
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${encrypted.toString('base64url')}.${tag.toString('base64url')}`;
}

export function decryptFreshdeskApiCredentials(blob: string): FreshdeskApiCredentials {
  const [ivPart, encryptedPart, tagPart] = blob.split('.');
  if (!ivPart || !encryptedPart || !tagPart) {
    throw new Error('invalid_freshdesk_credential_blob');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    resolveCredentialKey(),
    Buffer.from(ivPart, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');

  const parsed = JSON.parse(decrypted) as { api_key?: unknown };
  if (typeof parsed.api_key !== 'string' || !parsed.api_key.trim()) {
    throw new Error('invalid_freshdesk_credential_payload');
  }

  return { api_key: parsed.api_key.trim() };
}
