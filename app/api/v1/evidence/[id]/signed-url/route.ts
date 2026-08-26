import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, isValidatedApiKey } from '@/lib/api/validateApiKey';
import { issueEvidenceDownloadUrl } from '@/lib/api/v1/issueEvidenceDownloadUrl';
import { v1OptionsResponse, withV1Cors } from '@/lib/api/v1/cors';
import { withRequestLogging } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return v1OptionsResponse(request);
}

export async function GET(request: NextRequest) {
  return withV1Cors(
    NextResponse.json(
      { error: 'Use POST to issue a signed download URL.' },
      { status: 405, headers: { Allow: 'POST' } },
    ),
    request,
  );
}

async function POSTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await validateApiKey(request, 'evidence:read');
  if (!isValidatedApiKey(authResult)) return withV1Cors(authResult, request);

  const { id } = await params;
  return issueEvidenceDownloadUrl(request, id, authResult);
}

export const POST = withRequestLogging('/api/v1/evidence/[id]/signed-url', POSTHandler);
