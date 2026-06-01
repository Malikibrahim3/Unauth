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
    .from('merchant_claims' as any)
    .select('id,merchant_id,shop_domain,status,updated_at,submitted_at')
    .eq('status', 'pending')
    .lt('updated_at', cutoff)
    .limit(limit);
  if (selectError) throw new Error(`select stale merchant_claims failed: ${selectError.message}`);

  let marked = 0;
  for (const claim of claims ?? []) {
    const { data, error } = await serviceClient
      .from('merchant_claims' as any)
      .update({ status: 'stale', updated_at: now.toISOString() })
      .eq('id', claim.id)
      .eq('status', 'pending')
      .select('id,status')
      .maybeSingle();
    if (error) throw new Error(`mark stale merchant_claims failed: ${error.message}`);
    if (!data) continue;
    marked += 1;
    await appendClaimEvent(serviceClient, {
      claim_id: claim.id,
      merchant_id: claim.merchant_id ?? null,
      shop_domain: claim.shop_domain ?? null,
      event_type: 'status_changed',
      previous_status: 'pending',
      new_status: 'stale',
      triggered_by: 'system_stale_job',
      metadata: { triggered_by: 'system_stale_job', cutoff },
    });
  }

  return { scanned: (claims ?? []).length, marked };
}
