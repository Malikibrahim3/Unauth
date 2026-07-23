import {
  claimProcessedWebhook,
  completeProcessedWebhook,
} from '@/lib/commerce/processedWebhookHandler';
import { createHash } from 'node:crypto';

function makeClient(
  claimResult: { data: unknown; error: unknown },
  completionResult: { data: unknown; error: unknown } = { data: true, error: null },
) {
  const rpc = jest.fn(async (name: string) =>
    name === 'claim_processed_webhook' ? claimResult : completionResult
  );
  const client = { rpc } as any;
  return { client, rpc };
}

describe('claimProcessedWebhook (atomic RPC)', () => {
  it('calls the atomic claim RPC with the composite key and returns not-duplicate when claimed', async () => {
    const { client, rpc } = makeClient({
      data: { status: 'claimed', claim_token: '10000000-0000-4000-8000-000000000001' },
      error: null,
    });
    const res = await claimProcessedWebhook(client, {
      platform: 'woocommerce', storeKey: 'store', nativeWebhookId: 'evt1', topic: 'order.created',
      rawBody: '{}',
    });
    expect(rpc).toHaveBeenCalledWith('claim_processed_webhook', {
      p_key: 'woocommerce:store:evt1',
      p_provider: 'woocommerce',
      p_store_key: 'store',
      p_topic: 'order.created',
      p_payload_hash: createHash('sha256').update('{}').digest('hex'),
      p_lease_seconds: 300,
      p_object_key: null,
      p_event_version: null,
    });
    expect(res).toEqual({
      status: 'claimed',
      duplicate: false,
      conflict: false,
      retry: false,
      stale: false,
      idempotencyKey: 'woocommerce:store:evt1',
      claimToken: '10000000-0000-4000-8000-000000000001',
    });
  });

  it('reports a duplicate when the RPC says the delivery already completed', async () => {
    const stored = { status: 201, body: { id: 'entity-1' } };
    const { client } = makeClient({ data: { status: 'duplicate', result: stored }, error: null });
    const res = await claimProcessedWebhook(client, {
      platform: 'shopify', storeKey: 's.myshopify.com', nativeWebhookId: 'w9', topic: 'orders/create',
      rawBody: '{"id":9}',
    });
    expect(res.duplicate).toBe(true);
    expect(res).toMatchObject({ result: stored });
  });

  it('surfaces delivery-id reuse with a modified payload as a conflict', async () => {
    const { client } = makeClient({ data: { status: 'conflict' }, error: null });
    const res = await claimProcessedWebhook(client, {
      platform: 'shopify', storeKey: 's.myshopify.com', nativeWebhookId: 'w9', topic: 'orders/create',
      rawBody: '{"id":10}',
    });
    expect(res).toMatchObject({ status: 'conflict', conflict: true, duplicate: false });
  });

  it('passes source-object ordering metadata and requests retry while another version is active', async () => {
    const { client, rpc } = makeClient({ data: { status: 'busy' }, error: null });
    const res = await claimProcessedWebhook(client, {
      platform: 'shopify', storeKey: 's.myshopify.com', nativeWebhookId: 'w10', topic: 'orders/updated',
      rawBody: '{"id":9}', objectKey: 'order:9', eventVersion: 1_790_000_000_000,
    });

    expect(rpc).toHaveBeenCalledWith('claim_processed_webhook', expect.objectContaining({
      p_object_key: 'order:9',
      p_event_version: 1_790_000_000_000,
    }));
    expect(res).toMatchObject({ status: 'busy', retry: true, duplicate: false });
  });

  it('reports a completed newer object version as an observable stale delivery', async () => {
    const { client } = makeClient({ data: { status: 'stale' }, error: null });
    const res = await claimProcessedWebhook(client, {
      platform: 'shopify', storeKey: 's.myshopify.com', nativeWebhookId: 'w-old', topic: 'orders/updated',
      rawBody: '{"id":9}', objectKey: 'order:9', eventVersion: 1_780_000_000_000,
    });
    expect(res).toMatchObject({ status: 'stale', stale: true, retry: false });
  });

  it('throws a stable error code on RPC failure', async () => {
    const { client } = makeClient({ data: null, error: { message: 'boom' } });
    await expect(
      claimProcessedWebhook(client, { platform: 'woocommerce', storeKey: 's', nativeWebhookId: 'e', topic: 't', rawBody: '{}' }),
    ).rejects.toThrow(/processed_webhook_claim_failed/);
  });

  it('completeProcessedWebhook uses the claim token as a fencing value', async () => {
    const { client, rpc } = makeClient({ data: null, error: null });
    await completeProcessedWebhook(client, 'k1', '10000000-0000-4000-8000-000000000001', 'completed', null);
    expect(rpc).toHaveBeenCalledWith('complete_processed_webhook', {
      p_key: 'k1',
      p_claim_token: '10000000-0000-4000-8000-000000000001',
      p_status: 'completed',
      p_last_error: null,
      p_result: null,
    });
  });

  it('stores a successful response for exact replay', async () => {
    const { client, rpc } = makeClient({ data: null, error: null });
    const result = { status: 201, body: { id: 'entity-1' } };
    await completeProcessedWebhook(
      client,
      'k1',
      '10000000-0000-4000-8000-000000000001',
      'completed',
      null,
      result,
    );
    expect(rpc).toHaveBeenCalledWith('complete_processed_webhook', expect.objectContaining({
      p_result: result,
    }));
  });
});
