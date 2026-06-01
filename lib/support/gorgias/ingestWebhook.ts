import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import {
  ingestSupportCase,
  SupportIngestError,
  type SupportIngestSuccess,
} from '@/lib/support/intake/ingestSupportCase';
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
import { TABLES } from '@/lib/supabase/tables';

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
  connection: GorgiasSupportConnectionRow | null;
  providerConnectionId: string | null;
};

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

  const { data, error } = await (input.supabase as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string | boolean) => {
          eq: (column2: string, value2: string | boolean) => {
            order: (
              column: string,
              options: { ascending: boolean }
            ) => {
              limit: (count: number) => Promise<{
                data: Array<{ shop_domain: string | null }> | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
    };
  })
    .from(TABLES.MERCHANT_SHOPIFY_CONNECTIONS)
    .select('shop_domain')
    .eq('merchant_id', input.merchantId)
    .eq('active', true)
    .order('updated_at', { ascending: false })
    .limit(2);

  if (error) return undefined;

  const domains = Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.shop_domain?.trim())
        .filter((domain): domain is string => Boolean(domain))
    )
  );
  return domains.length === 1 ? domains[0] : undefined;
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
  const webhookSearchParams = webhookSearchParamsFromRequestUrl(input.requestUrl);
  const merchantContext = await resolveMerchantContext(supabase, input, initialTicket);
  const shopDomain = await resolveShopDomainForGorgiasIngest({
    supabase,
    merchantId: merchantContext.merchantId,
    explicitShopDomain,
  });

  const headerSecret = readGorgiasWebhookSecret(input.headers, webhookSearchParams);
  const auth = verifyGorgiasWebhookAuth({
    headerSecret,
    connection: merchantContext.connection,
    hasResolvedConnection: merchantContext.connection !== null,
  });

  if (!auth.ok) {
    if (merchantContext.providerConnectionId) {
      await recordGorgiasSupportConnectionError(
        supabase,
        merchantContext.providerConnectionId,
        auth.code
      );
    }
    throw new GorgiasWebhookError(auth.status, auth.code);
  }

  const connectionId = merchantContext.providerConnectionId;
  const ticket = await hydrateGorgiasTicketForIngest({
    supabase,
    merchantId: merchantContext.merchantId,
    connectionId,
    ticket: initialTicket,
  });

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

    return result;
  } catch (error) {
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
