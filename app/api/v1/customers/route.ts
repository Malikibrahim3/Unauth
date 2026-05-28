import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { validateApiKey, isValidatedApiKey } from '@/lib/api/validateApiKey';
import { performV1CustomerProfile } from '@/lib/api/v1/customers';
import { withRequestLogging } from '@/lib/log';

export const dynamic = 'force-dynamic';

async function GETHandler(request: NextRequest) {
  const authResult = await validateApiKey(request);
  if (!isValidatedApiKey(authResult)) return authResult;

  const email = new URL(request.url).searchParams.get('email')?.trim() ?? '';

  const result = await performV1CustomerProfile(
    createServiceClient(),
    {
      merchantId: authResult.merchantId,
      apiKeyId: authResult.keyId,
      requestIp: authResult.requestIp,
    },
    email
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.body);
}

export const GET = withRequestLogging('/api/v1/customers', GETHandler);
