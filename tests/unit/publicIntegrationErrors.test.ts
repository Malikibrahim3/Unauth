import {
  publicConnectionErrorMessage,
  safeConnectionErrorCode,
} from '@/lib/integrations/publicErrors';

describe('public integration diagnostics', () => {
  it('keeps a stable category and drops provider detail', () => {
    const raw = 'shipbob_auth_failed:401 token=merchant-secret';
    expect(safeConnectionErrorCode(raw)).toBe('shipbob_auth_failed');
    expect(publicConnectionErrorMessage(raw)).toBe(
      'Provider authorization needs attention. Reconnect the connection and retry.',
    );
    expect(publicConnectionErrorMessage(raw)).not.toContain('merchant-secret');
    expect(publicConnectionErrorMessage(raw)).not.toContain('401');
  });

  it('does not echo arbitrary provider response text', () => {
    const raw = 'Invalid API key sk_live_sensitive_value returned by provider';
    expect(safeConnectionErrorCode(raw)).toBe('connection_error');
    expect(publicConnectionErrorMessage(raw)).toBe('The connection needs attention (connection_error).');
    expect(publicConnectionErrorMessage(raw)).not.toContain('sk_live');
  });

  // Every `reason` string lib/connections/liveVerification.ts can actually
  // produce (verifyShopifyConnection, verifyGorgiasConnection,
  // verifyMerchantIntegrationConnection, classifiedProviderFailure). These
  // flow into lib/connections/effectiveStatus.ts's error note via this exact
  // function — regression coverage for the "decrypt_failed" leak where a
  // raw reason was interpolated straight into the UI, bypassing this mapper.
  const SANCTIONED_MESSAGES = [
    'Provider authorization needs attention. Reconnect the connection and retry.',
    'The provider is temporarily unavailable. Retry the connection shortly.',
  ];

  const REAL_LIVE_VERIFICATION_REASONS = [
    'decrypt_failed',
    'missing_credentials',
    'credentials_revoked',
    'environment_mismatch',
    'provider_account_unavailable',
    'provider_rate_limited',
    'provider_unavailable',
    'provider_rejected',
    'network_or_timeout',
    'app_uninstalled',
    'shopify_500',
    'shopify_429',
    'shopify_403',
    'gorgias_401',
    'gorgias_network',
    'gorgias_404',
  ];

  it.each(REAL_LIVE_VERIFICATION_REASONS)('never leaks the raw reason token "%s" verbatim', (reason) => {
    const message = publicConnectionErrorMessage(reason);
    expect(message).not.toBeNull();
    // Either it maps to one of the two fixed sentences, or it embeds the
    // reason itself as the visible "code" (which is what safeConnectionErrorCode
    // is designed to allow — the code is not a secret) — never raw exception
    // text, stack traces, or provider response bodies.
    const isSanctioned = SANCTIONED_MESSAGES.includes(message as string);
    const isGenericWithCode = message === `The connection needs attention (${reason}).`;
    expect(isSanctioned || isGenericWithCode).toBe(true);
    expect(message).not.toMatch(/sk_live|merchant-secret|Bearer |password/i);
  });
});
