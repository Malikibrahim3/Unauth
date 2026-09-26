import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';
import { ACTIVE_MERCHANT_COOKIE } from '@/lib/permissions';
import {
  isE2eTestAuthEnabled,
  validateE2eAuthRequest,
} from '@/lib/e2e/testAuth';

export const dynamic = 'force-dynamic';

async function resolveMerchantMemberEmail(merchantId: string, memberRole: 'owner' | 'admin' | 'analyst' | 'viewer'): Promise<string | null> {
  const admin = createAdminClient();
  const { data: member } = await admin
    .from('merchant_users')
    .select('user_id,invited_email')
    .eq('merchant_id', merchantId)
    .eq('invite_status', 'active')
    .eq('role', memberRole)
    .limit(1)
    .maybeSingle();

  if (member?.invited_email) return member.invited_email;
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
  const requestedRole = searchParams.get('member_role') ?? 'owner';
  const redirectTo = searchParams.get('redirect') ?? '/cases';

  if (!merchantId || !['owner', 'admin', 'analyst', 'viewer'].includes(requestedRole) || !validateE2eAuthRequest({ secret, merchantId })) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const memberEmail = await resolveMerchantMemberEmail(merchantId, requestedRole as 'owner' | 'admin' | 'analyst' | 'viewer');
  if (!memberEmail) {
    return NextResponse.json({ error: 'merchant_member_not_found' }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: memberEmail,
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

  const requestHost = request.headers.get('host') ?? request.nextUrl.host;
  const requestOrigin = `${request.nextUrl.protocol}//${requestHost}`;
  const response = NextResponse.redirect(new URL(redirectTo, requestOrigin));
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
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

  // Bootstrap the requested fixture workspace as well as its user. A stale
  // workspace cookie otherwise sends a valid test session to another fixture's
  // onboarding route. This local-only route retains its secret/tenant/role gates.
  response.cookies.set(ACTIVE_MERCHANT_COOKIE, merchantId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
  });
  return response;
}
