import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { validateApiKey, isValidatedApiKey } from '@/lib/api/validateApiKey';
import { performV1EvidenceCreate } from '@/lib/api/v1/evidence';
import { withRequestLogging } from '@/lib/log';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function POSTHandler(request: NextRequest) {
  const authResult = await validateApiKey(request);
  if (!isValidatedApiKey(authResult)) return authResult;

  let body: {
    email?: string;
    order_id?: string;
    disputed_amount?: number;
    currency?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = await performV1EvidenceCreate(
    createServiceClient(),
    {
      merchantId: authResult.merchantId,
      apiKeyId: authResult.keyId,
      requestIp: authResult.requestIp,
    },
    {
      email: body.email ?? '',
      orderId: body.order_id ?? '',
      disputedAmount: body.disputed_amount,
      currency: body.currency,
    }
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.detail ? { detail: result.detail } : {}) },
      { status: result.status }
    );
  }
  return NextResponse.json(result.body, { status: 201 });
}

export const POST = withRequestLogging('/api/v1/evidence', POSTHandler);
