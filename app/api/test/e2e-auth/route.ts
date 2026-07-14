import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import {
  isE2eTestAuthEnabled,
  validateE2eAuthRequest,
} from '@/lib/e2e/testAuth';

export const dynamic = 'force-dynamic';

async function resolveMerchantOwnerEmail(merchantId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: member } = await admin
    .from('merchant_users')
    .select('user_id')
    .eq('merchant_id', merchantId)
    .eq('invite_status', 'active')
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle();

  if (!member?.user_id) return null;

  const { data: userData, error } = await admin.auth.admin.getUserById(member.user_id as string);
  if (error || !userData.user?.email) return null;
  return userData.user.email;
}

/**
 * GET /api/test/e2e-auth?secret=...&merchant_id=...&redirect=/claims
 *
 * Local/test-only session bootstrap for E2E merchant UI verification.
 * Disabled when VERCEL_ENV=production or E2E_AUTH_SECRET is unset.
 */
export async function GET(request: NextRequest) {
  if (!isE2eTestAuthEnabled()) {
    return NextResponse.json({ error: 'e2e_auth_disabled' }, { status: 404 });
  }

  const { searchParams } = request.nextUrl;
  const secret = searchParams.get('secret');
  const merchantId = searchParams.get('merchant_id');
  const redirectTo = searchParams.get('redirect') ?? '/claims';

  if (!merchantId || !validateE2eAuthRequest({ secret, merchantId })) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const ownerEmail = await resolveMerchantOwnerEmail(merchantId);
  if (!ownerEmail) {
    return NextResponse.json({ error: 'merchant_owner_not_found' }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: ownerEmail,
    options: {
      redirectTo: new URL(redirectTo, request.nextUrl.origin).toString(),
    },
  });

  const hashedToken = linkData?.properties?.hashed_token;
  if (linkError || !hashedToken) {
    return NextResponse.json(
      { error: 'magiclink_generation_failed', detail: linkError?.message ?? 'missing_token' },
      { status: 500 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'supabase_public_config_missing' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: hashedToken,
    type: 'email',
  });

  if (verifyError) {
    return NextResponse.json(
      { error: 'session_verification_failed', detail: verifyError.message },
      { status: 500 },
    );
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
