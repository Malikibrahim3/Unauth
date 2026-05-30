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

type CustomerProfileEmailRow = {
  id: string;
  primary_email: string | null;
  emails: unknown;
  risk_level: string | null;
  risk_score: number | null;
  fraud_flags: unknown;
  identity_confidence_grade: string | null;
};

function parseFraudFlags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((flag) => String(flag)).filter(Boolean);
}

function profileMatchesEmail(row: CustomerProfileEmailRow, normEmail: string): boolean {
  if (row.primary_email?.trim().toLowerCase() === normEmail) return true;
  if (!Array.isArray(row.emails)) return false;
  return row.emails.some((entry) => String(entry).trim().toLowerCase() === normEmail);
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

  const { data: rows, error } = await service
    .from(TABLES.CUSTOMER_PROFILES)
    .select(
      'id, primary_email, emails, risk_level, risk_score, fraud_flags, identity_confidence_grade'
    )
    .contains('merchant_ids', [merchantId])
    .order('risk_score', { ascending: false });

  if (error) {
    gorgiasWidgetLog('customer_lookup.result', {
      found: false,
      profileId: null,
      risk_level: null,
      risk_score: null,
      hasError: true,
      errorMessage: error.message ?? null,
      errorCode: error.code ?? null,
      merchantScopedRows: 0,
      emailMatchedRows: 0,
    });
    return null;
  }

  const merchantRows = (rows ?? []) as CustomerProfileEmailRow[];
  const matched = merchantRows.filter((row) => profileMatchesEmail(row, normEmail));
  const row = matched[0] ?? null;

  gorgiasWidgetLog('customer_lookup.result', {
    found: Boolean(row),
    profileId: row?.id ?? null,
    risk_level: row?.risk_level ?? null,
    risk_score: row?.risk_score ?? null,
    hasError: false,
    errorMessage: null,
    errorCode: null,
    merchantScopedRows: merchantRows.length,
    emailMatchedRows: matched.length,
  });

  if (!row?.id) return null;

  return {
    id: row.id,
    risk_level: String(row.risk_level ?? 'unknown'),
    risk_score: Number(row.risk_score ?? 0),
    fraud_flags: parseFraudFlags(row.fraud_flags),
    identity_confidence_grade:
      typeof row.identity_confidence_grade === 'string' ? row.identity_confidence_grade : null,
  };
}
