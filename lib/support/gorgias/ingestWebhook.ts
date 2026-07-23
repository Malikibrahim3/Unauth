import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import {
  ingestSupportCase,
  SupportIngestError,
  type SupportIngestSuccess,
} from '@/lib/support/intake/ingestSupportCase';
import { resolveOrderSourceStoreKeyForMerchant } from '@/lib/support/intake/resolveOrderSourceStoreKey';
import { extractGorgiasAccountIdentity } from '@/lib/support/gorgias/accountIdentity';
import {
  markGorgiasSupportConnectionRevoked,
  recordGorgiasSupportConnectionError,
  touchGorgiasSupportConnectionSync,
} from '@/lib/support/gorgias/connectionStore';
import {
  resolveGorgiasSupportConnection,
  type GorgiasSupportConnectionRow,
} from '@/lib/support/gorgias/resolveConnection';
import { resolveGorgiasDevMerchantFallback } from '@/lib/support/gorgias/resolveMerchantId';
import {
  readGorgiasWebhookSecret,
  verifyGorgiasWebhookAuth,
} from '@/lib/support/gorgias/webhookAuth';
import { fetchGorgiasTicketById } from '@/lib/support/gorgias/fetchTicket';
import { getActiveGorgiasMerchantApiAccess } from '@/lib/support/gorgias/merchantApiAccess';
import { GorgiasSidebarRegistrationError } from '@/lib/support/gorgias/registerSidebarWidget';
import { completeProcessedWebhook } from '@/lib/commerce/processedWebhookHandler';
import {
  claimSupportTicketDelivery,
  replayedSupportResult,
} from '@/lib/support/webhookEventSafety';

export const GORGIAS_EVENT_TYPE_HEADER = 'x-gorgias-event-type';

export class GorgiasWebhookError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'GorgiasWebhookError';
  }
}

function asIsoString(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim();
}

const gorgiasTicketSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
  })
  .passthrough();

export function extractGorgiasTicketPayload(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new GorgiasWebhookError(400, 'invalid_ticket_payload');
  }

  const record = body as Record<string, unknown>;
  const candidate =
    record.ticket && typeof record.ticket === 'object' && !Array.isArray(record.ticket)
      ? (record.ticket as Record<string, unknown>)
      : record;

  const parsed = gorgiasTicketSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new GorgiasWebhookError(400, 'invalid_ticket_payload');
  }

  return parsed.data as Record<string, unknown>;
}

export function inferGorgiasEventType(
  ticket: Record<string, unknown>,
  headerEventType?: string | null
): string {
  const fromHeader = headerEventType?.trim();
  if (fromHeader) return fromHeader;

  const created = asIsoString(ticket.created_datetime ?? ticket.created_at);
  const updated = asIsoString(ticket.updated_datetime ?? ticket.updated_at);

  if (created && updated && created !== updated) {
    return 'ticket_updated';
  }

  return 'ticket_created';
}

export type IngestGorgiasWebhookInput = {
  headers: Headers;
  body: unknown;
  shopDomain?: string | null;
  /** Full request URL — used for domain/secret query params on the registered webhook URL. */
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
  connection: GorgiasSupportConnectionRow | null;
  providerConnectionId: string | null;
};

export async function authenticateGorgiasSupportWebhook(
  input: Pick<IngestGorgiasWebhookInput, 'headers' | 'requestUrl'>,
  supabase: unknown = createServiceClient(),
): Promise<ResolvedMerchantContext> {
  const probe: IngestGorgiasWebhookInput = {
    headers: input.headers,
    body: null,
    requestUrl: input.requestUrl,
  };
  const merchantContext = await resolveMerchantContext(supabase, probe, {});
  const auth = verifyGorgiasWebhookAuth({
    headerSecret: readGorgiasWebhookSecret(input.headers),
    connection: merchantContext.connection,
    hasResolvedConnection: merchantContext.connection !== null,
  });
  if (!auth.ok) throw new GorgiasWebhookError(auth.status, auth.code);
  return merchantContext;
}

async function resolveMerchantContext(
  supabase: unknown,
  input: IngestGorgiasWebhookInput,
  ticket: Record<string, unknown>
): Promise<ResolvedMerchantContext> {
  const webhookSearchParams = webhookSearchParamsFromRequestUrl(input.requestUrl);
  const identity = extractGorgiasAccountIdentity(
    input.headers,
    input.body,
    ticket,
    webhookSearchParams
  );

  if (identity) {
    const connectionResolution = await resolveGorgiasSupportConnection(supabase, identity);
    if ('connection' in connectionResolution) {
      return {
        merchantId: connectionResolution.connection.merchant_id,
        connection: connectionResolution.connection,
        providerConnectionId: connectionResolution.connection.id,
      };
    }

    if (connectionResolution.error === 'ambiguous') {
      throw new GorgiasWebhookError(409, 'gorgias_connection_ambiguous');
    }
  }

  const devFallback = resolveGorgiasDevMerchantFallback({
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
    throw new GorgiasWebhookError(400, 'invalid_merchant_id');
  }

  if (!identity) {
    throw new GorgiasWebhookError(400, 'gorgias_account_identity_required');
  }

  throw new GorgiasWebhookError(404, 'gorgias_connection_not_found');
}

function safeConnectionErrorCode(error: unknown): string {
  if (error instanceof GorgiasWebhookError) return error.message;
  if (error instanceof SupportIngestError) return error.message;
  return 'ingest_failed';
}

async function resolveShopDomainForGorgiasIngest(input: {
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

function shouldHydrateGorgiasTicket(ticket: Record<string, unknown>): boolean {
  const hasSubject = typeof ticket.subject === 'string' && ticket.subject.trim().length > 0;
  const hasMessages = Array.isArray(ticket.messages) && ticket.messages.length > 0;
  return !hasSubject || !hasMessages;
}

async function hydrateGorgiasTicketForIngest(input: {
  supabase: unknown;
  merchantId: string;
  connectionId?: string | null;
  ticket: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  if (!shouldHydrateGorgiasTicket(input.ticket)) {
    return input.ticket;
  }

  const ticketId = input.ticket.id;
  if (typeof ticketId !== 'string' && typeof ticketId !== 'number') {
    return input.ticket;
  }

  const apiAccess = await getActiveGorgiasMerchantApiAccess(input.supabase, input.merchantId);
  if (!apiAccess) {
    throw new GorgiasWebhookError(502, 'gorgias_ticket_api_access_missing');
  }

  try {
    return await fetchGorgiasTicketById({
      providerBaseUrl: apiAccess.providerBaseUrl,
      credentials: apiAccess.credentials,
      ticketId: String(ticketId),
    });
  } catch (error) {
    if (
      input.connectionId &&
      error instanceof GorgiasSidebarRegistrationError &&
      (error.status === 401 || error.status === 403)
    ) {
      await markGorgiasSupportConnectionRevoked(
        input.supabase,
        input.connectionId,
        'gorgias_api_credentials_revoked'
      );
      throw new GorgiasWebhookError(502, 'gorgias_api_credentials_revoked');
    }
    throw new GorgiasWebhookError(502, 'gorgias_ticket_fetch_failed');
  }
}

export async function ingestGorgiasSupportWebhook(
  input: IngestGorgiasWebhookInput
): Promise<SupportIngestSuccess> {
  const initialTicket = extractGorgiasTicketPayload(input.body);
  const eventType = inferGorgiasEventType(
    initialTicket,
    input.headers.get(GORGIAS_EVENT_TYPE_HEADER)
  );

  const shopDomainHeader = input.headers.get('x-unauth-shop-domain')?.trim();
  const explicitShopDomain = input.shopDomain ?? shopDomainHeader ?? undefined;

  const supabase = createServiceClient();
  const merchantContext = input.authenticatedContext
    ?? await authenticateGorgiasSupportWebhook(input, supabase);

  const shopDomain = await resolveShopDomainForGorgiasIngest({
    supabase,
    merchantId: merchantContext.merchantId,
    explicitShopDomain,
  });

  const connectionId = merchantContext.providerConnectionId;
  const ticket = await hydrateGorgiasTicketForIngest({
    supabase,
    merchantId: merchantContext.merchantId,
    connectionId,
    ticket: initialTicket,
  });

  const delivery = await claimSupportTicketDelivery(supabase, {
    provider: 'gorgias',
    merchantId: merchantContext.merchantId,
    providerConnectionId: connectionId,
    eventType,
    ticket,
  });
  if (delivery.status === 'duplicate') {
    const replay = replayedSupportResult(delivery.result);
    if (replay) return replay;
    throw new GorgiasWebhookError(500, 'gorgias_replay_result_missing');
  }
  if (delivery.status === 'conflict') throw new GorgiasWebhookError(409, 'gorgias_delivery_conflict');
  if (delivery.retry) throw new GorgiasWebhookError(503, 'gorgias_delivery_in_progress');
  if (delivery.status === 'stale') throw new GorgiasWebhookError(200, 'stale_event_ignored');

  try {
    const result = await ingestSupportCase(supabase, {
      merchant_id: merchantContext.merchantId,
      provider: 'gorgias',
      provider_connection_id: connectionId ?? undefined,
      event_type: eventType,
      shop_domain: shopDomain,
      raw: ticket,
    });

    if (connectionId) {
      await touchGorgiasSupportConnectionSync(supabase, connectionId);
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
      error instanceof Error ? error.message : 'gorgias_ingest_failed',
    ).catch(() => undefined);
    if (connectionId) {
      await recordGorgiasSupportConnectionError(
        supabase,
        connectionId,
        safeConnectionErrorCode(error)
      );
    }

    if (error instanceof SupportIngestError) {
      throw new GorgiasWebhookError(error.status, error.message);
    }
    throw error;
  }
}
