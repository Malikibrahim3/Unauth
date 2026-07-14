const SAFE_CODE = /^([a-z][a-z0-9]*(?:[_-][a-z0-9]+)+)(?=[:\s(]|$)/i;
const SAFE_SINGLE_CODES = new Set([
  'connection_error',
  'forbidden',
  'revoked',
  'timeout',
  'unauthorized',
  'unavailable',
]);

/** Extract only a stable error category; never return provider/DB detail text. */
export function safeConnectionErrorCode(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const match = value.trim().match(SAFE_CODE);
    if (match) return match[1].toLowerCase().replaceAll('-', '_');
    const normalized = value.trim().toLowerCase().replaceAll('-', '_');
    if (SAFE_SINGLE_CODES.has(normalized)) return normalized;
  }
  return values.some((value) => typeof value === 'string' && value.trim()) ? 'connection_error' : null;
}

export function publicConnectionErrorMessage(...values: unknown[]): string | null {
  const code = safeConnectionErrorCode(...values);
  if (!code) return null;
  if (/auth|credential|token|revoked/.test(code)) {
    return 'Provider authorization needs attention. Reconnect the connection and retry.';
  }
  if (/rate_limit|timeout|network|unavailable/.test(code)) {
    return 'The provider is temporarily unavailable. Retry the connection shortly.';
  }
  return `The connection needs attention (${code}).`;
}
