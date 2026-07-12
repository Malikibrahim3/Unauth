import type { SupabaseClient } from '@supabase/supabase-js';
import { integrationBackfillSinceDate } from '@/lib/integrations/backfillWindow';
import { ingestSupportCase } from '@/lib/support/intake/ingestSupportCase';
import { TABLES } from '@/lib/supabase/tables';
import { fetchGorgiasTicketById } from '@/lib/support/gorgias/fetchTicket';
import { getActiveGorgiasMerchantApiAccess } from '@/lib/support/gorgias/merchantApiAccess';
import {
  reconcileDeletedGorgiasTickets,
} from '@/lib/support/gorgias/reconcileDeletedTickets';
import { verifyGorgiasConnectionOrMarkReconnectRequired } from '@/lib/support/gorgias/verifyStoredCredentials';
import {
  gorgiasApiBaseUrl,
  gorgiasApiRequest,
} from '@/lib/support/gorgias/registerSidebarWidget';

const PAGE_LIMIT = 100;
/** Safety cap so a very large helpdesk cannot exhaust serverless time in one run. */
const MAX_TICKETS_PER_RUN = 10_000;

type GorgiasTicketListResponse = {
  data?: Array<Record<string, unknown>>;
  meta?: { next_cursor?: string | null };
};

function shouldHydrateGorgiasTicket(ticket: Record<string, unknown>): boolean {
  const hasSubject = typeof ticket.subject === 'string' && ticket.subject.trim().length > 0;
  const hasMessages = Array.isArray(ticket.messages) && ticket.messages.length > 0;
  return !hasSubject || !hasMessages;
}

export type GorgiasSupportBackfillResult = {
  tickets_listed: number;
  ingested: number;
  skipped: number;
  errors: number;
  orphans_reconciled?: { checked: number; marked_deleted: number };
};

export async function backfillGorgiasSupportCases(input: {
  supabase: SupabaseClient;
  merchantId: string;
  providerConnectionId: string;
  shopDomain?: string | null;
}): Promise<GorgiasSupportBackfillResult> {
  const access = await getActiveGorgiasMerchantApiAccess(input.supabase, input.merchantId);
  if (!access) {
    throw new Error('gorgias_api_access_missing');
  }

  const { data: connectionRow } = await input.supabase
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .select('access_token_encrypted, provider_base_url')
    .eq('id', input.providerConnectionId)
    .maybeSingle();

  if (connectionRow?.access_token_encrypted && connectionRow.provider_base_url) {
    const verified = await verifyGorgiasConnectionOrMarkReconnectRequired({
      supabase: input.supabase,
      connectionId: input.providerConnectionId,
      providerBaseUrl: connectionRow.provider_base_url,
      accessTokenEncrypted: connectionRow.access_token_encrypted,
    });
    if (!verified) {
      throw new Error('gorgias_api_auth_failed');
    }
  }

  const cutoff = integrationBackfillSinceDate();
  const apiBaseUrl = gorgiasApiBaseUrl(access.providerBaseUrl);
  const credentials = access.credentials;

  let cursor: string | undefined;
  let ticketsListed = 0;
  let ingested = 0;
  let skipped = 0;
  let errors = 0;
  let reachedCutoff = false;

  while (!reachedCutoff && ticketsListed < MAX_TICKETS_PER_RUN) {
    const params = new URLSearchParams({
      order_by: 'created_datetime:desc',
      limit: String(PAGE_LIMIT),
    });
    if (cursor) {
      params.set('cursor', cursor);
    }

    const page = await gorgiasApiRequest<GorgiasTicketListResponse>(
      apiBaseUrl,
      `/tickets?${params.toString()}`,
      credentials,
      { method: 'GET' },
    );

    const batch = page.data ?? [];
    if (batch.length === 0) {
      break;
    }

    for (const row of batch) {
      if (ticketsListed >= MAX_TICKETS_PER_RUN) {
        break;
      }
      ticketsListed += 1;

      const createdRaw = row.created_datetime;
      const createdMs =
        typeof createdRaw === 'string' ? Date.parse(createdRaw) : Number.NaN;
      if (Number.isFinite(createdMs) && createdMs < cutoff.getTime()) {
        reachedCutoff = true;
        break;
      }

      const ticketId = row.id;
      if (ticketId === undefined || ticketId === null) {
        skipped += 1;
        continue;
      }

      let ticket = row;
      if (shouldHydrateGorgiasTicket(row)) {
        try {
          ticket = await fetchGorgiasTicketById({
            providerBaseUrl: access.providerBaseUrl,
            credentials,
            ticketId: String(ticketId),
          });
        } catch {
          errors += 1;
          continue;
        }
      }

      try {
        await ingestSupportCase(input.supabase, {
          merchant_id: input.merchantId,
          provider: 'gorgias',
          provider_connection_id: input.providerConnectionId,
          shop_domain: input.shopDomain ?? undefined,
          event_type: 'ticket_backfill',
          raw: ticket,
        });
        ingested += 1;
      } catch {
        errors += 1;
      }
    }

    if (reachedCutoff || ticketsListed >= MAX_TICKETS_PER_RUN) {
      break;
    }

    const nextCursor = page.meta?.next_cursor;
    if (!nextCursor || typeof nextCursor !== 'string') {
      break;
    }
    cursor = nextCursor;
  }

  const orphansReconciled = await reconcileDeletedGorgiasTickets({
    supabase: input.supabase,
    merchantId: input.merchantId,
    access,
  });

  const now = new Date().toISOString();
  await input.supabase
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .update({
      last_sync_at: now,
      updated_at: now,
      ...(errors > 0 && ingested === 0
        ? { last_error: `gorgias_backfill_partial: ${errors} ticket(s) failed` }
        : { last_error: null }),
    } as never)
    .eq('id', input.providerConnectionId);

  return {
    tickets_listed: ticketsListed,
    ingested,
    skipped,
    errors,
    orphans_reconciled: orphansReconciled,
  };
}
