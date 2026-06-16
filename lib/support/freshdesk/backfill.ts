import type { SupabaseClient } from '@supabase/supabase-js';
import { integrationBackfillSinceDate } from '@/lib/integrations/backfillWindow';
import { fetchFreshdeskTicketById, freshdeskApiRequest } from '@/lib/support/freshdesk/freshdeskApi';
import { getActiveFreshdeskMerchantApiAccess } from '@/lib/support/freshdesk/merchantApiAccess';
import { ingestSupportCase } from '@/lib/support/intake/ingestSupportCase';
import { TABLES } from '@/lib/supabase/tables';

const PAGE_LIMIT = 100;
const MAX_TICKETS_PER_RUN = 10_000;

type FreshdeskTicketListResponse = Array<Record<string, unknown>>;

function ticketCreatedMs(ticket: Record<string, unknown>): number {
  const created = ticket.created_at;
  return typeof created === 'string' ? Date.parse(created) : Number.NaN;
}

function shouldHydrateFreshdeskTicket(ticket: Record<string, unknown>): boolean {
  const hasSubject = typeof ticket.subject === 'string' && ticket.subject.trim().length > 0;
  const hasDescription =
    (typeof ticket.description_text === 'string' && ticket.description_text.trim().length > 0) ||
    (typeof ticket.description === 'string' && ticket.description.trim().length > 0);
  const hasRequester =
    typeof ticket.email === 'string' ||
    (ticket.requester !== null && typeof ticket.requester === 'object');
  return !hasSubject || !hasDescription || !hasRequester;
}

export type FreshdeskSupportBackfillResult = {
  tickets_listed: number;
  ingested: number;
  skipped: number;
  errors: number;
};

export async function backfillFreshdeskSupportCases(input: {
  supabase: SupabaseClient;
  merchantId: string;
  providerConnectionId: string;
  shopDomain?: string | null;
}): Promise<FreshdeskSupportBackfillResult> {
  const access = await getActiveFreshdeskMerchantApiAccess(input.supabase, input.merchantId);
  if (!access) {
    throw new Error('freshdesk_api_access_missing');
  }

  const cutoff = integrationBackfillSinceDate();
  let page = 1;
  let ticketsListed = 0;
  let ingested = 0;
  let skipped = 0;
  let errors = 0;
  let reachedCutoff = false;

  while (!reachedCutoff && ticketsListed < MAX_TICKETS_PER_RUN) {
    const params = new URLSearchParams({
      updated_since: cutoff.toISOString(),
      include: 'description,requester',
      order_by: 'created_at',
      order_type: 'desc',
      per_page: String(PAGE_LIMIT),
      page: String(page),
    });

    const batch = await freshdeskApiRequest<FreshdeskTicketListResponse>(
      access.providerBaseUrl,
      `/tickets?${params.toString()}`,
      access.credentials.api_key,
      { method: 'GET' },
    );

    if (!Array.isArray(batch) || batch.length === 0) {
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
      if (shouldHydrateFreshdeskTicket(row)) {
        try {
          ticket = await fetchFreshdeskTicketById({
            providerBaseUrl: access.providerBaseUrl,
            apiKey: access.credentials.api_key,
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
          provider: 'freshdesk',
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

    if (reachedCutoff || ticketsListed >= MAX_TICKETS_PER_RUN || batch.length < PAGE_LIMIT) {
      break;
    }
    page += 1;
  }

  const now = new Date().toISOString();
  await input.supabase
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .update({
      last_sync_at: now,
      updated_at: now,
      ...(errors > 0 && ingested === 0
        ? { last_error: `freshdesk_backfill_partial: ${errors} ticket(s) failed` }
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
