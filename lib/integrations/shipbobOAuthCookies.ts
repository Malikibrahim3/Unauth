export const shipBobOAuthCookie = 'shipbob_oauth_state';

export function shipBobOAuthCookieOptions(maxAge = 600) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api/integrations/shipbob',
    maxAge,
  };
}

export function clearShipBobOAuthCookieOptions() {
  return shipBobOAuthCookieOptions(0);
}
