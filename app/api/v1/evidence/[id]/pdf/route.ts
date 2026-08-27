import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { validateApiKey, isValidatedApiKey } from '@/lib/api/validateApiKey';
import { streamV1EvidencePdf } from '@/lib/api/v1/evidence';
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
  const authResult = await validateApiKey(request, 'evidence:read');
  if (!isValidatedApiKey(authResult)) return withV1Cors(authResult, request);

  const { id } = await params;
  const result = await streamV1EvidencePdf(
    createServiceClient(),
    authResult.merchantId,
    id
  );

  if (!result.ok) {
    return withV1Cors(
      NextResponse.json({ error: result.error }, { status: result.status }),
      request
    );
  }

  return withV1Cors(
    new NextResponse(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'private, no-cache',
      },
    }),
    request
  );
}

export const GET = withRequestLogging('/api/v1/evidence/[id]/pdf', GETHandler);
