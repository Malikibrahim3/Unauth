import { env } from '@/lib/utils/env';
import { BIGCOMMERCE_OAUTH_SCOPES } from '@/lib/commerce/bigcommerce/bigcommerceConnectionShared';

export type BigCommerceTokenResponse = {
  access_token: string;
  scope: string;
  context: string;
  user?: { id?: number; email?: string };
};

export async function exchangeBigCommerceOAuthAccessToken(input: {
  code: string;
  context: string;
  redirectUri: string;
}): Promise<
  | { ok: true; token: BigCommerceTokenResponse }
  | { ok: false; status?: number; reason: string }
> {
  const clientId = env.BIGCOMMERCE_CLIENT_ID;
  const clientSecret = env.BIGCOMMERCE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { ok: false, reason: 'misconfigured' };
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: input.code,
    scope: BIGCOMMERCE_OAUTH_SCOPES,
    redirect_uri: input.redirectUri,
    grant_type: 'authorization_code',
    context: input.context,
  });

  const tokenRes = await fetch('https://login.bigcommerce.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!tokenRes.ok) {
    return { ok: false, status: tokenRes.status, reason: 'token_exchange_failed' };
  }

  const payload = (await tokenRes.json()) as BigCommerceTokenResponse;
  if (!payload.access_token?.trim()) {
    return { ok: false, reason: 'missing_token' };
  }

  return { ok: true, token: payload };
}
