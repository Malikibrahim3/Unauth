import { appendClaimEvent } from '@/lib/claims/events';

export async function markStalePendingClaims(
  serviceClient: any,
  options: { now?: Date; olderThanDays?: number; limit?: number } = {}
): Promise<{ scanned: number; marked: number }> {
  const now = options.now ?? new Date();
  const olderThanDays = options.olderThanDays ?? 30;
  const cutoff = new Date(now.getTime() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
  const limit = options.limit ?? 500;

  const { data: claims, error: selectError } = await serviceClient
    .from('claims')
    .select('id,merchant_id,status,updated_at,submitted_at')
    .eq('status', 'pending')
    .lt('updated_at', cutoff)
    .limit(limit);
  if (selectError) throw new Error(`select stale claims failed: ${selectError.message}`);

  const markResults = await Promise.all(
    (claims ?? []).map(async (claim: { id: string; merchant_id: string }) => {
      const { data, error } = await serviceClient
        .from('claims')
        .update({ status: 'stale' })
        .eq('id', claim.id)
        .eq('status', 'pending')
        .select('id,status')
        .maybeSingle();
      if (error) throw new Error(`mark stale claims failed: ${error.message}`);
      if (!data) return false;
      await appendClaimEvent(serviceClient, {
        claim_id: claim.id,
        merchant_id: claim.merchant_id,
        event_type: 'status_changed',
        previous_status: 'pending',
        new_status: 'stale',
        triggered_by: 'system_stale_job',
        metadata: { triggered_by: 'system_stale_job', cutoff },
      });
      return true;
    })
  );
  const marked = markResults.filter(Boolean).length;

  return { scanned: (claims ?? []).length, marked };
}
