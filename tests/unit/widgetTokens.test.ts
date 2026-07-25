jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}));

import { createServiceClient } from '@/lib/supabase/server';
import {
  generateWidgetTokenPlaintext,
  hashWidgetToken,
  validateWidgetToken,
} from '@/lib/api/widgetTokens';

type QueryResult = {
  data: Record<string, unknown> | null;
  error: { message: string } | null;
};

function query(result: QueryResult) {
  const chain = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
}

function serviceWithResults(tokenResult: QueryResult, keyResult: QueryResult) {
  const tokenQuery = query(tokenResult);
  const keyQuery = query(keyResult);
  const from = jest
    .fn()
    .mockReturnValueOnce(tokenQuery)
    .mockReturnValueOnce(keyQuery);
  (createServiceClient as jest.Mock).mockReturnValue({ from });
  return { from, tokenQuery, keyQuery };
}

describe('widget token validation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('accepts a token only while its parent API key is active', async () => {
    const plaintext = generateWidgetTokenPlaintext();
    const token = {
      id: 'token-id',
      merchant_id: 'merchant-id',
      api_key_id: 'key-id',
      revoked_at: null,
    };
    const { tokenQuery, keyQuery } = serviceWithResults(
      { data: token, error: null },
      {
        data: { id: 'key-id', merchant_id: 'merchant-id', revoked_at: null },
        error: null,
      },
    );

    await expect(validateWidgetToken(plaintext)).resolves.toEqual({
      merchantId: 'merchant-id',
      apiKeyId: 'key-id',
      tokenId: 'token-id',
    });
    expect(tokenQuery.eq).toHaveBeenCalledWith('token_hash', hashWidgetToken(plaintext));
    expect(keyQuery.eq).toHaveBeenCalledWith('merchant_id', 'merchant-id');
  });

  it('rejects an active child token after its parent API key is revoked', async () => {
    const plaintext = generateWidgetTokenPlaintext();
    serviceWithResults(
      {
        data: {
          id: 'token-id',
          merchant_id: 'merchant-id',
          api_key_id: 'key-id',
          revoked_at: null,
        },
        error: null,
      },
      {
        data: {
          id: 'key-id',
          merchant_id: 'merchant-id',
          revoked_at: '2026-07-23T10:00:00.000Z',
        },
        error: null,
      },
    );

    await expect(validateWidgetToken(plaintext)).resolves.toEqual({
      status: 401,
      message: 'Invalid or revoked widget token',
    });
  });

  it('rejects an unpaired widget token', async () => {
    const plaintext = generateWidgetTokenPlaintext();
    const from = jest.fn().mockReturnValue(
      query({
        data: {
          id: 'token-id',
          merchant_id: 'merchant-id',
          api_key_id: null,
          revoked_at: null,
        },
        error: null,
      }),
    );
    (createServiceClient as jest.Mock).mockReturnValue({ from });

    await expect(validateWidgetToken(plaintext)).resolves.toEqual({
      status: 401,
      message: 'Invalid or revoked widget token',
    });
    expect(from).toHaveBeenCalledTimes(1);
  });
});
