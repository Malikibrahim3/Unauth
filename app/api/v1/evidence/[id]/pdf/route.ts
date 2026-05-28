import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { validateApiKey, isValidatedApiKey } from '@/lib/api/validateApiKey';
import { streamV1EvidencePdf } from '@/lib/api/v1/evidence';
import { withRequestLogging } from '@/lib/log';

export const dynamic = 'force-dynamic';

async function GETHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await validateApiKey(request);
  if (!isValidatedApiKey(authResult)) return authResult;

  const { id } = await params;
  const result = await streamV1EvidencePdf(
    createServiceClient(),
    authResult.merchantId,
    id
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return new NextResponse(result.buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Cache-Control': 'private, no-cache',
    },
  });
}

export const GET = withRequestLogging('/api/v1/evidence/[id]/pdf', GETHandler);
