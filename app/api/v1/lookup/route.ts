import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { validateApiKey, isValidatedApiKey } from '@/lib/api/validateApiKey';
import { performV1Lookup } from '@/lib/api/v1/lookup';
import { withRequestLogging } from '@/lib/log';

export const dynamic = 'force-dynamic';

async function GETHandler(request: NextRequest) {
  const authResult = await validateApiKey(request);
  if (!isValidatedApiKey(authResult)) return authResult;

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
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.body);
}

export const GET = withRequestLogging('/api/v1/lookup', GETHandler);
