/**
 * POST /api/cron/verify-connections
 *
 * Runs every 15 minutes. For every merchant with an active store or helpdesk
 * connection, makes a live API call to verify the credentials are still valid.
 * When a connection fails, updates status='error' and last_error in the DB so
 * the UI immediately reflects the broken state — even before the merchant
 * opens their settings page.
 *
 * Secured by Authorization: Bearer <CRON_SECRET>.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { env } from '@/lib/utils/env';
import { decryptBigCommerceOAuthCredentials } from '@/lib/commerce/credentialCrypto';
import {
  decryptGorgiasApiCredentials,
} from '@/lib/support/gorgias/credentialCrypto';
import {
  gorgiasApiBaseUrl,
  gorgiasApiRequest,
  GorgiasSidebarRegistrationError,
} from '@/lib/support/gorgias/registerSidebarWidget';

export const maxDuration = 60;

type StoreRow = {
  id: string;
  merchant_id: string;
  store_key: string | null;
  credentials_encrypted: string | null;
  platform: string | null;
  status: string | null;
};

type HelpdeskRow = {
  id: string;
  merchant_id: string;
  provider: string | null;
  provider_base_url: string | null;
  access_token_encrypted: string | null;
  status: string | null;
};

async function verifyShopifyConnection(row: StoreRow): Promise<{ ok: boolean; reason?: string }> {
  if (!row.credentials_encrypted || !row.store_key) return { ok: false, reason: 'missing_credentials' };

  let accessToken: string;
  try {
    accessToken = decryptBigCommerceOAuthCredentials(row.credentials_encrypted).access_token;
  } catch {
    return { ok: false, reason: 'decrypt_failed' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://${row.store_key}/admin/api/2024-01/shop.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken },
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) return { ok: false, reason: 'token_revoked' };
    if (res.status >= 500) return { ok: true }; // Shopify-side error, not our token
    return { ok: false, reason: `shopify_${res.status}` };
  } catch {
    // Network timeout/error — treat as inconclusive, don't mark as broken
    return { ok: true };
  }
}

async function verifyGorgiasConnection(row: HelpdeskRow): Promise<{ ok: boolean; reason?: string }> {
  if (!row.access_token_encrypted || !row.provider_base_url) return { ok: false, reason: 'missing_credentials' };

  let credentials: { email: string; api_key: string };
  try {
    credentials = decryptGorgiasApiCredentials(row.access_token_encrypted);
  } catch {
    return { ok: false, reason: 'decrypt_failed' };
  }

  const apiBaseUrl = gorgiasApiBaseUrl(row.provider_base_url);
  try {
    await gorgiasApiRequest<unknown>(apiBaseUrl, '/users/me', credentials, { method: 'GET' });
    return { ok: true };
  } catch (err) {
    if (err instanceof GorgiasSidebarRegistrationError) {
      if (err.status === 401 || err.status === 403) return { ok: false, reason: 'credentials_revoked' };
      if (err.status >= 500) return { ok: true }; // Gorgias-side error
    }
    // Network error — inconclusive
    return { ok: true };
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const sc = createServiceClient();
  const results: Record<string, { checked: number; failed: number }> = {};

  // --- Store connections (Shopify, WooCommerce, BigCommerce) ---
  const { data: storeRows } = await sc
    .from('store_connections')
    .select('id, merchant_id, store_key, credentials_encrypted, platform, status')
    .eq('status', 'active')
    .eq('platform', 'shopify') // Only Shopify has live token verification today
    .limit(500);

  results.shopify = { checked: 0, failed: 0 };
  for (const row of (storeRows ?? []) as StoreRow[]) {
    results.shopify.checked++;
    const { ok, reason } = await verifyShopifyConnection(row);
    if (!ok && reason && reason !== 'inconclusive') {
      results.shopify.failed++;
      await sc
        .from('store_connections')
        .update({
          status: 'error',
          last_error: `verification_failed: ${reason}`,
        })
        .eq('id', row.id);
    }
  }

  // --- Helpdesk connections (Gorgias) ---
  const { data: helpdeskRows } = await sc
    .from('helpdesk_connections')
    .select('id, merchant_id, provider, provider_base_url, access_token_encrypted, status')
    .eq('status', 'active')
    .eq('provider', 'gorgias')
    .limit(500);

  results.gorgias = { checked: 0, failed: 0 };
  for (const row of (helpdeskRows ?? []) as HelpdeskRow[]) {
    results.gorgias.checked++;
    const { ok, reason } = await verifyGorgiasConnection(row);
    if (!ok && reason && reason !== 'inconclusive') {
      results.gorgias.failed++;
      await sc
        .from('helpdesk_connections')
        .update({
          status: 'error',
          last_error: `verification_failed: ${reason}`,
        })
        .eq('id', row.id);
    }
  }

  console.log('[verify-connections] done', results);
  return NextResponse.json({ ok: true, results });
}
