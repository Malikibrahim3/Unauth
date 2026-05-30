import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { gorgiasWidgetLog } from '@/lib/gorgias/widgetLog';

export type MerchantCustomerByEmailRow = {
  id: string;
  risk_level: string;
  risk_score: number;
  fraud_flags: string[];
  identity_confidence_grade: string | null;
};

function parseFraudFlags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((flag) => String(flag)).filter(Boolean);
}

/**
 * Merchant-scoped customer_profiles lookup by normalised email.
 * Matches primary_email OR emails jsonb array (not primary_email only).
 */
export async function findMerchantCustomerByEmail(
  service: SupabaseClient,
  merchantId: string,
  normEmail: string
): Promise<MerchantCustomerByEmailRow | null> {
  gorgiasWidgetLog('customer_lookup.started', { merchantId });

  const emailMatchFilter = `primary_email.eq.${normEmail},emails.cs.${JSON.stringify([normEmail])}`;

  const { data: rows, error } = await service
    .from(TABLES.CUSTOMER_PROFILES)
    .select('id, risk_level, risk_score, fraud_flags, identity_confidence_grade')
    .contains('merchant_ids', [merchantId])
    .or(emailMatchFilter)
    .order('risk_score', { ascending: false })
    .limit(1);

  const row = rows?.[0] ?? null;

  gorgiasWidgetLog('customer_lookup.result', {
    found: Boolean(row),
    profileId: row?.id ?? null,
    risk_level: row?.risk_level ?? null,
    risk_score: row?.risk_score ?? null,
    hasError: Boolean(error),
    errorMessage: error?.message ?? null,
    errorCode: error?.code ?? null,
  });

  if (error || !row?.id) return null;

  return {
    id: row.id,
    risk_level: String(row.risk_level ?? 'unknown'),
    risk_score: Number(row.risk_score ?? 0),
    fraud_flags: parseFraudFlags(row.fraud_flags),
    identity_confidence_grade:
      typeof row.identity_confidence_grade === 'string' ? row.identity_confidence_grade : null,
  };
}
