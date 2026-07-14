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
});
