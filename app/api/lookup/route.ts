// TODO(product-gating): require LIVE_LOOKUP_API entitlement when ENFORCE_PRODUCT_GATES is enabled.
import { NextRequest, NextResponse } from 'next/server';
import { performMerchantLookup } from '@/lib/api/lookup/performMerchantLookup';

export async function GET() {
  return NextResponse.json(
    { error: 'Use POST for customer lookup.' },
    { status: 405, headers: { Allow: 'POST' } },
  );
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = await performMerchantLookup(request, {
    email: typeof body.email === 'string' ? body.email : undefined,
    name: typeof body.name === 'string' ? body.name : undefined,
    address: typeof body.address === 'string' ? body.address : undefined,
    card: typeof body.card === 'string' ? body.card : undefined,
    ip: typeof body.ip === 'string' ? body.ip : undefined,
  });

  return NextResponse.json(result.json, { status: result.status });
}
