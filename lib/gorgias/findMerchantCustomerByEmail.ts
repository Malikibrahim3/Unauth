import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { gorgiasWidgetLog } from '@/lib/gorgias/widgetLog';
import { normaliseEmail } from '@/lib/identity/normalise';

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
  identityLinkRows: number;
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

type CustomerProfileIdentityRow = {
  customer_profile_id: string | null;
};

const PROFILE_SELECT =
  'id, primary_email, emails, merchant_ids, risk_level, risk_score, fraud_flags, identity_confidence_grade';

function parseFraudFlags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((flag) => { const v = String(flag); return v ? [v] : []; });
}

function merchantIdsIncludes(merchantIds: unknown, merchantId: string): boolean {
  if (!Array.isArray(merchantIds)) return false;
  return merchantIds.some((id) => String(id) === merchantId);
}

function profileMatchesEmail(row: CustomerProfileEmailRow, normEmail: string): boolean {
  if (normaliseEmail(row.primary_email) === normEmail) return true;
  if (!Array.isArray(row.emails)) return false;
  return row.emails.some((entry) => normaliseEmail(String(entry)) === normEmail);
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

function uniq(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => !!value)));
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
    identityLinkRows: 0,
    merchantScopedRows: 0,
    emailMatchedRows: 0,
  };

  gorgiasWidgetLog('customer_lookup.started', {});

  const [primaryRes, rpcRes, identityRes] = await Promise.all([
    service.from(TABLES.CUSTOMER_PROFILES).select(PROFILE_SELECT).eq('primary_email', normEmail),
    service.rpc('search_customer_profiles', {
      p_email: normEmail,
      p_name: null,
      p_address: null,
      p_card: null,
      p_ip: null,
    }),
    service
      .from(TABLES.CUSTOMER_PROFILE_IDENTITIES)
      .select('customer_profile_id')
      .eq('merchant_id', merchantId)
      .eq('identity_type', 'email')
      .eq('identity_value', normEmail),
  ]);

  if (primaryRes.error) {
    logLookupQueryFailure('primary_email_eq', primaryRes.error);
  }
  if (rpcRes.error) {
    logLookupQueryFailure('search_customer_profiles_rpc', rpcRes.error);
  }
  if (identityRes.error) {
    logLookupQueryFailure('customer_profile_identities_email_eq', identityRes.error);
  }

  const primaryRows = (primaryRes.data ?? []) as CustomerProfileEmailRow[];
  const rpcRows = (rpcRes.data ?? []) as CustomerProfileEmailRow[];
  const identityRows = (identityRes.data ?? []) as CustomerProfileIdentityRow[];
  const identityProfileIds = uniq(identityRows.map((row) => row.customer_profile_id));
  diagnostics.primaryEmailCandidateRows = primaryRows.length;
  diagnostics.emailsContainsCandidateRows = rpcRows.length;
  diagnostics.identityLinkRows = identityProfileIds.length;

  let identityProfileRows: CustomerProfileEmailRow[] = [];
  if (identityProfileIds.length > 0) {
    const identityProfilesRes = await service
      .from(TABLES.CUSTOMER_PROFILES)
      .select(PROFILE_SELECT)
      .in('id', identityProfileIds);
    if (identityProfilesRes.error) {
      logLookupQueryFailure('customer_profile_identities_profile_fetch', identityProfilesRes.error);
    }
    identityProfileRows = (identityProfilesRes.data ?? []) as CustomerProfileEmailRow[];
  }

  const byId = new Map<string, CustomerProfileEmailRow>();
  for (const row of [...primaryRows, ...rpcRows, ...identityProfileRows]) {
    byId.set(row.id, row);
  }

  const merchantScoped = [...byId.values()].filter((row) =>
    merchantIdsIncludes(row.merchant_ids, merchantId)
  );
  diagnostics.merchantScopedRows = merchantScoped.length;

  const matched = merchantScoped
    .filter((row) => identityProfileIds.includes(row.id) || profileMatchesEmail(row, normEmail))
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
    identityLinkRows: diagnostics.identityLinkRows,
    merchantScopedRows: diagnostics.merchantScopedRows,
    emailMatchedRows: diagnostics.emailMatchedRows,
  });

  if (!row?.id) {
    return { customer: null, diagnostics };
  }

  return { customer: rowToCustomer(row), diagnostics };
}
