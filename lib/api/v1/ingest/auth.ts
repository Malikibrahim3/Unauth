/**
 * Canonical intake authentication. Wraps the existing merchant API-key
 * validation; the merchant is derived from the credential, never from the
 * request body (a caller-supplied merchant_id is not authority).
 *
 * See ARCHITECTURE.md §7.1.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { validateApiKey, isValidatedApiKey, type ValidatedApiKey } from '@/lib/api/validateApiKey';
import type { ApiScope } from '@/lib/api/accessPolicy';

export type IngestAuth = { merchantId: string; keyId: string };

/** Returns the resolved merchant auth, or a NextResponse to return directly. */
export async function authenticateIngest(req: NextRequest, requiredScope: Extract<ApiScope, 'imports:read' | 'imports:write'>): Promise<IngestAuth | NextResponse> {
  const result: ValidatedApiKey | NextResponse = await validateApiKey(req, requiredScope);
  if (!isValidatedApiKey(result)) return result;
  return { merchantId: result.merchantId, keyId: result.keyId };
}

/** Max canonical intake body size (bytes). */
export const MAX_INGEST_BODY_BYTES = 512 * 1024;

export function tooLargeResponse(): NextResponse {
  return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
}
