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
import { evaluatePublicGate } from '@/lib/claim-gate/publicGate';
import { resolveGorgiasTicketCustomerEmail } from '@/lib/support/gorgias/ticketCustomerEmail';
import type { SupabaseClient } from '@supabase/supabase-js';

type GateOrderReference = {
  id: string;
  external_id: string;
  order_number: string | null;
  placed_at: string | null;
  ingested_at: string | null;
};

export async function resolveUnambiguousEmailOrder(
  client: SupabaseClient,
  merchantId: string,
  email: string,
): Promise<GateOrderReference | null> {
  const { data, error } = await client
    .from('source_orders')
    .select('id,external_id,order_number,placed_at,ingested_at')
    .eq('merchant_id', merchantId)
    .ilike('email', email)
    .order('placed_at', { ascending: false, nullsFirst: false })
    .order('ingested_at', { ascending: false, nullsFirst: false })
    .limit(2);
  if (error) throw new Error(`gorgias_email_order_lookup_failed: ${error.message}`);

  const orders = (data ?? []) as GateOrderReference[];
  const newest = orders[0];
  if (!newest) return null;
  const newestAt = newest.placed_at ?? newest.ingested_at;
  const newestMs = newestAt ? Date.parse(newestAt) : Number.NaN;
  if (!Number.isFinite(newestMs)) return null;

  const second = orders[1];
  const secondAt = second ? second.placed_at ?? second.ingested_at : null;
  const secondMs = secondAt ? Date.parse(secondAt) : Number.NaN;
  if (second && (!Number.isFinite(secondMs) || secondMs === newestMs)) return null;
  return newest;
}

// Map a support-classified claim type to a claim-gate type. Returns null for
// anything we can't confidently map, so the caller SKIPS auto gate-evaluation
// and leaves the ticket for manual review — instead of silently forcing every
// unrecognised claim into `item_not_received`.
function gateClaimTypeFromSupport(value: string | null): string | null {
  switch (value) {
    case 'INR':
      return 'item_not_received';
    case 'damaged':
      return 'damaged_item';
    case 'wrong_item':
      return 'wrong_item';
    case 'not_as_described':
      return 'missing_item';
    default:
      return null;
  }
}

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
    const gateClaimType = gateClaimTypeFromSupport(result.claim_type);
    const serviceClient = createServiceClient();
    let gateOrderId = result.shopify_order_id;
    let gateOrderName = result.order_ref;
    if (result.is_claim && gateClaimType && !gateOrderId && !gateOrderName) {
      const ticket = extractGorgiasTicketPayload(body);
      const customerEmail = resolveGorgiasTicketCustomerEmail(ticket)?.normEmail ?? null;
      if (customerEmail) {
        try {
          const emailOrder = await resolveUnambiguousEmailOrder(
            serviceClient,
            result.merchant_id,
            customerEmail,
          );
          gateOrderId = emailOrder?.id ?? null;
          gateOrderName = emailOrder?.order_number ?? emailOrder?.external_id ?? null;
        } catch (lookupError) {
          console.warn('Gorgias email order fallback skipped', {
            merchant_id: result.merchant_id,
            external_case_id: result.external_case_id,
            message: lookupError instanceof Error ? lookupError.message : String(lookupError),
          });
        }
      }
    }
    if (result.is_claim && gateClaimType && (gateOrderName || gateOrderId)) {
      try {
        await evaluatePublicGate({
          client: serviceClient,
          payload: {
            merchantId: result.merchant_id,
            platform: 'gorgias',
            ticket_id: result.external_case_id,
            order_id: gateOrderId,
            order_name: gateOrderName,
            claim_type: gateClaimType,
            customer_message: result.claim_reason ?? 'Gorgias ticket matched a post-purchase claim pattern.',
            requested_action: result.requested_action ?? 'unknown',
            idempotency_key: `gorgias:${result.external_case_id}`,
            source: 'gorgias_webhook',
            apply_gorgias_hold: true,
            force_existing_evaluation: true,
          },
        });
      } catch (gateError) {
        console.warn('Gorgias gate auto-evaluation skipped', {
          merchant_id: result.merchant_id,
          external_case_id: result.external_case_id,
          message: gateError instanceof Error ? gateError.message : String(gateError),
        });
      }
    }
    // Widget refresh nudge is best-effort: credential or API failures here
    // must never fail a webhook that already ingested successfully.
    try {
      const access = await getActiveGorgiasMerchantApiAccess(
        serviceClient,
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
    } catch (nudgeError) {
      console.warn('Gorgias widget refresh nudge skipped', {
        merchant_id: result.merchant_id,
        message: nudgeError instanceof Error ? nudgeError.message : String(nudgeError),
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
    console.error('Gorgias support webhook ingest failed', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      external_case_id: safeExternalCaseId(body),
    });
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
