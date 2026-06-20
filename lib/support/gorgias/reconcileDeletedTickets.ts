import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { fetchGorgiasTicketById } from '@/lib/support/gorgias/fetchTicket';
import { GorgiasSidebarRegistrationError } from '@/lib/support/gorgias/registerSidebarWidget';
import type { GorgiasMerchantApiAccess } from '@/lib/support/gorgias/merchantApiAccess';

export const SOURCE_DELETED_TICKET_STATUS = 'source_deleted';

export async function markTicketSourceDeleted(
  supabase: SupabaseClient,
  input: { merchantId: string; ticketId: string },
): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from(TABLES.SUPPORT_CASE_INTAKE)
    .update({
      status: SOURCE_DELETED_TICKET_STATUS,
      updated_at: now,
      updated_at_provider: now,
    })
    .eq('id', input.ticketId)
    .eq('merchant_id', input.merchantId);

  const { data: linkedCases } = await supabase
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id, status')
    .eq('merchant_id', input.merchantId)
    .eq('source_ticket_id', input.ticketId);

  for (const row of (linkedCases ?? []).filter(
    (claim) => claim.status !== 'voided' && claim.status !== 'stale',
  )) {
    await supabase
      .from(TABLES.MERCHANT_CLAIMS)
      .update({ status: 'stale', updated_at: now })
      .eq('id', row.id);
  }
}

export async function reconcileDeletedGorgiasTickets(input: {
  supabase: SupabaseClient;
  merchantId: string;
  access: GorgiasMerchantApiAccess;
  /** When set, only these external ticket ids are checked (useful for targeted repair). */
  externalTicketIds?: string[];
}): Promise<{ checked: number; marked_deleted: number }> {
  let query = input.supabase
    .from(TABLES.SUPPORT_CASE_INTAKE)
    .select('id, external_id, status')
    .eq('merchant_id', input.merchantId)
    .eq('provider', 'gorgias')
    .neq('status', SOURCE_DELETED_TICKET_STATUS);

  if (input.externalTicketIds?.length) {
    query = query.in('external_id', input.externalTicketIds);
  }

  const { data: rows, error } = await query;
  if (error) throw new Error(`gorgias_ticket_reconcile_lookup_failed: ${error.message}`);

  let checked = 0;
  let markedDeleted = 0;

  for (const row of rows ?? []) {
    const externalId = String(row.external_id ?? '').trim();
    if (!externalId) continue;
    checked += 1;

    try {
      await fetchGorgiasTicketById({
        providerBaseUrl: input.access.providerBaseUrl,
        credentials: input.access.credentials,
        ticketId: externalId,
      });
    } catch (error) {
      const status =
        error instanceof GorgiasSidebarRegistrationError ? error.status : null;
      if (status !== 404) continue;
      await markTicketSourceDeleted(input.supabase, {
        merchantId: input.merchantId,
        ticketId: row.id as string,
      });
      markedDeleted += 1;
    }
  }

  return { checked, marked_deleted: markedDeleted };
}
