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
  identityLinkRows: number;
  merchantScopedRows: number;
  emailMatchedRows: number;
};

function logLookupQueryFailure(lookupBranch: string, error: { message: string; code?: string | null }) {
  gorgiasWidgetLog('customer_lookup.query_failed', {
    lookupBranch,
    code: error.code ?? null,
    message: error.message,
  });
}

/**
 * Merchant-scoped lookup by normalized email. PII comes from merchant_customers;
 * the linked network identity contributes only its current confidence grade.
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

  const customerResult = await service
    .from(TABLES.MERCHANT_CUSTOMERS)
    .select('identity_id')
    .eq('merchant_id', merchantId)
    .eq('email', normEmail)
    .not('identity_id', 'is', null)
    .limit(1)
    .maybeSingle();
  if (customerResult.error) {
    logLookupQueryFailure('merchant_customers_email_eq', customerResult.error);
  }

  const identityId = customerResult.data?.identity_id ?? null;
  diagnostics.primaryEmailCandidateRows = identityId ? 1 : 0;
  diagnostics.identityLinkRows = identityId ? 1 : 0;
  diagnostics.merchantScopedRows = identityId ? 1 : 0;
  diagnostics.emailMatchedRows = identityId ? 1 : 0;

  const identityResult = identityId
    ? await service
        .from(TABLES.CUSTOMER_PROFILES)
        .select('id, confidence_grade')
        .eq('id', identityId)
        .is('superseded_by', null)
        .maybeSingle()
    : { data: null, error: null };
  if (identityResult.error) {
    logLookupQueryFailure('identity_fetch', identityResult.error);
  }

  const row = identityResult.data;

  gorgiasWidgetLog('customer_lookup.result', {
    found: Boolean(row),
    profileFound: Boolean(row),
    risk_level: row?.confidence_grade ?? null,
    risk_score: null,
    primaryEmailCandidateRows: diagnostics.primaryEmailCandidateRows,
    emailsContainsCandidateRows: diagnostics.emailsContainsCandidateRows,
    identityLinkRows: diagnostics.identityLinkRows,
    merchantScopedRows: diagnostics.merchantScopedRows,
    emailMatchedRows: diagnostics.emailMatchedRows,
  });

  if (!row?.id) {
    return { customer: null, diagnostics };
  }

  return {
    customer: {
      id: row.id,
      risk_level: row.confidence_grade ?? 'unknown',
      risk_score: 0,
      fraud_flags: [],
      identity_confidence_grade: row.confidence_grade,
    },
    diagnostics,
  };
}
