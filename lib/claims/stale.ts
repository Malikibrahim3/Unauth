import { TABLES } from '@/lib/supabase/tables';

/**
 * Flags aged pending work without changing the case lifecycle. Source
 * freshness and business status are separate concepts; an old pending case is
 * attention work, not a terminal `stale` case.
 */
export async function flagAgedPendingClaims(
  serviceClient: any,
  options: { now?: Date; olderThanDays?: number; limit?: number } = {}
): Promise<{ scanned: number; flagged: number }> {
  const now = options.now ?? new Date();
  const olderThanDays = options.olderThanDays ?? 30;
  const cutoff = new Date(now.getTime() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
  const limit = options.limit ?? 500;

  const { data: claims, error: selectError } = await serviceClient
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id,merchant_id,status,updated_at,submitted_at')
    .eq('status', 'pending')
    .lt('updated_at', cutoff)
    .limit(limit);
  if (selectError) throw new Error(`select stale claims failed: ${selectError.message}`);

  const flagResults = await Promise.all(
    (claims ?? []).map(async (claim: { id: string; merchant_id: string }) => {
      const { data, error } = await serviceClient.rpc('flag_aged_payout_case', {
        p_merchant_id: claim.merchant_id,
        p_case_id: claim.id,
        p_cutoff: cutoff,
        p_idempotency_key: `aged-pending:${claim.id}:${cutoff.slice(0, 10)}`,
      });
      if (error) throw new Error(`flag aged claims failed: ${error.message}`);
      return (data as { flagged?: boolean } | null)?.flagged === true;
    })
  );
  const flagged = flagResults.filter(Boolean).length;

  return { scanned: (claims ?? []).length, flagged };
}
