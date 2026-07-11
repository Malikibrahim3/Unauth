import {
  claimProcessedWebhook,
  completeProcessedWebhook,
} from '@/lib/commerce/processedWebhookHandler';

function makeClient(rpcResult: { data: unknown; error: unknown }) {
  const rpc = jest.fn(async () => rpcResult);
  const updateBuilder: any = {
    update: jest.fn(() => updateBuilder),
    eq: jest.fn(async () => ({ error: null })),
  };
  const client = { rpc, from: jest.fn(() => updateBuilder) } as any;
  return { client, rpc, updateBuilder };
}

describe('claimProcessedWebhook (atomic RPC)', () => {
  it('calls the atomic claim RPC with the composite key and returns not-duplicate when claimed', async () => {
    const { client, rpc } = makeClient({ data: false, error: null });
    const res = await claimProcessedWebhook(client, {
      platform: 'woocommerce', storeKey: 'store', nativeWebhookId: 'evt1', topic: 'order.created',
    });
    expect(rpc).toHaveBeenCalledWith('claim_processed_webhook', {
      p_key: 'woocommerce:store:evt1',
      p_provider: 'woocommerce',
      p_store_key: 'store',
      p_topic: 'order.created',
    });
    expect(res).toEqual({ duplicate: false, idempotencyKey: 'woocommerce:store:evt1' });
  });

  it('reports a duplicate when the RPC returns true (already completed)', async () => {
    const { client } = makeClient({ data: true, error: null });
    const res = await claimProcessedWebhook(client, {
      platform: 'shopify', storeKey: 's.myshopify.com', nativeWebhookId: 'w9', topic: 'orders/create',
    });
    expect(res.duplicate).toBe(true);
  });

  it('throws a stable error code on RPC failure', async () => {
    const { client } = makeClient({ data: null, error: { message: 'boom' } });
    await expect(
      claimProcessedWebhook(client, { platform: 'woocommerce', storeKey: 's', nativeWebhookId: 'e', topic: 't' }),
    ).rejects.toThrow(/processed_webhook_claim_failed/);
  });

  it('completeProcessedWebhook updates status by idempotency key', async () => {
    const { client, updateBuilder } = makeClient({ data: null, error: null });
    await completeProcessedWebhook(client, 'k1', 'completed', null);
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', last_error: null }),
    );
    expect(updateBuilder.eq).toHaveBeenCalledWith('idempotency_key', 'k1');
  });
});
