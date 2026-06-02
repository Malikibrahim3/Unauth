import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import type { ValidatedApiKey } from '@/lib/api/validateApiKey';
import { makeSignedToken, hashSignedToken } from '@/lib/api/signedAccess';
import { TABLES } from '@/lib/supabase/tables';
import { withV1Cors } from '@/lib/api/v1/cors';

export async function issueEvidenceDownloadUrl(
  request: NextRequest,
  evidenceId: string,
  authResult: ValidatedApiKey,
): Promise<NextResponse> {
  const service = createServiceClient();
  const scoped = createScopedClient(authResult.merchantId, service);

  const { data: evidence } = await scoped
    .from(TABLES.EVIDENCE_PACKAGES)
    .select('id')
    .eq('id', evidenceId)
    .maybeSingle() as unknown as { data: { id: string } | null };

  if (!evidence) {
    return withV1Cors(NextResponse.json({ error: 'Evidence package not found' }, { status: 404 }), request);
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const token = makeSignedToken({
    evidence_id: evidenceId,
    merchant_id: authResult.merchantId,
    expires_at: expiresAt,
  });

  const { error: insertError } = await service
    .from(TABLES.EVIDENCE_DOWNLOAD_TOKENS)
    .insert({
      evidence_id: evidenceId,
      merchant_id: authResult.merchantId,
      token_hash: hashSignedToken(token),
      expires_at: expiresAt,
    });

  if (insertError) {
    return withV1Cors(NextResponse.json({ error: 'Failed to issue download URL' }, { status: 500 }), request);
  }

  const appBase = new URL(request.url).origin;
  return withV1Cors(
    NextResponse.json({
      download_url: `${appBase}/api/v1/evidence/${evidenceId}/download?token=${encodeURIComponent(token)}`,
    }),
    request,
  );
}
