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
 * Scoping notes (verified against the schema, not guessed):
 * - customer_profiles has no scalar merchant_id — it uses merchant_ids (jsonb
 *   array). We match the current merchantId and, for legacy profiles created
 *   before the merchants table, the auth userId.
 * - shopify_order_signals is keyed by shop_domain only, so we resolve
 *   merchant_shopify_connections (merchant_id -> shop_domain) first.
 * - audit_transactions, processing_jobs, merchant_claims, support_case_intake,
 *   evidence_packages, and customer_activity_log all carry a scalar merchant_id
 *   referencing merchants(id).
 * - public_audits is intentionally excluded: it is the public free-audit intake
 *   table and must not count as merchant workspace data until claimed and
 *   re-tenanted.
 */
export async function getMerchantDataPresence(
  serviceClient: SupabaseClient,
  merchantId: string,
  userId?: string,
): Promise<MerchantDataPresence> {
  // Containment filter for customer_profiles (current + legacy id).
  const profileFilter =
    userId && userId !== merchantId
      ? [
          `merchant_ids.cs.${JSON.stringify([merchantId])}`,
          `merchant_ids.cs.${JSON.stringify([userId])}`,
        ].join(',')
      : `merchant_ids.cs.${JSON.stringify([merchantId])}`;

  // Resolve the merchant's Shopify shop_domain first; shopify_order_signals is
  // keyed by shop_domain, not merchant_id.
  const { data: shopifyConn } = await serviceClient
    .from(TABLES.MERCHANT_SHOPIFY_CONNECTIONS)
    .select('shop_domain')
    .eq('merchant_id', merchantId)
    .maybeSingle();
  const shopDomain = (shopifyConn as { shop_domain?: string } | null)?.shop_domain ?? null;

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
      .from(TABLES.CUSTOMER_PROFILES)
      .select('id', { count: 'exact', head: true })
      .or(profileFilter),
    serviceClient
      .from(TABLES.AUDIT_TRANSACTIONS)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId),
    serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .eq('hidden_by_merchant', false),
    // CSV/import jobs only — Shopify-sourced jobs use upload_type = 'shopify'.
    serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .eq('hidden_by_merchant', false)
      .neq('upload_type', 'shopify'),
    serviceClient
      .from('merchant_claims' as never)
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
    shopDomain
      ? serviceClient
          .from('shopify_order_signals' as never)
          .select('id', { count: 'exact', head: true })
          .eq('shop_domain', shopDomain)
      : Promise.resolve({ count: 0 } as { count: number }),
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
