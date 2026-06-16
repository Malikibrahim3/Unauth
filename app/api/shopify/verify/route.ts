import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { decryptBigCommerceOAuthCredentials } from '@/lib/commerce/credentialCrypto';

export async function GET() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  const { data: row } = await serviceClient
    .from('store_connections')
    .select('credentials_encrypted, store_key, status')
    .eq('merchant_id', ctx.merchantId)
    .eq('platform', 'shopify')
    .order('installed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row || row.status !== 'active' || !row.credentials_encrypted || !row.store_key) {
    return NextResponse.json({ ok: false, reason: 'not_connected' });
  }

  let accessToken: string;
  try {
    accessToken = decryptBigCommerceOAuthCredentials(row.credentials_encrypted).access_token;
  } catch {
    return NextResponse.json({ ok: false, reason: 'decrypt_failed' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://${row.store_key}/admin/api/2024-01/shop.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken },
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) return NextResponse.json({ ok: true });
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ ok: false, reason: 'token_revoked' });
    }
    return NextResponse.json({ ok: false, reason: `shopify_${res.status}` });
  } catch {
    // Network error or timeout — don't false-alarm; treat as inconclusive
    return NextResponse.json({ ok: false, reason: 'network_error', inconclusive: true });
  }
}
