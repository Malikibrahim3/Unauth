import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { validateApiKey, isValidatedApiKey } from '@/lib/api/validateApiKey';
import { makeSignedToken, hashSignedToken } from '@/lib/api/signedAccess';
import { TABLES } from '@/lib/supabase/tables';
import { v1OptionsResponse, withV1Cors } from '@/lib/api/v1/cors';
import { withRequestLogging } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return v1OptionsResponse(request);
}

async function GETHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await validateApiKey(request);
  if (!isValidatedApiKey(authResult)) return withV1Cors(authResult, request);

  const { id } = await params;
  const service = createServiceClient();
  const scoped = createScopedClient(authResult.merchantId, service);

  const { data: evidence } = await scoped
    .from(TABLES.EVIDENCE_PACKAGES)
    .select('id')
    .eq('id', id)
    .maybeSingle() as unknown as { data: { id: string } | null };

  if (!evidence) {
    return withV1Cors(NextResponse.json({ error: 'Evidence package not found' }, { status: 404 }), request);
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const token = makeSignedToken({
    evidence_id: id,
    merchant_id: authResult.merchantId,
    expires_at: expiresAt,
  });

  const { error: insertError } = await service
    .from(TABLES.EVIDENCE_DOWNLOAD_TOKENS)
    .insert({
      evidence_id: id,
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
      download_url: `${appBase}/api/v1/evidence/${id}/download?token=${encodeURIComponent(token)}`,
    }),
    request
  );
}

export const GET = withRequestLogging('/api/v1/evidence/[id]/signed-url', GETHandler);
