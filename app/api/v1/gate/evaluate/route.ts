import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { isValidatedApiKey, validateApiKey } from '@/lib/api/validateApiKey';
import { evaluatePublicGate, PublicGateError } from '@/lib/claim-gate/publicGate';
import {
  isPublicClaimGateEnabled,
  publicClaimGateUnavailableBody,
} from '@/lib/claim-gate/releaseGate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  claim_type: z.enum([
    'delivered_not_received',
    'item_not_received',
    'refund_after_shipment',
    'missing_item',
    'damaged_item',
    'wrong_item',
  ]),
  order_id: z.string().trim().optional(),
  order_name: z.string().trim().optional(),
  ticket_id: z.string().trim().optional(),
  platform: z.enum(['gorgias', 'zendesk', 'freshdesk', 'yuma', 'siena', 'other']).optional().default('other'),
  customer_message: z.string().trim().optional(),
  requested_action: z.enum(['refund', 'reship', 'replacement', 'credit', 'unknown']).optional().default('unknown'),
  idempotency_key: z.string().trim().optional(),
}).refine((value) => Boolean(value.order_id || value.order_name), {
  message: 'Provide order_id or order_name',
});

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request, 'cases:write');
  if (!isValidatedApiKey(auth)) return auth;
  if (!isPublicClaimGateEnabled()) {
    return NextResponse.json(publicClaimGateUnavailableBody(), {
      status: 503,
      headers: { 'Retry-After': '3600' },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', message: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 422 },
    );
  }

  try {
    const response = await evaluatePublicGate({
      client: createServiceClient(),
      payload: {
        merchantId: auth.merchantId,
        ...parsed.data,
        source: 'api',
        apply_gorgias_hold: false,
      },
    });
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof PublicGateError) {
      return NextResponse.json(error.response ?? { error: error.message }, { status: error.status });
    }
    console.error('v1_gate_evaluate_failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'gate_evaluation_failed' }, { status: 500 });
  }
}
