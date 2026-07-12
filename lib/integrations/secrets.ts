import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '@/lib/utils/env';
import type { IntegrationCredentialPayload } from '@/lib/integrations/types';

function resolveIntegrationCredentialKey(): Buffer {
  const material = env.INTERNAL_HMAC_SECRET ?? env.IDENTITY_SALT;
  return createHash('sha256').update(`integration-credentials:${material}`, 'utf8').digest();
}

export function encryptIntegrationCredentials(payload: IntegrationCredentialPayload): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', resolveIntegrationCredentialKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${encrypted.toString('base64url')}.${tag.toString('base64url')}`;
}

export function decryptIntegrationCredentials(blob: string): IntegrationCredentialPayload {
  const [ivPart, encryptedPart, tagPart] = blob.split('.');
  if (!ivPart || !encryptedPart || !tagPart) {
    throw new Error('invalid_integration_credential_blob');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    resolveIntegrationCredentialKey(),
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  const parsed = JSON.parse(decrypted);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('invalid_integration_credential_payload');
  }
  return parsed as IntegrationCredentialPayload;
}
