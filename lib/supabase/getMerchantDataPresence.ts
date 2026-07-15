import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from './tables';

export type MerchantDataPresence = {
  hasAnyData: boolean;
  hasCustomerProfiles: boolean;
  hasOrders: boolean;
  hasOrderSourceSignals: boolean;
  hasHelpdeskClaims: boolean;
  hasEvidencePackages: boolean;
  hasCustomerActivity: boolean;
  hasCsvImports: boolean;
  hasLiveIntegrationReports: boolean;
  sources: {
    customerProfiles: number;
    sourceOrders: number;
    processingJobs: number;
    csvImports: number;
    merchantClaims: number;
    supportCases: number;
    evidencePackages: number;
    customerActivity: number;
  };
};

/**
 * Canonical "what data does this merchant have?" contract.
 *
 * Every authenticated product page should read its data-presence truth from
 * here rather than inferring it from a single page-local query. All counts are
 * cheap existence counts (head: true, count: 'exact') and explicitly scoped to
 * the merchant.
 *
 * Scoping notes (verified against the v2 schema):
 * - source_customers / source_orders / claims / source_tickets are all
 *   merchant-scoped by merchant_id and are the app's canonical read model.
 * - Order presence is provider-neutral: every supported commerce source writes
 *   to source_orders and retains its provider in the source column.
 * - public_audits is intentionally excluded: it is the public free-audit intake
 *   table and must not count as merchant workspace data until claimed and
 *   re-tenanted.
 */
export async function getMerchantDataPresence(
  serviceClient: SupabaseClient,
  merchantId: string,
  userId?: string,
): Promise<MerchantDataPresence> {
  void userId;

  const [
    { count: customerProfiles },
    { count: sourceOrders },
    { count: processingJobs },
    { count: csvImports },
    { count: merchantClaims },
    { count: supportCases },
    { count: evidencePackages },
  ] = await Promise.all([
    serviceClient
      .from('source_customers')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId),
    serviceClient
      .from(TABLES.AUDIT_TRANSACTIONS)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId),
    serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .eq('hidden', false),
    // Manual CSV/import jobs only; provider sync jobs use their provider id.
    serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .eq('hidden', false)
      .eq('source', 'csv'),
    serviceClient
      .from(TABLES.MERCHANT_CLAIMS)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId),
    serviceClient
      .from(TABLES.SUPPORT_CASE_INTAKE)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId),
    serviceClient
      .from(TABLES.EVIDENCE_PACKAGES)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId),
  ]);

  const sources = {
    customerProfiles: customerProfiles ?? 0,
    sourceOrders: sourceOrders ?? 0,
    processingJobs: processingJobs ?? 0,
    csvImports: csvImports ?? 0,
    merchantClaims: merchantClaims ?? 0,
    supportCases: supportCases ?? 0,
    evidencePackages: evidencePackages ?? 0,
    customerActivity: 0,
  };

  const hasCustomerProfiles = sources.customerProfiles > 0;
  const hasOrderSourceSignals = sources.sourceOrders > 0;
  const hasOrders = hasOrderSourceSignals;
  const hasHelpdeskClaims = sources.merchantClaims > 0 || sources.supportCases > 0;
  const hasEvidencePackages = sources.evidencePackages > 0;
  const hasCustomerActivity = sources.customerActivity > 0;
  const hasCsvImports = sources.csvImports > 0;
  const hasLiveIntegrationReports = hasOrderSourceSignals || hasHelpdeskClaims;

  const hasAnyData =
    hasCustomerProfiles ||
    hasOrders ||
    hasHelpdeskClaims ||
    hasEvidencePackages ||
    hasCustomerActivity ||
    hasCsvImports;

  return {
    hasAnyData,
    hasCustomerProfiles,
    hasOrders,
    hasOrderSourceSignals,
    hasHelpdeskClaims,
    hasEvidencePackages,
    hasCustomerActivity,
    hasCsvImports,
    hasLiveIntegrationReports,
    sources,
  };
}
