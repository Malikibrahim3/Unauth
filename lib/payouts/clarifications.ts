import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import type { CaseClarificationRequest } from '@/lib/payouts/types';

const CLARIFICATION_SELECT =
  'id,merchant_id,support_payout_case_id,target_type,target_name,status,requested_evidence,request_summary,response_summary,source_channel,due_at,sent_at,response_received_at,created_at,updated_at';

export async function listCaseClarificationRequests(
  client: SupabaseClient,
  merchantId: string,
  supportPayoutCaseId: string,
): Promise<CaseClarificationRequest[]> {
  const { data, error } = await client
    .from(TABLES.CASE_CLARIFICATION_REQUESTS)
    .select(CLARIFICATION_SELECT)
    .eq('merchant_id', merchantId)
    .eq('support_payout_case_id', supportPayoutCaseId)
    .order('created_at', { ascending: false });

  if (error) {
    // The table is additive. Returning an empty list keeps older local databases
    // usable until the migration is applied.
    if (/case_clarification_requests/i.test(error.message)) return [];
    throw new Error(`Failed to list clarification requests: ${error.message}`);
  }

  return (data ?? []) as CaseClarificationRequest[];
}
