import { NextRequest, NextResponse } from 'next/server';
import {
  GorgiasWebhookError,
  extractGorgiasTicketPayload,
  ingestGorgiasSupportWebhook,
} from '@/lib/support/gorgias/ingestWebhook';
import { logGorgiasWebhookResult } from '@/lib/support/intake/webhookLog';

export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Unauth Gorgias support webhook - POST events here.',
  });
}

/** Best-effort external_case_id extraction for logging error paths. */
function safeExternalCaseId(body: unknown): string | null {
  try {
    const ticket = extractGorgiasTicketPayload(body);
    const id = ticket.id;
    return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    await logGorgiasWebhookResult({ provider: 'gorgias', status: 'validation_error', http_status: 400, error: 'invalid_json' });
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  try {
    const result = await ingestGorgiasSupportWebhook({
      headers: request.headers,
      body,
    });
    await logGorgiasWebhookResult({
      provider: 'gorgias',
      status: 'success',
      http_status: 200,
      merchant_id: result.merchant_id,
      external_case_id: result.external_case_id,
      is_claim: result.is_claim,
      claim_type: result.claim_type,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof GorgiasWebhookError) {
      await logGorgiasWebhookResult({
        provider: 'gorgias',
        status: error.status >= 500 ? 'error' : 'validation_error',
        http_status: error.status,
        external_case_id: safeExternalCaseId(body),
        error: error.message,
      });
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    await logGorgiasWebhookResult({
      provider: 'gorgias',
      status: 'error',
      http_status: 500,
      external_case_id: safeExternalCaseId(body),
      error: 'ingest_failed',
    });
    return NextResponse.json({ ok: false, error: 'ingest_failed' }, { status: 500 });
  }
}
