import type { SupabaseClient } from '@supabase/supabase-js';
import { getRelatedRecords, type RelatedRecord } from '@/lib/relationships/relatedRecords';

/** Case-focused name for the Phase 5 relationship graph read model. */
export function getCaseRelatedRecords(
  client: SupabaseClient,
  merchantId: string,
  caseId: string,
): Promise<RelatedRecord[]> {
  return getRelatedRecords(client, merchantId, 'case', caseId);
}
