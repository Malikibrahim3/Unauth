export async function exchangeShopifyOAuthAccessToken(
  shop: string,
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<{ ok: true; accessToken: string; scope: string | null } | { ok: false; status?: number; reason: string }> {
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return { ok: false, status: tokenRes.status, reason: 'token_exchange_failed' };
  }

  const tokenPayload = (await tokenRes.json()) as { access_token?: string; scope?: string };
  const accessToken = tokenPayload.access_token;
  if (!accessToken) {
    return { ok: false, reason: 'missing_token' };
  }

  return {
    ok: true,
    accessToken,
    scope: typeof tokenPayload.scope === 'string' && tokenPayload.scope.trim() ? tokenPayload.scope : null,
  };
}
