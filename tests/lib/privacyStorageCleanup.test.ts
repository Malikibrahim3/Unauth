import { processPrivacyStorageCleanup } from '@/lib/privacy/storageCleanup';

describe('processPrivacyStorageCleanup', () => {
  it('removes only allow-listed Storage targets and acknowledges the owning lease', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({
        data: [{ id: 'job-1', bucket: 'evidence-packages', object_path: 'merchant/evidence.pdf' }],
        error: null,
      })
      .mockResolvedValueOnce({ data: true, error: null });
    const remove = jest.fn().mockResolvedValue({ data: [], error: null });
    const client = { rpc, storage: { from: jest.fn(() => ({ remove })) } } as any;

    const result = await processPrivacyStorageCleanup(client, { receiptId: 'receipt-1' });

    expect(result).toEqual({ claimed: 1, completed: 1, failed: 0 });
    expect(remove).toHaveBeenCalledWith(['merchant/evidence.pdf']);
    expect(rpc).toHaveBeenNthCalledWith(1, 'claim_privacy_storage_cleanup_jobs', expect.objectContaining({
      p_receipt_id: 'receipt-1',
    }));
    expect(rpc).toHaveBeenNthCalledWith(2, 'complete_privacy_storage_cleanup_job', expect.objectContaining({
      p_job_id: 'job-1',
    }));
  });

  it('does not touch an unknown bucket and records a retryable failure', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({
        data: [{ id: 'job-1', bucket: 'unknown-bucket', object_path: 'object' }],
        error: null,
      })
      .mockResolvedValueOnce({ data: true, error: null });
    const from = jest.fn();
    const client = { rpc, storage: { from } } as any;

    const result = await processPrivacyStorageCleanup(client);

    expect(result).toEqual({ claimed: 1, completed: 0, failed: 1 });
    expect(from).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenNthCalledWith(2, 'fail_privacy_storage_cleanup_job', expect.objectContaining({
      p_error: 'privacy_storage_target_not_allowed',
    }));
  });
});
