import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { isValidatedApiKey, validateApiKey } from '@/lib/api/validateApiKey';
import { evaluatePublicGate, PublicGateError } from '@/lib/claim-gate/publicGate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  platform: z.enum(['yuma', 'siena', 'other']),
  platform_ticket_id: z.string().trim().min(1),
  platform_conversation_id: z.string().trim().optional(),
  claim_type: z.string().trim().optional(),
  escalation_reason: z.string().trim().optional(),
  ai_analysis_summary: z.string().trim().optional(),
  requested_action: z.string().trim().optional(),
  order_id: z.string().trim().optional(),
  order_name: z.string().trim().optional(),
  customer_email: z.string().trim().email().optional(),
  conversation_text: z.string().trim().optional(),
}).refine((value) => Boolean(value.order_id || value.order_name), {
  message: 'Provide order_id or order_name',
});

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!isValidatedApiKey(auth)) return auth;

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
        platform: parsed.data.platform,
        ticket_id: parsed.data.platform_ticket_id,
        idempotency_key: parsed.data.platform_conversation_id ?? parsed.data.platform_ticket_id,
        claim_type: parsed.data.claim_type,
        escalation_reason: parsed.data.escalation_reason,
        ai_analysis_summary: parsed.data.ai_analysis_summary,
        requested_action: parsed.data.requested_action,
        order_id: parsed.data.order_id,
        order_name: parsed.data.order_name,
        customer_email: parsed.data.customer_email,
        conversation_text: parsed.data.conversation_text,
        source: 'escalation',
        apply_gorgias_hold: false,
      },
    });
    return NextResponse.json({ ...response, handoff_accepted: true });
  } catch (error) {
    if (error instanceof PublicGateError) {
      const body = error.response ? { ...error.response, handoff_accepted: true } : { error: error.message };
      return NextResponse.json(body, { status: error.status });
    }
    console.error('v1_gate_escalation_failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'gate_escalation_failed' }, { status: 500 });
  }
}
