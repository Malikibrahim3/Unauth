import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { validateApiKey, isValidatedApiKey } from '@/lib/api/validateApiKey';
import { makeSignedToken, hashSignedToken } from '@/lib/api/signedAccess';
import { normaliseEmail } from '@/lib/identity/normalise';
import { TABLES } from '@/lib/supabase/tables';
import { v1OptionsResponse, withV1Cors } from '@/lib/api/v1/cors';
import { withRequestLogging } from '@/lib/log';
import { env } from '@/lib/utils/env';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return v1OptionsResponse(request);
}

async function POSTHandler(request: NextRequest) {
  const authResult = await validateApiKey(request);
  if (!isValidatedApiKey(authResult)) return withV1Cors(authResult, request);

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return withV1Cors(NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }), request);
  }

  const normEmail = normaliseEmail(body.email?.trim() ?? '');
  if (!normEmail) {
    return withV1Cors(NextResponse.json({ error: 'Valid email is required' }, { status: 400 }), request);
  }

  const service = createServiceClient();
  const filters = `merchant_ids.cs.${JSON.stringify([authResult.merchantId])}`;
  const { data: profile } = await service
    .from(TABLES.CUSTOMER_PROFILES)
    .select('id')
    .contains('emails', JSON.stringify([normEmail]))
    .or(filters)
    .limit(1)
    .maybeSingle() as unknown as { data: { id: string } | null };

  if (!profile?.id) {
    return withV1Cors(NextResponse.json({ error: 'Customer profile not found' }, { status: 404 }), request);
  }

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const token = makeSignedToken({
    profile_id: profile.id,
    merchant_id: authResult.merchantId,
    expires_at: expiresAt,
  });

  const { error: insertError } = await service
    .from(TABLES.PROFILE_VIEW_TOKENS)
    .insert({
      profile_id: profile.id,
      merchant_id: authResult.merchantId,
      token_hash: hashSignedToken(token),
      expires_at: expiresAt,
    });

  if (insertError) {
    return withV1Cors(NextResponse.json({ error: 'Failed to create profile link' }, { status: 500 }), request);
  }

  const appBase = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  return withV1Cors(
    NextResponse.json({
      profile_url: `${appBase}/customers/${profile.id}?view_token=${encodeURIComponent(token)}`,
    }),
    request
  );
}

export const POST = withRequestLogging('/api/v1/profile-link', POSTHandler);
