import type { DomainEventHandler } from '@/lib/events/handlers/types';
import { TABLES } from '@/lib/supabase/tables';

export const customerProjection: DomainEventHandler = async (client, event) => {
  if (!event.event_type.startsWith('case.') || !event.aggregate_id) {
    return { applied: false, detail: 'ignored' };
  }
  const { data: payoutCase, error } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('identity_id')
    .eq('merchant_id', event.merchant_id)
    .eq('id', event.aggregate_id)
    .maybeSingle();
  if (error) throw new Error(`customer_projection_case_failed: ${error.message}`);
  if (!payoutCase?.identity_id) return { applied: false, detail: 'no_identity' };

  const { error: writeError } = await client.from(TABLES.WATCHLIST_ENTRIES).upsert(
    {
      merchant_id: event.merchant_id,
      identity_id: payoutCase.identity_id,
      updated_at: event.recorded_at ?? new Date().toISOString(),
    },
    { onConflict: 'merchant_id,identity_id' },
  );
  if (writeError) throw new Error(`customer_projection_write_failed: ${writeError.message}`);
  return { applied: true, detail: `identity:${payoutCase.identity_id}` };
};
