import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from './tables';

export type MerchantDataPresence = {
  hasAnyData: boolean;
  hasCustomerProfiles: boolean;
  hasOrders: boolean;
  hasShopifySignals: boolean;
  hasHelpdeskClaims: boolean;
  hasEvidencePackages: boolean;
  hasWatchlist: boolean;
  hasCustomerActivity: boolean;
  hasCsvImports: boolean;
  hasLiveIntegrationReports: boolean;
  sources: {
    customerProfiles: number;
    auditTransactions: number;
    processingJobs: number;
    csvImports: number;
    shopifyOrderSignals: number;
    merchantClaims: number;
    supportCases: number;
    evidencePackages: number;
    watchlistEntries: number;
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
 * - Shopify orders are source_orders rows with source='shopify'. The old
 *   shopify_order_signals and merchant_shopify_connections names are legacy.
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
    { count: auditTransactions },
    { count: processingJobs },
    { count: csvImports },
    { count: merchantClaims },
    { count: supportCases },
    { count: evidencePackages },
    { count: customerActivity },
    { count: shopifyOrderSignals },
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
    // CSV/import jobs only — Shopify-sourced jobs use upload_type = 'shopify'.
    serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .eq('hidden', false)
      .neq('source', 'shopify'),
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
    serviceClient
      .from('customer_activity_log' as never)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId),
    serviceClient
      .from(TABLES.AUDIT_TRANSACTIONS)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .eq('source', 'shopify'),
  ]);

  const sources = {
    customerProfiles: customerProfiles ?? 0,
    auditTransactions: auditTransactions ?? 0,
    processingJobs: processingJobs ?? 0,
    csvImports: csvImports ?? 0,
    shopifyOrderSignals: shopifyOrderSignals ?? 0,
    merchantClaims: merchantClaims ?? 0,
    supportCases: supportCases ?? 0,
    evidencePackages: evidencePackages ?? 0,
    watchlistEntries: 0,
    customerActivity: customerActivity ?? 0,
  };

  const hasCustomerProfiles = sources.customerProfiles > 0;
  const hasShopifySignals = sources.shopifyOrderSignals > 0;
  const hasOrders = sources.auditTransactions > 0 || hasShopifySignals;
  const hasHelpdeskClaims = sources.merchantClaims > 0 || sources.supportCases > 0;
  const hasEvidencePackages = sources.evidencePackages > 0;
  const hasWatchlist = false;
  const hasCustomerActivity = sources.customerActivity > 0;
  const hasCsvImports = sources.csvImports > 0;
  const hasLiveIntegrationReports = hasShopifySignals || hasHelpdeskClaims;

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
    hasShopifySignals,
    hasHelpdeskClaims,
    hasEvidencePackages,
    hasWatchlist,
    hasCustomerActivity,
    hasCsvImports,
    hasLiveIntegrationReports,
    sources,
  };
}
