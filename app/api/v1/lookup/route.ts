import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { validateApiKey, isValidatedApiKey } from '@/lib/api/validateApiKey';
import { performV1Lookup } from '@/lib/api/v1/lookup';
import { v1OptionsResponse, withV1Cors } from '@/lib/api/v1/cors';
import { withRequestLogging } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return v1OptionsResponse(request);
}

async function GETHandler(request: NextRequest) {
  const authResult = await validateApiKey(request);
  if (!isValidatedApiKey(authResult)) return withV1Cors(authResult, request);

  const { searchParams } = new URL(request.url);
  const result = await performV1Lookup(
    createServiceClient(),
    {
      merchantId: authResult.merchantId,
      apiKeyId: authResult.keyId,
      requestIp: authResult.requestIp,
    },
    {
      rawEmail: searchParams.get('email')?.trim() ?? '',
      rawName: searchParams.get('name')?.trim() ?? '',
      rawAddress: searchParams.get('address')?.trim() ?? '',
      rawCard: searchParams.get('card')?.trim() ?? '',
      rawIp: searchParams.get('ip')?.trim() ?? '',
    }
  );

  if (!result.ok) {
    return withV1Cors(
      NextResponse.json({ error: result.error }, { status: result.status }),
      request
    );
  }
  return withV1Cors(NextResponse.json(result.body), request);
}

export const GET = withRequestLogging('/api/v1/lookup', GETHandler);
