jest.mock('@/lib/commerce/processedWebhookHandler', () => ({
  claimProcessedWebhook: jest.fn(),
  completeProcessedWebhook: jest.fn(),
}));

import {
  claimProcessedWebhook,
  completeProcessedWebhook,
} from '@/lib/commerce/processedWebhookHandler';
import {
  claimApiIngestRequest,
  completeApiIngestRequest,
  normalizeApiIdempotencyKey,
} from '@/lib/api/v1/ingest/requestIdempotency';

const client = {} as any;
const claimed = {
  status: 'claimed' as const,
  duplicate: false as const,
  conflict: false as const,
  retry: false as const,
  stale: false as const,
  idempotencyKey: 'canonical-api:merchant-a:order:key-1',
  claimToken: '10000000-0000-4000-8000-000000000001',
};

describe('canonical entity request idempotency', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects empty and oversized keys without silently truncating them', () => {
    expect(normalizeApiIdempotencyKey('  ')).toBeNull();
    expect(normalizeApiIdempotencyKey('x'.repeat(256))).toBeNull();
    expect(normalizeApiIdempotencyKey(' key-1 ')).toBe('key-1');
  });

  it('scopes the native key by merchant and resource before claiming', async () => {
    (claimProcessedWebhook as jest.Mock).mockResolvedValue(claimed);
    const result = await claimApiIngestRequest(client, {
      merchantId: 'merchant-a',
      resource: 'order',
      idempotencyKey: 'key-1',
      rawBody: '{"external_id":"O1"}',
    });

    expect(claimProcessedWebhook).toHaveBeenCalledWith(client, {
      platform: 'canonical-api',
      storeKey: 'merchant-a',
      nativeWebhookId: 'order:key-1',
      topic: 'api.v1.order',
      rawBody: '{"external_id":"O1"}',
    });
    expect(result).toMatchObject({ state: 'claimed', claimToken: claimed.claimToken });
  });

  it('replays the original response for a completed duplicate', async () => {
    (claimProcessedWebhook as jest.Mock).mockResolvedValue({
      status: 'duplicate', duplicate: true, conflict: false, retry: false, stale: false,
      idempotencyKey: claimed.idempotencyKey,
      result: { status: 201, body: { id: 'order-1', result: 'created' } },
    });
    await expect(claimApiIngestRequest(client, {
      merchantId: 'merchant-a', resource: 'order', idempotencyKey: 'key-1', rawBody: '{}',
    })).resolves.toEqual({
      state: 'response', status: 201, body: { id: 'order-1', result: 'created' },
    });
  });

  it('surfaces modified-payload reuse and active work without executing effects', async () => {
    (claimProcessedWebhook as jest.Mock).mockResolvedValueOnce({
      status: 'conflict', conflict: true, duplicate: false, retry: false, stale: false,
      idempotencyKey: claimed.idempotencyKey,
    });
    await expect(claimApiIngestRequest(client, {
      merchantId: 'merchant-a', resource: 'case', idempotencyKey: 'key-1', rawBody: '{"x":1}',
    })).resolves.toMatchObject({ state: 'response', status: 409 });

    (claimProcessedWebhook as jest.Mock).mockResolvedValueOnce({
      status: 'in_progress', conflict: false, duplicate: false, retry: true, stale: false,
      idempotencyKey: claimed.idempotencyKey,
    });
    await expect(claimApiIngestRequest(client, {
      merchantId: 'merchant-a', resource: 'case', idempotencyKey: 'key-1', rawBody: '{"x":1}',
    })).resolves.toMatchObject({ state: 'response', status: 503, retryAfterSeconds: 2 });
  });

  it('stores the exact successful HTTP result behind the fenced claim', async () => {
    (completeProcessedWebhook as jest.Mock).mockResolvedValue(undefined);
    await completeApiIngestRequest(client, {
      state: 'claimed',
      idempotencyKey: claimed.idempotencyKey,
      claimToken: claimed.claimToken,
    }, {
      status: 201,
      body: { id: 'order-1' },
    });
    expect(completeProcessedWebhook).toHaveBeenCalledWith(
      client,
      claimed.idempotencyKey,
      claimed.claimToken,
      'completed',
      null,
      { status: 201, body: { id: 'order-1' } },
    );
  });
});
