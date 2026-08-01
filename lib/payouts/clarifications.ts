import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import type { CaseClarificationRequest } from '@/lib/payouts/types';

const CLARIFICATION_SELECT =
  'id,merchant_id,support_payout_case_id,target_type,target_name,status,requested_evidence,request_summary,response_summary,source_channel,due_at,sent_at,response_received_at,created_at,updated_at,partner_id';
const LEGACY_CLARIFICATION_SELECT =
  'id,merchant_id,support_payout_case_id,target_type,target_name,status,requested_evidence,request_summary,response_summary,source_channel,due_at,sent_at,response_received_at,created_at,updated_at';

/**
 * Clarification requests reference `partners` through a composite
 * `(partner_id, merchant_id)` foreign key. PostgREST cannot resolve that as an
 * embedded relationship, which is what produced the RUN-02 500s, so the two
 * resources are read explicitly and joined here inside the merchant scope.
 *
 * A partner row that no longer resolves is reported as such rather than being
 * dropped: an investigation whose partner has been removed is still real
 * history and must stay visible.
 */
export async function listCaseClarificationRequests(
  client: SupabaseClient,
  merchantId: string,
  supportPayoutCaseId: string,
): Promise<CaseClarificationRequest[]> {
  const primary = await client
    .from(TABLES.CASE_CLARIFICATION_REQUESTS)
    .select(CLARIFICATION_SELECT)
    .eq('merchant_id', merchantId)
    .eq('support_payout_case_id', supportPayoutCaseId)
    .order('created_at', { ascending: false });

  let rows: Array<CaseClarificationRequest & { partner_id?: string | null }>;
  if (
    primary.error?.code === '42703'
    && primary.error.message.includes('partner_id')
  ) {
    /*
     * A connected preview database can briefly trail the application migration.
     * Keep the case readable by loading the complete legacy row shape and
     * representing the not-yet-available partner link as unavailable, never as
     * fabricated data. The schema verifier still requires the migration.
     */
    const legacy = await client
      .from(TABLES.CASE_CLARIFICATION_REQUESTS)
      .select(LEGACY_CLARIFICATION_SELECT)
      .eq('merchant_id', merchantId)
      .eq('support_payout_case_id', supportPayoutCaseId)
      .order('created_at', { ascending: false });
    if (legacy.error) {
      throw new Error(`Failed to list clarification requests: ${legacy.error.message}`);
    }
    rows = (legacy.data ?? []).map((row) => ({
      ...(row as unknown as CaseClarificationRequest),
      partner_id: null,
    }));
  } else {
    if (primary.error) {
      throw new Error(`Failed to list clarification requests: ${primary.error.message}`);
    }
    rows = (primary.data ?? []) as Array<CaseClarificationRequest & { partner_id?: string | null }>;
  }

  const partnerIds = [...new Set(rows.map((row) => row.partner_id).filter((id): id is string => !!id))];
  if (partnerIds.length === 0) {
    return rows.map((row) => ({ ...row, partner: null }));
  }

  const { data: partnerRows, error: partnerError } = await client
    .from(TABLES.PARTNERS)
    .select('id,name,partner_type,status')
    .eq('merchant_id', merchantId)
    .in('id', partnerIds);
  if (partnerError) {
    throw new Error(`Failed to resolve investigation partners: ${partnerError.message}`);
  }

  const partners = new Map(
    (partnerRows ?? []).map((partner) => [
      partner.id as string,
      {
        id: partner.id as string,
        name: partner.name as string,
        partner_type: (partner.partner_type ?? null) as string | null,
        status: (partner.status ?? null) as string | null,
      },
    ]),
  );

  return rows.map((row) => ({
    ...row,
    partner: row.partner_id ? (partners.get(row.partner_id) ?? { id: row.partner_id, unresolved: true }) : null,
  }));
}
