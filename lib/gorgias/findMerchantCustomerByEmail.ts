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

export type MerchantCustomerLookupDiagnostics = {
  normEmail: string;
  merchantId: string;
  primaryEmailCandidateRows: number;
  emailsContainsCandidateRows: number;
  merchantScopedRows: number;
  emailMatchedRows: number;
};

type CustomerProfileEmailRow = {
  id: string;
  primary_email: string | null;
  emails: unknown;
  merchant_ids: unknown;
  risk_level: string | null;
  risk_score: number | null;
  fraud_flags: unknown;
  identity_confidence_grade: string | null;
};

const PROFILE_SELECT =
  'id, primary_email, emails, merchant_ids, risk_level, risk_score, fraud_flags, identity_confidence_grade';

function parseFraudFlags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((flag) => String(flag)).filter(Boolean);
}

function merchantIdsIncludes(merchantIds: unknown, merchantId: string): boolean {
  if (!Array.isArray(merchantIds)) return false;
  return merchantIds.some((id) => String(id) === merchantId);
}

function profileMatchesEmail(row: CustomerProfileEmailRow, normEmail: string): boolean {
  if (row.primary_email?.trim().toLowerCase() === normEmail) return true;
  if (!Array.isArray(row.emails)) return false;
  return row.emails.some((entry) => String(entry).trim().toLowerCase() === normEmail);
}

function rowToCustomer(row: CustomerProfileEmailRow): MerchantCustomerByEmailRow {
  return {
    id: row.id,
    risk_level: String(row.risk_level ?? 'unknown'),
    risk_score: Number(row.risk_score ?? 0),
    fraud_flags: parseFraudFlags(row.fraud_flags),
    identity_confidence_grade:
      typeof row.identity_confidence_grade === 'string' ? row.identity_confidence_grade : null,
  };
}

function logLookupQueryFailure(lookupBranch: string, error: { message: string; code?: string | null }) {
  gorgiasWidgetLog('customer_lookup.query_failed', {
    lookupBranch,
    code: error.code ?? null,
    message: error.message,
  });
}

/**
 * Merchant-scoped customer_profiles lookup by normalised email.
 * Uses primary_email eq plus search_customer_profiles RPC (emails @> to_jsonb in SQL).
 * Avoids PostgREST .contains on jsonb emails — that pattern causes Postgres 22P02.
 */
export async function findMerchantCustomerByEmail(
  service: SupabaseClient,
  merchantId: string,
  normEmail: string
): Promise<{ customer: MerchantCustomerByEmailRow | null; diagnostics: MerchantCustomerLookupDiagnostics }> {
  const diagnostics: MerchantCustomerLookupDiagnostics = {
    normEmail,
    merchantId,
    primaryEmailCandidateRows: 0,
    emailsContainsCandidateRows: 0,
    merchantScopedRows: 0,
    emailMatchedRows: 0,
  };

  gorgiasWidgetLog('customer_lookup.started', {});

  const [primaryRes, rpcRes] = await Promise.all([
    service.from(TABLES.CUSTOMER_PROFILES).select(PROFILE_SELECT).eq('primary_email', normEmail),
    service.rpc('search_customer_profiles', {
      p_email: normEmail,
      p_name: null,
      p_address: null,
      p_card: null,
      p_ip: null,
    }),
  ]);

  if (primaryRes.error) {
    logLookupQueryFailure('primary_email_eq', primaryRes.error);
  }
  if (rpcRes.error) {
    logLookupQueryFailure('search_customer_profiles_rpc', rpcRes.error);
  }

  const primaryRows = (primaryRes.data ?? []) as CustomerProfileEmailRow[];
  const rpcRows = (rpcRes.data ?? []) as CustomerProfileEmailRow[];
  diagnostics.primaryEmailCandidateRows = primaryRows.length;
  diagnostics.emailsContainsCandidateRows = rpcRows.length;

  const byId = new Map<string, CustomerProfileEmailRow>();
  for (const row of [...primaryRows, ...rpcRows]) {
    byId.set(row.id, row);
  }

  const merchantScoped = [...byId.values()].filter((row) =>
    merchantIdsIncludes(row.merchant_ids, merchantId)
  );
  diagnostics.merchantScopedRows = merchantScoped.length;

  const matched = merchantScoped
    .filter((row) => profileMatchesEmail(row, normEmail))
    .sort((a, b) => Number(b.risk_score ?? 0) - Number(a.risk_score ?? 0));

  diagnostics.emailMatchedRows = matched.length;
  const row = matched[0] ?? null;

  gorgiasWidgetLog('customer_lookup.result', {
    found: Boolean(row),
    profileFound: Boolean(row),
    risk_level: row?.risk_level ?? null,
    risk_score: row?.risk_score ?? null,
    primaryEmailCandidateRows: diagnostics.primaryEmailCandidateRows,
    emailsContainsCandidateRows: diagnostics.emailsContainsCandidateRows,
    merchantScopedRows: diagnostics.merchantScopedRows,
    emailMatchedRows: diagnostics.emailMatchedRows,
  });

  if (!row?.id) {
    return { customer: null, diagnostics };
  }

  return { customer: rowToCustomer(row), diagnostics };
}
