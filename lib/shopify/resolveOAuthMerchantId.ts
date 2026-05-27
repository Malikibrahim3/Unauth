import type { NextRequest } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { ensureMerchantContextForUser } from '@/lib/account/ensureMerchantContext';

export async function resolveOAuthMerchantId(
  request: NextRequest,
  serviceClient: SupabaseClient,
  userClient: { auth: { getUser: () => Promise<{ data: { user: User | null } }> } },
): Promise<string | null> {
  const fromCookie = request.cookies.get('shopify_oauth_merchant_id')?.value ?? null;
  if (fromCookie) return fromCookie;

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;

  const ctx = await ensureMerchantContextForUser(serviceClient, user);
  return ctx?.merchantId ?? null;
}
