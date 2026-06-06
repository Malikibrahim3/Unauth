import type { SupabaseClient } from '@supabase/supabase-js';
import { integrationBackfillSinceDate } from '@/lib/integrations/backfillWindow';
import { ingestSupportCase } from '@/lib/support/intake/ingestSupportCase';
import { TABLES } from '@/lib/supabase/tables';
import { fetchZendeskTicketWithComments } from '@/lib/support/zendesk/fetchTicket';
import { getActiveZendeskMerchantApiAccess } from '@/lib/support/zendesk/merchantApiAccess';
import { zendeskApiRequest } from '@/lib/support/zendesk/zendeskApi';

const SEARCH_PAGE_SIZE = 100;
const MAX_TICKETS_PER_RUN = 10_000;

type ZendeskSearchResponse = {
  results?: Array<Record<string, unknown>>;
  next_page?: string | null;
  count?: number;
};

function formatZendeskSearchDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function ticketCreatedMs(ticket: Record<string, unknown>): number {
  const created = ticket.created_at;
  return typeof created === 'string' ? Date.parse(created) : Number.NaN;
}

function shouldHydrateZendeskTicket(ticket: Record<string, unknown>): boolean {
  const hasDescription =
    typeof ticket.description === 'string' && ticket.description.trim().length > 0;
  const hasComments = Array.isArray(ticket.comments) && ticket.comments.length > 0;
  return !hasDescription && !hasComments;
}

export type ZendeskSupportBackfillResult = {
  tickets_listed: number;
  ingested: number;
  skipped: number;
  errors: number;
};

export async function backfillZendeskSupportCases(input: {
  supabase: SupabaseClient;
  merchantId: string;
  providerConnectionId: string;
  shopDomain?: string | null;
}): Promise<ZendeskSupportBackfillResult> {
  const access = await getActiveZendeskMerchantApiAccess(input.supabase, input.merchantId);
  if (!access) {
    throw new Error('zendesk_api_access_missing');
  }

  const cutoff = integrationBackfillSinceDate();
  const createdAfter = formatZendeskSearchDate(cutoff);
  const query = encodeURIComponent(`type:ticket created>${createdAfter}`);

  let nextPage: string | null =
    `/search.json?query=${query}&sort_by=created_at&sort_order=desc&per_page=${SEARCH_PAGE_SIZE}`;
  let ticketsListed = 0;
  let ingested = 0;
  let skipped = 0;
  let errors = 0;
  let reachedCutoff = false;

  while (nextPage && ticketsListed < MAX_TICKETS_PER_RUN && !reachedCutoff) {
    const page: ZendeskSearchResponse = await zendeskApiRequest<ZendeskSearchResponse>(
      access.providerBaseUrl,
      nextPage,
      access.credentials,
    );

    const batch = page.results ?? [];
    if (batch.length === 0) {
      break;
    }

    for (const row of batch) {
      if (ticketsListed >= MAX_TICKETS_PER_RUN) {
        break;
      }
      ticketsListed += 1;

      const createdMs = ticketCreatedMs(row);
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
      if (shouldHydrateZendeskTicket(row)) {
        try {
          ticket = await fetchZendeskTicketWithComments({
            providerBaseUrl: access.providerBaseUrl,
            credentials: access.credentials,
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
          provider: 'zendesk',
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

    const next: string | null | undefined = page.next_page;
    if (!next || typeof next !== 'string') {
      break;
    }
    nextPage = next;
  }

  const now = new Date().toISOString();
  await input.supabase
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .update({
      last_sync_at: now,
      updated_at: now,
      ...(errors > 0 && ingested === 0
        ? { last_error: `zendesk_backfill_partial: ${errors} ticket(s) failed` }
        : { last_error: null }),
    } as never)
    .eq('id', input.providerConnectionId);

  return {
    tickets_listed: ticketsListed,
    ingested,
    skipped,
    errors,
  };
}
