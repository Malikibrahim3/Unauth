/**
 * POST /api/cron/verify-connections
 *
 * Runs daily at 2 AM UTC via Vercel cron. For every merchant with a configured
 * Shopify, Gorgias, ShipBob, UPS, or FedEx connection, makes a live API call to verify the
 * credentials are still valid. The same probe also runs on integration page
 * loads while a merchant is active; this cron is the free-plan safety net.
 *
 * Combined with page-load verification, broken tokens are caught within
 * 24 hours by cron and immediately on any subsequent page view.
 *
 * Demo merchants are skipped. Their connection fixtures hold placeholder
 * credentials, so a probe can only fail and would rewrite the fixture to
 * status 'error' -- the same exemption verifyMerchantLiveConnections applies.
 *
 * Secured by Authorization: Bearer <CRON_SECRET>.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { env } from '@/lib/utils/env';
import {
  loadDemoMerchantIds,
  persistLiveVerification,
  verifyGorgiasConnection,
  verifyMerchantIntegrationConnection,
  verifyShopifyConnection,
  type GorgiasVerificationRow,
  type MerchantIntegrationVerificationRow,
  type ShopifyVerificationRow,
} from '@/lib/connections/liveVerification';

export const maxDuration = 60;

type StoreRow = {
  id: string;
  merchant_id: string;
  store_key: string | null;
  credentials_encrypted: string | null;
  platform: string | null;
  status: string | null;
  uninstalled_at: string | null;
};

type HelpdeskRow = {
  id: string;
  merchant_id: string;
  provider: string | null;
  provider_base_url: string | null;
  access_token_encrypted: string | null;
  status: string | null;
};

type MerchantIntegrationRow = MerchantIntegrationVerificationRow;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const sc = createServiceClient();
  const results: Record<string, { checked: number; failed: number; skippedDemo: number }> = {};

  // This sweep reaches connection rows directly rather than going through
  // verifyMerchantLiveConnections, so it has to repeat that function's demo
  // exemption itself. Without it, one nightly pass rewrites every demo
  // workspace's synthetic fixture to status 'error'.
  const demoMerchantIds = await loadDemoMerchantIds(sc);

  // --- Store connections (Shopify, WooCommerce, BigCommerce) ---
  const { data: storeRows } = await sc
    .from('store_connections')
    .select('id, merchant_id, store_key, credentials_encrypted, platform, status, uninstalled_at')
    .eq('platform', 'shopify') // Only Shopify has live token verification today
    .in('status', ['active', 'error'])
    .limit(500);

  results.shopify = { checked: 0, failed: 0, skippedDemo: 0 };
  for (const row of (storeRows ?? []) as StoreRow[]) {
    if (demoMerchantIds.has(row.merchant_id)) { results.shopify.skippedDemo++; continue; }
    results.shopify.checked++;
    const result = await verifyShopifyConnection(row as ShopifyVerificationRow);
    if (result.status === 'failed') {
      results.shopify.failed++;
    }
    await persistLiveVerification(sc, 'store_connections', row.merchant_id, row.id, row.status, result);
  }

  // --- Helpdesk connections (Gorgias) ---
  const { data: helpdeskRows } = await sc
    .from('helpdesk_connections')
    .select('id, merchant_id, provider, provider_base_url, access_token_encrypted, status')
    .eq('provider', 'gorgias')
    .in('status', ['active', 'error'])
    .limit(500);

  results.gorgias = { checked: 0, failed: 0, skippedDemo: 0 };
  for (const row of (helpdeskRows ?? []) as HelpdeskRow[]) {
    if (demoMerchantIds.has(row.merchant_id)) { results.gorgias.skippedDemo++; continue; }
    results.gorgias.checked++;
    const result = await verifyGorgiasConnection(row as GorgiasVerificationRow);
    if (result.status === 'failed') {
      results.gorgias.failed++;
    }
    await persistLiveVerification(sc, 'helpdesk_connections', row.merchant_id, row.id, row.status, result);
  }

  // --- Canonical merchant integrations (ShipBob, UPS, FedEx) ---
  const { data: integrationRows } = await sc
    .from('merchant_integrations')
    .select('id,merchant_id,provider_id,provider_account_id,environment,status')
    .in('provider_id', ['shipbob', 'ups', 'fedex'])
    .in('status', ['connected', 'active', 'degraded', 'error'])
    .limit(500);

  for (const providerId of ['shipbob', 'ups', 'fedex'] as const) {
    results[providerId] = { checked: 0, failed: 0, skippedDemo: 0 };
  }
  for (const row of (integrationRows ?? []) as MerchantIntegrationRow[]) {
    const providerResults = results[row.provider_id];
    if (demoMerchantIds.has(row.merchant_id)) { providerResults.skippedDemo++; continue; }
    providerResults.checked++;
    const result = await verifyMerchantIntegrationConnection(sc, row);
    if (result.status === 'failed') providerResults.failed++;
    await persistLiveVerification(
      sc,
      'merchant_integrations',
      row.merchant_id,
      row.id,
      row.status,
      result,
    );
  }

  console.log('[verify-connections] done', results);
  return NextResponse.json({ ok: true, results });
}

// Vercel Cron invokes scheduled jobs with GET (Authorization: Bearer CRON_SECRET).
export const GET = POST;
