import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { env } from '@/lib/utils/env';

type SignedPayload = {
  evidence_id?: string;
  profile_id?: string;
  merchant_id: string;
  expires_at: string;
};

function signingSecret(): string {
  const secret = env.PDF_SIGNING_SECRET ?? env.INTERNAL_HMAC_SECRET ?? env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Missing token signing secret');
  return secret;
}

function signPayload(payloadJson: string): string {
  return createHmac('sha256', signingSecret()).update(payloadJson, 'utf8').digest('hex');
}

export function hashSignedToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function makeSignedToken(payload: SignedPayload): string {
  const payloadJson = JSON.stringify(payload);
  const sig = signPayload(payloadJson);
  const envelope = JSON.stringify({ payload, sig });
  return Buffer.from(envelope, 'utf8').toString('base64');
}

export function parseAndVerifySignedToken(token: string): SignedPayload | null {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf8');
    const parsed = JSON.parse(raw) as { payload?: SignedPayload; sig?: string };
    if (!parsed.payload || !parsed.sig) return null;

    const payloadJson = JSON.stringify(parsed.payload);
    const expected = signPayload(payloadJson);
    if (expected.length !== parsed.sig.length) return null;

    const matches = timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(parsed.sig, 'hex'));
    if (!matches) return null;

    return parsed.payload;
  } catch {
    return null;
  }
}
