import { NextRequest, NextResponse } from 'next/server';
import {
  GorgiasWebhookError,
  extractGorgiasTicketPayload,
  ingestGorgiasSupportWebhook,
} from '@/lib/support/gorgias/ingestWebhook';
import { extractGorgiasAccountIdentity } from '@/lib/support/gorgias/accountIdentity';
import { readGorgiasWebhookSecret } from '@/lib/support/gorgias/webhookAuth';
import {
  GORGIAS_WEBHOOK_DOMAIN_QUERY_PARAM,
  GORGIAS_WEBHOOK_SECRET_QUERY_PARAM,
} from '@/lib/support/gorgias/supportConnectionShared';
import { getActiveGorgiasMerchantApiAccess } from '@/lib/support/gorgias/merchantApiAccess';
import { nudgeGorgiasTicketWidgetRefreshBestEffort } from '@/lib/support/gorgias/widgetRefreshNudge';
import { logGorgiasWebhookResult } from '@/lib/support/intake/webhookLog';
import { enforceRateLimit, getClientIp, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';
import { createServiceClient } from '@/lib/supabase/server';

function safeWebhookRejectionContext(request: NextRequest, body: unknown): Record<string, unknown> {
  let ticket: Record<string, unknown> | null = null;
  try {
    ticket = extractGorgiasTicketPayload(body);
  } catch {
    ticket = null;
  }

  const identity = extractGorgiasAccountIdentity(
    request.headers,
    body,
    ticket ?? {},
    new URL(request.url).searchParams
  );

  return {
    has_ticket_id: Boolean(ticket && (typeof ticket.id === 'string' || typeof ticket.id === 'number')),
    ticket_uri_kind:
      ticket && typeof ticket.uri === 'string'
        ? ticket.uri.startsWith('http')
          ? 'absolute'
          : ticket.uri.startsWith('/')
            ? 'relative'
            : 'other'
        : 'missing',
    identity_source: identity?.source ?? null,
    has_domain_query: new URL(request.url).searchParams.has(GORGIAS_WEBHOOK_DOMAIN_QUERY_PARAM),
    has_secret_header: Boolean(readGorgiasWebhookSecret(request.headers, null)),
    has_secret_query: new URL(request.url).searchParams.has(GORGIAS_WEBHOOK_SECRET_QUERY_PARAM),
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
  // Service-role access is protected by secret/HMAC-style webhook verification inside ingestGorgiasSupportWebhook.
  const searchParams = new URL(request.url).searchParams;
  const rateLimitIdentity =
    request.headers.get('x-gorgias-account-id') ??
    request.headers.get('x-gorgias-domain') ??
    searchParams.get(GORGIAS_WEBHOOK_DOMAIN_QUERY_PARAM) ??
    getClientIp(request.headers);
  const limited = await enforceRateLimit(
    rateLimitKey('webhook', 'gorgias', rateLimitIdentity),
    limitFromEnv('GORGIAS_WEBHOOK_RATE_LIMIT', 1000, 60)
  );
  if (limited) return limited;

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
      requestUrl: request.url,
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
    const access = await getActiveGorgiasMerchantApiAccess(
      createServiceClient(),
      result.merchant_id
    );
    if (access) {
      await nudgeGorgiasTicketWidgetRefreshBestEffort({
        ...access,
        ticketId: result.external_case_id,
        reason: 'support_webhook_ingested',
        payload: {
          event: 'support_webhook_ingested',
          ticket_id: result.external_case_id,
          is_claim: result.is_claim,
          claim_type: result.claim_type,
          // Each ingested Gorgias event should be eligible to refresh after the throttle window.
          ingested_at: new Date().toISOString(),
        },
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof GorgiasWebhookError) {
      const rejectionContext = safeWebhookRejectionContext(request, body);
      await logGorgiasWebhookResult({
        provider: 'gorgias',
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
      provider: 'gorgias',
      status: 'error',
      http_status: 500,
      external_case_id: safeExternalCaseId(body),
      error: 'ingest_failed',
    });
    return NextResponse.json({ ok: false, error: 'ingest_failed' }, { status: 500 });
  }
}
