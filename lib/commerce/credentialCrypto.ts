import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '@/lib/utils/env';

export type WooCommerceRestCredentials = {
  consumer_key: string;
  consumer_secret: string;
};

function resolveCredentialKey(): Buffer {
  const material = env.INTERNAL_HMAC_SECRET ?? env.IDENTITY_SALT;
  return createHash('sha256').update(`commerce-rest-credentials:${material}`, 'utf8').digest();
}

export function encryptWooCommerceCredentials(credentials: WooCommerceRestCredentials): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', resolveCredentialKey(), iv);
  const payload = JSON.stringify({
    consumer_key: credentials.consumer_key.trim(),
    consumer_secret: credentials.consumer_secret.trim(),
  });
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${encrypted.toString('base64url')}.${tag.toString('base64url')}`;
}

export function decryptWooCommerceCredentials(blob: string): WooCommerceRestCredentials {
  const [ivPart, encryptedPart, tagPart] = blob.split('.');
  if (!ivPart || !encryptedPart || !tagPart) {
    throw new Error('invalid_commerce_credential_blob');
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

  const parsed = JSON.parse(decrypted) as { consumer_key?: unknown; consumer_secret?: unknown };
  if (typeof parsed.consumer_key !== 'string' || !parsed.consumer_key.trim()) {
    throw new Error('invalid_commerce_credential_payload');
  }
  if (typeof parsed.consumer_secret !== 'string' || !parsed.consumer_secret.trim()) {
    throw new Error('invalid_commerce_credential_payload');
  }

  return {
    consumer_key: parsed.consumer_key.trim(),
    consumer_secret: parsed.consumer_secret.trim(),
  };
}

export type BigCommerceOAuthCredentials = {
  access_token: string;
  scope?: string | null;
};

function resolveOAuthCredentialKey(): Buffer {
  const material = env.INTERNAL_HMAC_SECRET ?? env.IDENTITY_SALT;
  return createHash('sha256').update(`commerce-oauth-credentials:${material}`, 'utf8').digest();
}

export function encryptBigCommerceOAuthCredentials(
  credentials: BigCommerceOAuthCredentials,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', resolveOAuthCredentialKey(), iv);
  const payload = JSON.stringify({
    access_token: credentials.access_token.trim(),
    scope: credentials.scope?.trim() ?? null,
  });
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${encrypted.toString('base64url')}.${tag.toString('base64url')}`;
}

export function decryptBigCommerceOAuthCredentials(blob: string): BigCommerceOAuthCredentials {
  const [ivPart, encryptedPart, tagPart] = blob.split('.');
  if (!ivPart || !encryptedPart || !tagPart) {
    throw new Error('invalid_bigcommerce_credential_blob');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    resolveOAuthCredentialKey(),
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');

  const parsed = JSON.parse(decrypted) as { access_token?: unknown; scope?: unknown };
  if (typeof parsed.access_token !== 'string' || !parsed.access_token.trim()) {
    throw new Error('invalid_bigcommerce_credential_payload');
  }

  return {
    access_token: parsed.access_token.trim(),
    scope: typeof parsed.scope === 'string' ? parsed.scope.trim() : null,
  };
}
