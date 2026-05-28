import {
  API_KEY_PREFIX,
  apiKeyDisplayPrefix,
  generateApiKeyPlaintext,
  hashApiKey,
  isValidApiKeyFormat,
} from '@/lib/api/apiKeys';

describe('apiKeys', () => {
  it('generates keys with unauth_sk_ prefix and 32 hex chars', () => {
    const key = generateApiKeyPlaintext();
    expect(key.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(isValidApiKeyFormat(key)).toBe(true);
  });

  it('hashes deterministically', () => {
    const key = `${API_KEY_PREFIX}${'a'.repeat(32)}`;
    const h1 = hashApiKey(key);
    const h2 = hashApiKey(key);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it('builds display prefix from first 8 random chars', () => {
    const key = `${API_KEY_PREFIX}${'abcdef01'.padEnd(32, '0')}`;
    expect(apiKeyDisplayPrefix(key)).toBe(`${API_KEY_PREFIX}abcdef01...`);
  });

  it('rejects invalid formats', () => {
    expect(isValidApiKeyFormat('sk_live_abc')).toBe(false);
    expect(isValidApiKeyFormat(`${API_KEY_PREFIX}tooshort`)).toBe(false);
  });
});
