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

/** Read the scopes actually granted to the installed app, without logging the token. */
export async function fetchShopifyGrantedScopes(
  shop: string,
  accessToken: string,
): Promise<string[] | null> {
  const response = await fetch(`https://${shop}/admin/oauth/access_scopes.json`, {
    headers: { 'X-Shopify-Access-Token': accessToken, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { access_scopes?: Array<{ handle?: unknown }> };
  const scopes = (payload.access_scopes ?? [])
    .map((scope) => (typeof scope.handle === 'string' ? scope.handle.trim() : ''))
    .filter(Boolean);
  return scopes;
}
