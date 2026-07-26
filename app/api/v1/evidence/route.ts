import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { validateApiKey, isValidatedApiKey } from '@/lib/api/validateApiKey';
import { performV1EvidenceCreate } from '@/lib/api/v1/evidence';
import { v1OptionsResponse, withV1Cors } from '@/lib/api/v1/cors';
import { withRequestLogging } from '@/lib/log';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function OPTIONS(request: NextRequest) {
  return v1OptionsResponse(request);
}

async function POSTHandler(request: NextRequest) {
  const authResult = await validateApiKey(request);
  if (!isValidatedApiKey(authResult)) return withV1Cors(authResult, request);

  let body: {
    email?: string;
    order_id?: string;
    disputed_amount?: number;
    currency?: string;
  };
  try {
    body = await request.json();
  } catch {
    return withV1Cors(NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }), request);
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
    return withV1Cors(
      NextResponse.json(
        {
          error: result.error,
          ...(result.detail ? { detail: result.detail } : {}),
          ...(result.requiredCredits != null
            ? { requiredCredits: result.requiredCredits }
            : {}),
          ...(result.remainingCredits !== undefined
            ? { remainingCredits: result.remainingCredits }
            : {}),
        },
        { status: result.status }
      ),
      request
    );
  }
  return withV1Cors(NextResponse.json(result.body, { status: 201 }), request);
}

export const POST = withRequestLogging('/api/v1/evidence', POSTHandler);
