import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '@/lib/utils/env';

export type ZendeskApiCredentials = {
  email: string;
  api_token: string;
};

function resolveCredentialKey(): Buffer {
  const material = env.INTERNAL_HMAC_SECRET ?? env.IDENTITY_SALT;
  return createHash('sha256').update(`zendesk-api-credentials:${material}`, 'utf8').digest();
}

export function encryptZendeskApiCredentials(credentials: ZendeskApiCredentials): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', resolveCredentialKey(), iv);
  const payload = JSON.stringify({
    email: credentials.email.trim(),
    api_token: credentials.api_token.trim(),
  });
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${encrypted.toString('base64url')}.${tag.toString('base64url')}`;
}

export function decryptZendeskApiCredentials(blob: string): ZendeskApiCredentials {
  const [ivPart, encryptedPart, tagPart] = blob.split('.');
  if (!ivPart || !encryptedPart || !tagPart) {
    throw new Error('invalid_zendesk_credential_blob');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    resolveCredentialKey(),
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');

  const parsed = JSON.parse(decrypted) as { email?: unknown; api_token?: unknown };
  if (typeof parsed.email !== 'string' || typeof parsed.api_token !== 'string') {
    throw new Error('invalid_zendesk_credential_payload');
  }
  if (!parsed.email.trim() || !parsed.api_token.trim()) {
    throw new Error('invalid_zendesk_credential_payload');
  }

  return {
    email: parsed.email.trim(),
    api_token: parsed.api_token.trim(),
  };
}
