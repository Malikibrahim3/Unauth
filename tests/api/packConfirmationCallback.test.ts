import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({ createServiceClient: jest.fn() }));
jest.mock('@/lib/fulfillment/packConfirmation', () => ({
  verifyPackConfirmationSignature: jest.fn(),
}));
jest.mock('@/lib/commerce/processedWebhookHandler', () => ({
  claimProcessedWebhook: jest.fn(),
  completeProcessedWebhook: jest.fn(),
}));
jest.mock('@/lib/integrations/canonicalEvidence', () => ({
  writeCanonicalEvidence: jest.fn(),
}));

import { createServiceClient } from '@/lib/supabase/server';
import { verifyPackConfirmationSignature } from '@/lib/fulfillment/packConfirmation';
import {
  claimProcessedWebhook,
  completeProcessedWebhook,
} from '@/lib/commerce/processedWebhookHandler';
import { writeCanonicalEvidence } from '@/lib/integrations/canonicalEvidence';
import { POST } from '@/app/api/fulfillment/pack-confirmation/route';

const MERCHANT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CLAIM_TOKEN = '10000000-0000-4000-8000-000000000001';
const CONFIRMATION = {
  id: 'confirmation-1',
  merchant_id: MERCHANT_ID,
  order_id: 'order-1',
  fulfillment_id: 'fulfillment-1',
  item_match_confirmed: true,
  photo_url: null,
  confirmed_at: '2026-07-22T10:00:00.000Z',
};

function url() {
  const value = new URL('http://localhost/api/fulfillment/pack-confirmation');
  value.searchParams.set('merchantId', MERCHANT_ID);
  value.searchParams.set('orderId', 'order-1');
  value.searchParams.set('fulfillmentId', 'fulfillment-1');
  value.searchParams.set('expiresAt', '2099-07-22T10:00:00.000Z');
  value.searchParams.set('token', 'signed-token-value');
  return value.toString();
}

function jsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(url(), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function makeClient(existing: Record<string, unknown> | null = null) {
  const inserts: unknown[] = [];
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => ({ data: existing, error: null }),
    insert: (value: unknown) => {
      inserts.push(value);
      return builder;
    },
    single: async () => ({ data: CONFIRMATION, error: null }),
  };
  const upload = jest.fn(async () => ({ error: null }));
  return {
    client: {
      from: jest.fn(() => builder),
      storage: { from: jest.fn(() => ({ upload })) },
    },
    inserts,
    upload,
  };
}

function claimed() {
  return {
    status: 'claimed', duplicate: false, conflict: false, retry: false, stale: false,
    idempotencyKey: `self-fulfillment:${MERCHANT_ID}:object`,
    claimToken: CLAIM_TOKEN,
  };
}

describe('signed pack-confirmation callback safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPackConfirmationSignature as jest.Mock).mockReturnValue(true);
    (claimProcessedWebhook as jest.Mock).mockResolvedValue(claimed());
    (completeProcessedWebhook as jest.Mock).mockResolvedValue(undefined);
    (writeCanonicalEvidence as jest.Mock).mockResolvedValue(undefined);
  });

  it('rejects an invalid signature before reading the body or creating a service client', async () => {
    (verifyPackConfirmationSignature as jest.Mock).mockReturnValue(false);
    const response = await POST(jsonRequest({}, { 'content-length': String(7 * 1024 * 1024) }));
    expect(response.status).toBe(401);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('rejects an oversized signed body before any database mutation', async () => {
    const response = await POST(jsonRequest({}, { 'content-length': String(7 * 1024 * 1024) }));
    expect(response.status).toBe(413);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('claims the exact body before inserting and stores the replay response', async () => {
    const mock = makeClient();
    (createServiceClient as jest.Mock).mockReturnValue(mock.client);

    const response = await POST(jsonRequest({ confirmed_by: 'Operator', item_match_confirmed: true }));

    expect(response.status).toBe(200);
    expect(claimProcessedWebhook).toHaveBeenCalledWith(mock.client, expect.objectContaining({
      platform: 'self-fulfillment',
      storeKey: MERCHANT_ID,
      topic: 'pack.confirmed',
      rawBody: expect.any(Uint8Array),
    }));
    expect(mock.inserts).toHaveLength(1);
    expect(writeCanonicalEvidence).toHaveBeenCalledTimes(1);
    expect(completeProcessedWebhook).toHaveBeenCalledWith(
      mock.client,
      claimed().idempotencyKey,
      CLAIM_TOKEN,
      'completed',
      null,
      expect.objectContaining({ status: 200 }),
    );
  });

  it('replays a completed response without re-running downstream effects', async () => {
    (claimProcessedWebhook as jest.Mock).mockResolvedValue({
      status: 'duplicate', duplicate: true, conflict: false, retry: false, stale: false,
      idempotencyKey: claimed().idempotencyKey,
      result: { status: 200, body: { ok: true, confirmation: { id: 'confirmation-1' } } },
    });
    const mock = makeClient();
    (createServiceClient as jest.Mock).mockReturnValue(mock.client);

    const response = await POST(jsonRequest({ item_match_confirmed: true }));

    expect(response.status).toBe(200);
    expect(mock.inserts).toHaveLength(0);
    expect(writeCanonicalEvidence).not.toHaveBeenCalled();
  });

  it('resumes canonical evidence after a partial failure without duplicating the confirmation', async () => {
    const mock = makeClient(CONFIRMATION);
    (createServiceClient as jest.Mock).mockReturnValue(mock.client);

    const response = await POST(jsonRequest({ item_match_confirmed: true }));

    expect(response.status).toBe(200);
    expect(mock.inserts).toHaveLength(0);
    expect(mock.upload).not.toHaveBeenCalled();
    expect(writeCanonicalEvidence).toHaveBeenCalledTimes(1);
    expect(completeProcessedWebhook).toHaveBeenCalledWith(
      mock.client,
      claimed().idempotencyKey,
      CLAIM_TOKEN,
      'completed',
      null,
      expect.any(Object),
    );
  });

  it('returns a retryable response while the same confirmation is in progress', async () => {
    (claimProcessedWebhook as jest.Mock).mockResolvedValue({
      status: 'in_progress', duplicate: false, conflict: false, retry: true, stale: false,
      idempotencyKey: claimed().idempotencyKey,
    });
    const mock = makeClient();
    (createServiceClient as jest.Mock).mockReturnValue(mock.client);

    const response = await POST(jsonRequest({ item_match_confirmed: true }));
    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('2');
    expect(mock.inserts).toHaveLength(0);
  });

  it('rejects a multipart file whose declared image type does not match its bytes', async () => {
    const form = new FormData();
    form.set('photo', new File([new Uint8Array([1, 2, 3, 4])], 'fake.jpg', { type: 'image/jpeg' }));
    const response = await POST(new NextRequest(url(), { method: 'POST', body: form }));
    expect(response.status).toBe(400);
    expect(createServiceClient).not.toHaveBeenCalled();
  });
});
