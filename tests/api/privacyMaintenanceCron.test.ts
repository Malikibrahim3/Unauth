import { NextRequest } from 'next/server';

jest.mock('@/lib/utils/env', () => ({ env: { CRON_SECRET: 'test-cron-secret' } }));
jest.mock('@/lib/supabase/server', () => ({ createServiceClient: jest.fn() }));
jest.mock('@/lib/privacy/storageCleanup', () => ({ processPrivacyStorageCleanup: jest.fn() }));

import { createServiceClient } from '@/lib/supabase/server';
import { processPrivacyStorageCleanup } from '@/lib/privacy/storageCleanup';
import { POST } from '@/app/api/cron/purge-expired-audits/route';

const request = (authorization?: string) => new NextRequest(
  'http://localhost/api/cron/purge-expired-audits',
  { method: 'POST', headers: authorization ? { authorization } : undefined },
);

describe('privacy retention cron', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects missing authentication before opening a service client', async () => {
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('reports counted explicit-deadline payload and Storage maintenance', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: { payloads_purged: 2, field_errors_deleted: 1, external_payload_refs_blocked: 0 },
      error: null,
    });
    (createServiceClient as jest.Mock).mockReturnValue({ rpc });
    (processPrivacyStorageCleanup as jest.Mock).mockResolvedValue({ claimed: 1, completed: 1, failed: 0 });

    const response = await POST(request('Bearer test-cron-secret'));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('purge_expired_ingestion_payloads', { p_limit: 1000 });
    expect(await response.json()).toEqual({
      rawIngestion: { payloads_purged: 2, field_errors_deleted: 1, external_payload_refs_blocked: 0 },
      privacyStorage: { claimed: 1, completed: 1, failed: 0 },
    });
  });

  it('returns a retryable failure when leased Storage cleanup cannot run', async () => {
    (createServiceClient as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: { payloads_purged: 1 }, error: null }),
    });
    (processPrivacyStorageCleanup as jest.Mock).mockRejectedValue(new Error('storage unavailable'));
    const response = await POST(request('Bearer test-cron-secret'));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: 'Privacy storage cleanup remains queued.' });
  });
});
