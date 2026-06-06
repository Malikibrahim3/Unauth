import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import {
  ingestSupportCase,
  SupportIngestError,
  type SupportIngestSuccess,
} from '@/lib/support/intake/ingestSupportCase';
import { resolveOrderSourceStoreKeyForMerchant } from '@/lib/support/intake/resolveOrderSourceStoreKey';
import { extractFreshdeskAccountIdentity } from '@/lib/support/freshdesk/accountIdentity';
import {
  markFreshdeskSupportConnectionRevoked,
  recordFreshdeskSupportConnectionError,
  touchFreshdeskSupportConnectionSync,
} from '@/lib/support/freshdesk/connectionStore';
import {
  resolveFreshdeskSupportConnection,
  type FreshdeskSupportConnectionRow,
} from '@/lib/support/freshdesk/resolveConnection';
import { resolveFreshdeskDevMerchantFallback } from '@/lib/support/freshdesk/resolveMerchantId';
import {
  readFreshdeskWebhookSecret,
  verifyFreshdeskWebhookAuth,
} from '@/lib/support/freshdesk/webhookAuth';
import { fetchFreshdeskTicketById } from '@/lib/support/freshdesk/freshdeskApi';
import { FreshdeskApiError } from '@/lib/support/freshdesk/freshdeskApi';
import { getActiveFreshdeskMerchantApiAccess } from '@/lib/support/freshdesk/merchantApiAccess';

export class FreshdeskWebhookError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'FreshdeskWebhookError';
  }
}

const freshdeskTicketSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
  })
  .passthrough();

export function extractFreshdeskTicketPayload(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new FreshdeskWebhookError(400, 'invalid_ticket_payload');
  }

  const record = body as Record<string, unknown>;

  const freshdeskWebhook = record.freshdesk_webhook;
  if (
    freshdeskWebhook &&
    typeof freshdeskWebhook === 'object' &&
    !Array.isArray(freshdeskWebhook)
  ) {
    const wrapper = freshdeskWebhook as Record<string, unknown>;
    if (wrapper.ticket && typeof wrapper.ticket === 'object' && !Array.isArray(wrapper.ticket)) {
      return wrapper.ticket as Record<string, unknown>;
    }
  }

  if (record.ticket && typeof record.ticket === 'object' && !Array.isArray(record.ticket)) {
    return record.ticket as Record<string, unknown>;
  }

  const parsed = freshdeskTicketSchema.safeParse(record);
  if (parsed.success) {
    return parsed.data as Record<string, unknown>;
  }

  const ticketId = record.ticket_id ?? record.ticketId;
  if (typeof ticketId === 'string' || typeof ticketId === 'number') {
    return { id: ticketId };
  }

  throw new FreshdeskWebhookError(400, 'invalid_ticket_payload');
}

function asIsoString(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim();
}

export function inferFreshdeskEventType(
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

export type IngestFreshdeskWebhookInput = {
  headers: Headers;
  body: unknown;
  shopDomain?: string | null;
  requestUrl?: string | null;
};

function webhookSearchParamsFromRequestUrl(requestUrl?: string | null): URLSearchParams {
  if (!requestUrl?.trim()) return new URLSearchParams();
  try {
    return new URL(requestUrl).searchParams;
  } catch {
    return new URLSearchParams();
  }
}

type ResolvedMerchantContext = {
  merchantId: string;
  connection: FreshdeskSupportConnectionRow | null;
  providerConnectionId: string | null;
};

async function resolveMerchantContext(
  supabase: unknown,
  input: IngestFreshdeskWebhookInput
): Promise<ResolvedMerchantContext> {
  const webhookSearchParams = webhookSearchParamsFromRequestUrl(input.requestUrl);
  const identity = extractFreshdeskAccountIdentity(
    input.headers,
    input.body,
    webhookSearchParams
  );

  if (identity) {
    const connectionResolution = await resolveFreshdeskSupportConnection(supabase, identity);
    if ('connection' in connectionResolution) {
      return {
        merchantId: connectionResolution.connection.merchant_id,
        connection: connectionResolution.connection,
        providerConnectionId: connectionResolution.connection.id,
      };
    }

    if (connectionResolution.error === 'ambiguous') {
      throw new FreshdeskWebhookError(409, 'freshdesk_connection_ambiguous');
    }
  }

  const devFallback = resolveFreshdeskDevMerchantFallback({
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
    throw new FreshdeskWebhookError(400, 'invalid_merchant_id');
  }

  if (!identity) {
    throw new FreshdeskWebhookError(400, 'freshdesk_account_identity_required');
  }

  throw new FreshdeskWebhookError(404, 'freshdesk_connection_not_found');
}

function safeConnectionErrorCode(error: unknown): string {
  if (error instanceof FreshdeskWebhookError) return error.message;
  if (error instanceof SupportIngestError) return error.message;
  return 'ingest_failed';
}

async function resolveShopDomainForFreshdeskIngest(input: {
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

function shouldHydrateFreshdeskTicket(ticket: Record<string, unknown>): boolean {
  const hasSubject = typeof ticket.subject === 'string' && ticket.subject.trim().length > 0;
  const hasDescription =
    (typeof ticket.description_text === 'string' && ticket.description_text.trim().length > 0) ||
    (typeof ticket.description === 'string' && ticket.description.trim().length > 0);
  return !hasSubject || !hasDescription;
}

async function hydrateFreshdeskTicketForIngest(input: {
  supabase: unknown;
  merchantId: string;
  connectionId?: string | null;
  ticket: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  if (!shouldHydrateFreshdeskTicket(input.ticket)) {
    return input.ticket;
  }

  const ticketId = input.ticket.id;
  if (typeof ticketId !== 'string' && typeof ticketId !== 'number') {
    return input.ticket;
  }

  const apiAccess = await getActiveFreshdeskMerchantApiAccess(input.supabase, input.merchantId);
  if (!apiAccess) {
    throw new FreshdeskWebhookError(502, 'freshdesk_ticket_api_access_missing');
  }

  try {
    return await fetchFreshdeskTicketById({
      providerBaseUrl: apiAccess.providerBaseUrl,
      apiKey: apiAccess.credentials.api_key,
      ticketId: String(ticketId),
    });
  } catch (error) {
    if (
      input.connectionId &&
      error instanceof FreshdeskApiError &&
      (error.status === 401 || error.status === 403)
    ) {
      await markFreshdeskSupportConnectionRevoked(
        input.supabase,
        input.connectionId,
        'freshdesk_api_credentials_revoked'
      );
      throw new FreshdeskWebhookError(502, 'freshdesk_api_credentials_revoked');
    }
    throw new FreshdeskWebhookError(502, 'freshdesk_ticket_fetch_failed');
  }
}

export async function ingestFreshdeskSupportWebhook(
  input: IngestFreshdeskWebhookInput
): Promise<SupportIngestSuccess> {
  const initialTicket = extractFreshdeskTicketPayload(input.body);
  const eventType = inferFreshdeskEventType(
    initialTicket,
    input.headers.get('x-freshdesk-event-type')
  );

  const shopDomainHeader = input.headers.get('x-unauth-shop-domain')?.trim();
  const explicitShopDomain = input.shopDomain ?? shopDomainHeader ?? undefined;

  const supabase = createServiceClient();
  const webhookSearchParams = webhookSearchParamsFromRequestUrl(input.requestUrl);
  const merchantContext = await resolveMerchantContext(supabase, input);

  const headerSecret = readFreshdeskWebhookSecret(input.headers, webhookSearchParams);
  const auth = verifyFreshdeskWebhookAuth({
    headerSecret,
    connection: merchantContext.connection,
    hasResolvedConnection: merchantContext.connection !== null,
  });

  if (!auth.ok) {
    if (merchantContext.providerConnectionId) {
      await recordFreshdeskSupportConnectionError(
        supabase,
        merchantContext.providerConnectionId,
        auth.code
      );
    }
    throw new FreshdeskWebhookError(auth.status, auth.code);
  }

  const shopDomain = await resolveShopDomainForFreshdeskIngest({
    supabase,
    merchantId: merchantContext.merchantId,
    explicitShopDomain,
  });

  const connectionId = merchantContext.providerConnectionId;
  const ticket = await hydrateFreshdeskTicketForIngest({
    supabase,
    merchantId: merchantContext.merchantId,
    connectionId,
    ticket: initialTicket,
  });

  try {
    const result = await ingestSupportCase(supabase, {
      merchant_id: merchantContext.merchantId,
      provider: 'freshdesk',
      provider_connection_id: connectionId ?? undefined,
      event_type: eventType,
      shop_domain: shopDomain,
      raw: ticket,
    });

    if (connectionId) {
      await touchFreshdeskSupportConnectionSync(supabase, connectionId);
    }

    return result;
  } catch (error) {
    if (connectionId) {
      await recordFreshdeskSupportConnectionError(
        supabase,
        connectionId,
        safeConnectionErrorCode(error)
      );
    }

    if (error instanceof SupportIngestError) {
      throw new FreshdeskWebhookError(error.status, error.message);
    }
    throw error;
  }
}
