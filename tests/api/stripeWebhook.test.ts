import { NextRequest } from 'next/server';

jest.mock('@/lib/billing/stripeWebhooks', () => ({
  handleStripeWebhookEvent: jest.fn(),
}));
jest.mock('@/lib/billing/stripeClient', () => ({
  constructStripeEvent: jest.fn(),
  isStripeConfigured: jest.fn(),
}));
jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}));
jest.mock('@/lib/commerce/processedWebhookHandler', () => ({
  claimProcessedWebhook: jest.fn(),
  completeProcessedWebhook: jest.fn(),
}));

import { POST } from '@/app/api/webhooks/stripe/route';
import { handleStripeWebhookEvent } from '@/lib/billing/stripeWebhooks';
import { constructStripeEvent, isStripeConfigured } from '@/lib/billing/stripeClient';
import { createAdminClient } from '@/lib/supabase/server';
import {
  claimProcessedWebhook,
  completeProcessedWebhook,
} from '@/lib/commerce/processedWebhookHandler';

const TOKEN = '10000000-0000-4000-8000-000000000001';
const rawBody = '{"id":"evt_shared","type":"customer.subscription.updated"}';

function request(body = rawBody, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers: { 'stripe-signature': 't=1,v1=signed', ...headers },
  });
}

function event(account: string | null = 'acct_a') {
  return {
    id: 'evt_shared',
    account,
    type: 'customer.subscription.updated',
    created: 1_790_000_000,
    data: { object: { id: 'sub_1', metadata: {} } },
  };
}

describe('Stripe billing webhook boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isStripeConfigured as jest.Mock).mockReturnValue(true);
    (createAdminClient as jest.Mock).mockReturnValue({ name: 'admin' });
    (constructStripeEvent as jest.Mock).mockReturnValue(event());
    (claimProcessedWebhook as jest.Mock).mockResolvedValue({
      status: 'claimed',
      duplicate: false,
      conflict: false,
      idempotencyKey: 'stripe:acct_a:evt_shared',
      claimToken: TOKEN,
    });
    (completeProcessedWebhook as jest.Mock).mockResolvedValue(undefined);
    (handleStripeWebhookEvent as jest.Mock).mockResolvedValue(undefined);
  });

  it('verifies the exact bounded raw body before claiming or mutating', async () => {
    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(constructStripeEvent).toHaveBeenCalledWith(rawBody, 't=1,v1=signed');
    expect(claimProcessedWebhook).toHaveBeenCalledWith(expect.anything(), {
      platform: 'stripe',
      storeKey: 'acct_a',
      nativeWebhookId: 'evt_shared',
      topic: 'customer.subscription.updated',
      rawBody,
      objectKey: 'subscription:sub_1',
      eventVersion: 1_790_000_000_000,
    });
    expect(handleStripeWebhookEvent).toHaveBeenCalledTimes(1);
    expect(completeProcessedWebhook).toHaveBeenCalledWith(
      expect.anything(), 'stripe:acct_a:evt_shared', TOKEN, 'completed', null,
    );
  });

  it('rejects invalid or stale signatures before a claim or mutation', async () => {
    (constructStripeEvent as jest.Mock).mockImplementation(() => {
      throw new Error('Timestamp outside the tolerance zone');
    });

    const res = await POST(request());

    expect(res.status).toBe(400);
    expect(claimProcessedWebhook).not.toHaveBeenCalled();
    expect(handleStripeWebhookEvent).not.toHaveBeenCalled();
  });

  it('rejects oversized bodies before signature construction', async () => {
    const res = await POST(request('small', { 'content-length': String(1024 * 1024 + 1) }));

    expect(res.status).toBe(413);
    expect(constructStripeEvent).not.toHaveBeenCalled();
    expect(claimProcessedWebhook).not.toHaveBeenCalled();
  });

  it('deduplicates completed replays and surfaces modified-payload conflicts', async () => {
    (claimProcessedWebhook as jest.Mock)
      .mockResolvedValueOnce({
        status: 'duplicate', duplicate: true, conflict: false,
        idempotencyKey: 'stripe:acct_a:evt_shared',
      })
      .mockResolvedValueOnce({
        status: 'conflict', duplicate: false, conflict: true,
        idempotencyKey: 'stripe:acct_a:evt_shared',
      });

    const duplicate = await POST(request());
    const conflict = await POST(request('{"modified":true}'));

    expect(duplicate.status).toBe(200);
    await expect(duplicate.json()).resolves.toEqual({ received: true, duplicate: true });
    expect(conflict.status).toBe(409);
    expect(handleStripeWebhookEvent).not.toHaveBeenCalled();
  });

  it('retries object contention and ignores an already superseded event', async () => {
    (claimProcessedWebhook as jest.Mock)
      .mockResolvedValueOnce({
        status: 'busy', duplicate: false, conflict: false, retry: true, stale: false,
        idempotencyKey: 'stripe:acct_a:evt_shared',
      })
      .mockResolvedValueOnce({
        status: 'stale', duplicate: false, conflict: false, retry: false, stale: true,
        idempotencyKey: 'stripe:acct_a:evt_shared',
      });

    const busy = await POST(request());
    const stale = await POST(request());

    expect(busy.status).toBe(503);
    expect(busy.headers.get('retry-after')).toBe('1');
    expect(stale.status).toBe(200);
    await expect(stale.json()).resolves.toEqual({ received: true, ignored: 'stale_event' });
    expect(handleStripeWebhookEvent).not.toHaveBeenCalled();
  });

  it('returns 5xx on partial failure and completes a later retry', async () => {
    (handleStripeWebhookEvent as jest.Mock)
      .mockRejectedValueOnce(new Error('synthetic partial failure'))
      .mockResolvedValueOnce(undefined);

    const failed = await POST(request());
    const retried = await POST(request());

    expect(failed.status).toBe(500);
    expect(retried.status).toBe(200);
    expect(completeProcessedWebhook).toHaveBeenNthCalledWith(
      1, expect.anything(), 'stripe:acct_a:evt_shared', TOKEN, 'failed', 'synthetic partial failure',
    );
    expect(completeProcessedWebhook).toHaveBeenNthCalledWith(
      2, expect.anything(), 'stripe:acct_a:evt_shared', TOKEN, 'completed', null,
    );
  });

  it('scopes the same event identifier independently across Stripe accounts', async () => {
    (constructStripeEvent as jest.Mock)
      .mockReturnValueOnce(event('acct_a'))
      .mockReturnValueOnce(event('acct_b'));
    (claimProcessedWebhook as jest.Mock)
      .mockResolvedValueOnce({
        status: 'claimed', duplicate: false, conflict: false,
        idempotencyKey: 'stripe:acct_a:evt_shared', claimToken: TOKEN,
      })
      .mockResolvedValueOnce({
        status: 'claimed', duplicate: false, conflict: false,
        idempotencyKey: 'stripe:acct_b:evt_shared', claimToken: TOKEN,
      });

    expect((await POST(request())).status).toBe(200);
    expect((await POST(request())).status).toBe(200);
    expect((claimProcessedWebhook as jest.Mock).mock.calls.map((call) => call[1].storeKey))
      .toEqual(['acct_a', 'acct_b']);
    expect(handleStripeWebhookEvent).toHaveBeenCalledTimes(2);
  });
});
