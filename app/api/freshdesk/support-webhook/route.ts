import { NextRequest, NextResponse } from 'next/server';
import {
  FreshdeskWebhookError,
  extractFreshdeskTicketPayload,
  ingestFreshdeskSupportWebhook,
} from '@/lib/support/freshdesk/ingestWebhook';
import { extractFreshdeskAccountIdentity } from '@/lib/support/freshdesk/accountIdentity';
import { readFreshdeskWebhookSecret } from '@/lib/support/freshdesk/webhookAuth';
import { FRESHDESK_WEBHOOK_DOMAIN_QUERY_PARAM } from '@/lib/support/freshdesk/supportConnectionShared';
import { logGorgiasWebhookResult } from '@/lib/support/intake/webhookLog';
import { enforceRateLimit, getClientIp, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';

function safeWebhookRejectionContext(request: NextRequest, body: unknown): Record<string, unknown> {
  let ticket: Record<string, unknown> | null = null;
  try {
    ticket = extractFreshdeskTicketPayload(body);
  } catch {
    ticket = null;
  }

  const identity = extractFreshdeskAccountIdentity(
    request.headers,
    body,
    new URL(request.url).searchParams
  );

  return {
    has_ticket_id: Boolean(ticket && ticket.id != null),
    identity_source: identity?.source ?? null,
    has_domain_query: new URL(request.url).searchParams.has(FRESHDESK_WEBHOOK_DOMAIN_QUERY_PARAM),
    has_secret_header: Boolean(readFreshdeskWebhookSecret(request.headers, null)),
    has_secret_query: new URL(request.url).searchParams.has('unauth_whsec'),
  };
}

function formatWebhookLogError(message: string, context: Record<string, unknown>): string {
  const parts = Object.entries(context)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`);
  return parts.length > 0 ? `${message} (${parts.join(', ')})` : message;
}

export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Unauth Freshdesk support webhook - POST ticket events here.',
  });
}

function safeExternalCaseId(body: unknown): string | null {
  try {
    const ticket = extractFreshdeskTicketPayload(body);
    const id = ticket.id;
    return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const rateLimitIdentity =
    request.headers.get('x-freshdesk-domain') ??
    searchParams.get(FRESHDESK_WEBHOOK_DOMAIN_QUERY_PARAM) ??
    getClientIp(request.headers);
  const limited = await enforceRateLimit(
    rateLimitKey('webhook', 'freshdesk', rateLimitIdentity),
    limitFromEnv('FRESHDESK_WEBHOOK_RATE_LIMIT', 1000, 60)
  );
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    await logGorgiasWebhookResult({
      provider: 'freshdesk',
      status: 'validation_error',
      http_status: 400,
      error: 'invalid_json',
    });
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  try {
    const result = await ingestFreshdeskSupportWebhook({
      headers: request.headers,
      body,
      requestUrl: request.url,
    });
    await logGorgiasWebhookResult({
      provider: 'freshdesk',
      status: 'success',
      http_status: 200,
      merchant_id: result.merchant_id,
      external_case_id: result.external_case_id,
      is_claim: result.is_claim,
      claim_type: result.claim_type,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof FreshdeskWebhookError) {
      const rejectionContext = safeWebhookRejectionContext(request, body);
      await logGorgiasWebhookResult({
        provider: 'freshdesk',
        status: error.status >= 500 ? 'error' : 'validation_error',
        http_status: error.status,
        external_case_id: safeExternalCaseId(body),
        error: formatWebhookLogError(error.message, rejectionContext),
      });
      return NextResponse.json(
        { ok: false, error: error.message, rejection: rejectionContext },
        { status: error.status }
      );
    }
    await logGorgiasWebhookResult({
      provider: 'freshdesk',
      status: 'error',
      http_status: 500,
      external_case_id: safeExternalCaseId(body),
      error: 'ingest_failed',
    });
    return NextResponse.json({ ok: false, error: 'ingest_failed' }, { status: 500 });
  }
}
