import { NextRequest } from 'next/server';

jest.mock('@/lib/utils/env', () => ({ env: { CRON_SECRET: 'test-cron-secret' } }));
jest.mock('@/lib/supabase/server', () => ({ createServiceClient: jest.fn() }));
jest.mock('@/lib/engine/evidence/recompute', () => ({ recomputeEvidenceScoresForIdentities: jest.fn() }));

import { POST } from '@/app/api/cron/recompute-evidence-scores/route';

const { createServiceClient } = jest.requireMock('@/lib/supabase/server') as { createServiceClient: jest.Mock };
const { recomputeEvidenceScoresForIdentities } = jest.requireMock('@/lib/engine/evidence/recompute') as {
  recomputeEvidenceScoresForIdentities: jest.Mock;
};

const URL = 'http://localhost/api/cron/recompute-evidence-scores';

type Row = { identity_id: string | null };

// Fake service client whose claims scan returns the given pages, one per range() call.
function makeScanClient(pages: Row[][], opts?: { error?: { message: string } }) {
  let call = 0;
  const builder = {
    select: () => builder,
    gte: () => builder,
    not: () => builder,
    range: () => {
      if (opts?.error) return Promise.resolve({ data: null, error: opts.error });
      const data = pages[call] ?? [];
      call += 1;
      return Promise.resolve({ data, error: null });
    },
  };
  return { from: () => builder };
}

const post = (headers?: Record<string, string>) =>
  POST(new NextRequest(URL, { method: 'POST', headers }));

beforeEach(() => {
  createServiceClient.mockReset();
  recomputeEvidenceScoresForIdentities.mockReset();
});

describe('POST /api/cron/recompute-evidence-scores', () => {
  it('returns 401 without a bearer token and does no work', async () => {
    const res = await post();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorised' });
    expect(createServiceClient).not.toHaveBeenCalled();
    expect(recomputeEvidenceScoresForIdentities).not.toHaveBeenCalled();
  });

  it('returns 401 with the wrong bearer token', async () => {
    const res = await post({ authorization: 'Bearer nope' });
    expect(res.status).toBe(401);
    expect(recomputeEvidenceScoresForIdentities).not.toHaveBeenCalled();
  });

  it('recomputes the deduped, non-null identity set and returns a summary', async () => {
    createServiceClient.mockReturnValue(
      makeScanClient([[{ identity_id: 'a' }, { identity_id: 'b' }, { identity_id: 'a' }, { identity_id: null }]]),
    );
    recomputeEvidenceScoresForIdentities.mockResolvedValue({ total: 2, succeeded: 2, failed: 0, failures: [] });

    const res = await post({ authorization: 'Bearer test-cron-secret' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.window_days).toBe(365);
    expect(body.scanned_identities).toBe(2);
    expect(body.succeeded).toBe(2);

    expect(recomputeEvidenceScoresForIdentities).toHaveBeenCalledTimes(1);
    const idsArg = (recomputeEvidenceScoresForIdentities.mock.calls[0][0] as string[]).sort();
    expect(idsArg).toEqual(['a', 'b']);
  });

  it('pages past the 1000-row cap so no active identity is silently dropped', async () => {
    const page1: Row[] = Array.from({ length: 1000 }, (_, i) => ({ identity_id: `id-${i}` }));
    const page2: Row[] = [
      { identity_id: 'id-0' }, // duplicate of page 1
      { identity_id: 'x1' },
      { identity_id: 'x2' },
      { identity_id: null }, // filtered
      { identity_id: 'x3' },
    ];
    createServiceClient.mockReturnValue(makeScanClient([page1, page2]));
    recomputeEvidenceScoresForIdentities.mockResolvedValue({ total: 1003, succeeded: 1003, failed: 0, failures: [] });

    const res = await post({ authorization: 'Bearer test-cron-secret' });
    expect(res.status).toBe(200);
    expect((await res.json()).scanned_identities).toBe(1003); // 1000 + x1/x2/x3, dup + null removed
    expect((recomputeEvidenceScoresForIdentities.mock.calls[0][0] as string[]).length).toBe(1003);
  });

  it('returns 500 and does not recompute when the scan fails', async () => {
    createServiceClient.mockReturnValue(makeScanClient([], { error: { message: 'scan boom' } }));

    const res = await post({ authorization: 'Bearer test-cron-secret' });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/scan boom/);
    expect(recomputeEvidenceScoresForIdentities).not.toHaveBeenCalled();
  });
});
