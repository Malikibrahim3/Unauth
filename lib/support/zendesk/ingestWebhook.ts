import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import {
  ingestSupportCase,
  SupportIngestError,
  type SupportIngestSuccess,
} from '@/lib/support/intake/ingestSupportCase';
import { resolveOrderSourceStoreKeyForMerchant } from '@/lib/support/intake/resolveOrderSourceStoreKey';
import {
  markZendeskSupportConnectionRevoked,
  recordZendeskSupportConnectionError,
  touchZendeskSupportConnectionSync,
} from '@/lib/support/zendesk/connectionStore';
import {
  resolveZendeskSupportConnection,
  type ZendeskSupportConnectionRow,
} from '@/lib/support/zendesk/resolveConnection';
import { resolveZendeskDevMerchantFallback } from '@/lib/support/zendesk/resolveMerchantId';
import {
  readZendeskWebhookSecret,
  verifyZendeskWebhookAuth,
} from '@/lib/support/zendesk/webhookAuth';
import { extractZendeskAccountIdentity } from '@/lib/support/zendesk/webhookIdentity';
import { fetchZendeskTicketWithComments } from '@/lib/support/zendesk/fetchTicket';
import { ZendeskApiError } from '@/lib/support/zendesk/zendeskApi';
import { getActiveZendeskMerchantApiAccess } from '@/lib/support/zendesk/merchantApiAccess';
import { completeProcessedWebhook } from '@/lib/commerce/processedWebhookHandler';
import {
  claimSupportTicketDelivery,
  replayedSupportResult,
} from '@/lib/support/webhookEventSafety';

export class ZendeskWebhookError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ZendeskWebhookError';
  }
}

const zendeskTicketSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
  })
  .passthrough();

export function extractZendeskTicketPayload(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ZendeskWebhookError(400, 'invalid_ticket_payload');
  }

  const record = body as Record<string, unknown>;

  if (record.ticket && typeof record.ticket === 'object' && !Array.isArray(record.ticket)) {
    return record.ticket as Record<string, unknown>;
  }

  // Zendesk webhook "detail" wrapping (events API): { detail: { ... ticket fields } }
  if (record.detail && typeof record.detail === 'object' && !Array.isArray(record.detail)) {
    const detail = record.detail as Record<string, unknown>;
    if (detail.id !== undefined) {
      return detail;
    }
  }

  const parsed = zendeskTicketSchema.safeParse(record);
  if (parsed.success) {
    return parsed.data as Record<string, unknown>;
  }

  const ticketId = record.ticket_id ?? record.ticketId;
  if (typeof ticketId === 'string' || typeof ticketId === 'number') {
    return { id: ticketId };
  }

  throw new ZendeskWebhookError(400, 'invalid_ticket_payload');
}

function asIsoString(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim();
}

export function inferZendeskEventType(
  ticket: Record<string, unknown>,
  headerEventType?: string | null
): string {
  const fromHeader = headerEventType?.trim();
  if (fromHeader) return fromHeader;

  const created = asIsoString(ticket.created_at);
  const updated = asIsoString(ticket.updated_at);

  if (created && updated && created !== updated) {
    return 'ticket_updated';
  }

  return 'ticket_created';
}

export type IngestZendeskWebhookInput = {
  headers: Headers;
  body: unknown;
  shopDomain?: string | null;
  requestUrl?: string | null;
  authenticatedContext?: ResolvedMerchantContext;
};

function webhookSearchParamsFromRequestUrl(requestUrl?: string | null): URLSearchParams {
  if (!requestUrl?.trim()) return new URLSearchParams();
  try {
    return new URL(requestUrl).searchParams;
  } catch {
    return new URLSearchParams();
  }
}

export type ResolvedMerchantContext = {
  merchantId: string;
  connection: ZendeskSupportConnectionRow | null;
  providerConnectionId: string | null;
};

export async function authenticateZendeskSupportWebhook(
  input: Pick<IngestZendeskWebhookInput, 'headers' | 'requestUrl'>,
  supabase: unknown = createServiceClient(),
): Promise<ResolvedMerchantContext> {
  const probe: IngestZendeskWebhookInput = {
    headers: input.headers,
    body: null,
    requestUrl: input.requestUrl,
  };
  const merchantContext = await resolveMerchantContext(supabase, probe, {});
  const auth = verifyZendeskWebhookAuth({
    headerSecret: readZendeskWebhookSecret(input.headers),
    connection: merchantContext.connection,
    hasResolvedConnection: merchantContext.connection !== null,
  });
  if (!auth.ok) throw new ZendeskWebhookError(auth.status, auth.code);
  return merchantContext;
}

async function resolveMerchantContext(
  supabase: unknown,
  input: IngestZendeskWebhookInput,
  ticket: Record<string, unknown>
): Promise<ResolvedMerchantContext> {
  const webhookSearchParams = webhookSearchParamsFromRequestUrl(input.requestUrl);
  const identity = extractZendeskAccountIdentity(
    input.headers,
    input.body,
    ticket,
    webhookSearchParams
  );

  if (identity) {
    const connectionResolution = await resolveZendeskSupportConnection(supabase, identity);
    if ('connection' in connectionResolution) {
      return {
        merchantId: connectionResolution.connection.merchant_id,
        connection: connectionResolution.connection,
        providerConnectionId: connectionResolution.connection.id,
      };
    }

    if (connectionResolution.error === 'ambiguous') {
      throw new ZendeskWebhookError(409, 'zendesk_connection_ambiguous');
    }
  }

  const devFallback = resolveZendeskDevMerchantFallback({
    headerMerchantId: input.headers.get('x-unauth-merchant-id'),
  });

  if ('merchantId' in devFallback) {
    return {
      merchantId: devFallback.merchantId,
      connection: null,
      providerConnectionId: null,
    };
  }

  if (devFallback.error === 'invalid_header') {
    throw new ZendeskWebhookError(400, 'invalid_merchant_id');
  }

  if (!identity) {
    throw new ZendeskWebhookError(400, 'zendesk_account_identity_required');
  }

  throw new ZendeskWebhookError(404, 'zendesk_connection_not_found');
}

function safeConnectionErrorCode(error: unknown): string {
  if (error instanceof ZendeskWebhookError) return error.message;
  if (error instanceof SupportIngestError) return error.message;
  return 'ingest_failed';
}

async function resolveShopDomainForZendeskIngest(input: {
  supabase: unknown;
  merchantId: string;
  explicitShopDomain?: string | null;
}): Promise<string | undefined> {
  const explicit = input.explicitShopDomain?.trim();
  if (explicit) return explicit;

  return resolveOrderSourceStoreKeyForMerchant(
    input.supabase as Parameters<typeof resolveOrderSourceStoreKeyForMerchant>[0],
    input.merchantId
  );
}

function shouldHydrateZendeskTicket(ticket: Record<string, unknown>): boolean {
  const hasSubject = typeof ticket.subject === 'string' && ticket.subject.trim().length > 0;
  const hasDescription =
    typeof ticket.description === 'string' && ticket.description.trim().length > 0;
  return !hasSubject || !hasDescription;
}

async function hydrateZendeskTicketForIngest(input: {
  supabase: unknown;
  merchantId: string;
  connectionId?: string | null;
  ticket: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  if (!shouldHydrateZendeskTicket(input.ticket)) {
    return input.ticket;
  }

  const ticketId = input.ticket.id;
  if (typeof ticketId !== 'string' && typeof ticketId !== 'number') {
    return input.ticket;
  }

  const apiAccess = await getActiveZendeskMerchantApiAccess(input.supabase, input.merchantId);
  if (!apiAccess) {
    throw new ZendeskWebhookError(502, 'zendesk_ticket_api_access_missing');
  }

  try {
    return await fetchZendeskTicketWithComments({
      providerBaseUrl: apiAccess.providerBaseUrl,
      credentials: apiAccess.credentials,
      ticketId: String(ticketId),
    });
  } catch (error) {
    if (
      input.connectionId &&
      error instanceof ZendeskApiError &&
      (error.status === 401 || error.status === 403)
    ) {
      await markZendeskSupportConnectionRevoked(
        input.supabase,
        input.connectionId,
        'zendesk_api_credentials_revoked'
      );
      throw new ZendeskWebhookError(502, 'zendesk_api_credentials_revoked');
    }
    throw new ZendeskWebhookError(502, 'zendesk_ticket_fetch_failed');
  }
}

export async function ingestZendeskSupportWebhook(
  input: IngestZendeskWebhookInput
): Promise<SupportIngestSuccess> {
  const initialTicket = extractZendeskTicketPayload(input.body);
  const eventType = inferZendeskEventType(
    initialTicket,
    input.headers.get('x-zendesk-event-type')
  );

  const shopDomainHeader = input.headers.get('x-unauth-shop-domain')?.trim();
  const explicitShopDomain = input.shopDomain ?? shopDomainHeader ?? undefined;

  const supabase = createServiceClient();
  const merchantContext = input.authenticatedContext
    ?? await authenticateZendeskSupportWebhook(input, supabase);

  const shopDomain = await resolveShopDomainForZendeskIngest({
    supabase,
    merchantId: merchantContext.merchantId,
    explicitShopDomain,
  });

  const connectionId = merchantContext.providerConnectionId;
  const ticket = await hydrateZendeskTicketForIngest({
    supabase,
    merchantId: merchantContext.merchantId,
    connectionId,
    ticket: initialTicket,
  });

  const delivery = await claimSupportTicketDelivery(supabase, {
    provider: 'zendesk',
    merchantId: merchantContext.merchantId,
    providerConnectionId: connectionId,
    eventType,
    ticket,
  });
  if (delivery.status === 'duplicate') {
    const replay = replayedSupportResult(delivery.result);
    if (replay) return replay;
    throw new ZendeskWebhookError(500, 'zendesk_replay_result_missing');
  }
  if (delivery.status === 'conflict') throw new ZendeskWebhookError(409, 'zendesk_delivery_conflict');
  if (delivery.retry) throw new ZendeskWebhookError(503, 'zendesk_delivery_in_progress');
  if (delivery.status === 'stale') throw new ZendeskWebhookError(200, 'stale_event_ignored');

  try {
    const result = await ingestSupportCase(supabase, {
      merchant_id: merchantContext.merchantId,
      provider: 'zendesk',
      provider_connection_id: connectionId ?? undefined,
      event_type: eventType,
      shop_domain: shopDomain,
      raw: ticket,
    });

    if (connectionId) {
      await touchZendeskSupportConnectionSync(supabase, connectionId);
    }

    await completeProcessedWebhook(
      supabase,
      delivery.idempotencyKey,
      delivery.claimToken,
      'completed',
      null,
      result,
    );

    return result;
  } catch (error) {
    await completeProcessedWebhook(
      supabase,
      delivery.idempotencyKey,
      delivery.claimToken,
      'failed',
      error instanceof Error ? error.message : 'zendesk_ingest_failed',
    ).catch(() => undefined);
    if (connectionId) {
      await recordZendeskSupportConnectionError(
        supabase,
        connectionId,
        safeConnectionErrorCode(error)
      );
    }

    if (error instanceof SupportIngestError) {
      throw new ZendeskWebhookError(error.status, error.message);
    }
    throw error;
  }
}
