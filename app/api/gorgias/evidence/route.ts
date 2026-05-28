import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { validateApiKeyPlaintext } from '@/lib/api/validateApiKey';
import { getClientIp } from '@/lib/ratelimit';
import { performV1EvidenceCreate } from '@/lib/api/v1/evidence';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GORGIAS_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: GORGIAS_CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const requestIp = getClientIp(request.headers);

  let body: {
    api_key?: string;
    email?: string;
    order_id?: string;
    disputed_amount?: number;
    currency?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400, headers: GORGIAS_CORS_HEADERS }
    );
  }

  const apiKey = body.api_key?.trim() ?? '';
  const email = body.email?.trim() ?? '';
  const orderId = body.order_id?.trim() ?? '';

  if (!apiKey || !email || !orderId) {
    return NextResponse.json(
      { error: 'api_key, email, and order_id are required' },
      { status: 400, headers: GORGIAS_CORS_HEADERS }
    );
  }

  const authResult = await validateApiKeyPlaintext(apiKey, requestIp);
  if ('status' in authResult) {
    return NextResponse.json(
      { error: authResult.message },
      { status: authResult.status, headers: GORGIAS_CORS_HEADERS }
    );
  }

  const service = createServiceClient();
  const result = await performV1EvidenceCreate(
    service,
    {
      merchantId: authResult.merchantId,
      apiKeyId: authResult.keyId,
      requestIp: authResult.requestIp,
    },
    {
      email,
      orderId,
      disputedAmount: body.disputed_amount,
      currency: body.currency,
    }
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.detail ? { detail: result.detail } : {}) },
      { status: result.status, headers: GORGIAS_CORS_HEADERS }
    );
  }

  const evidence = result.body;
  return NextResponse.json(
    {
      pdf_url: evidence.pdf_url,
      reference: evidence.reference,
      evidence_id: evidence.evidence_id,
    },
    { status: 201, headers: GORGIAS_CORS_HEADERS }
  );
}
