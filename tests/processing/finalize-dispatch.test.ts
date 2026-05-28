/**
 * tests/processing/finalize-dispatch.test.ts
 *
 * REGRESSION TEST for the finalize double-claim bug (2026-05-28).
 *
 * The finalize claim (try_claim_job_finalize) is one-shot: the first caller
 * sets finalize_claimed_at and wins, everyone else gets false. The finalize
 * ENDPOINT is the sole authoritative claimer because it is the thing that
 * actually runs finalizeJob() → completeJob() → status='completed'.
 *
 * If scheduleFollowingChunkWork() claims the finalize itself, it consumes the
 * one-shot claim before the endpoint runs; the endpoint's re-claim then returns
 * false, finalizeJob() never runs, the job stays 'processing' forever, and the
 * UI polls /progress until the 8-minute stale timeout. That is the "5-minute
 * hang on a 5-row CSV" symptom — independent of dataset size.
 */

jest.mock('@/lib/processing/chunkedDispatch', () => ({
  dispatchChunk: jest.fn().mockResolvedValue(undefined),
}));

import { scheduleFollowingChunkWork } from '@/lib/processing/chunkQueue';
import { dispatchChunk, type ChunkDispatchPayload } from '@/lib/processing/chunkedDispatch';
import type { SupabaseClient } from '@supabase/supabase-js';

function makeService(nextPendingIndex: number | null) {
  const rpc = jest.fn((fn: string) => {
    if (fn === 'next_pending_processing_chunk_index') {
      return Promise.resolve({ data: nextPendingIndex, error: null });
    }
    // try_claim_job_finalize would resolve TRUE if (wrongly) called from here —
    // the assertions below prove it is never reached.
    return Promise.resolve({ data: true, error: null });
  });
  const client = { rpc } as unknown as SupabaseClient;
  return { client, rpc };
}

const baseBody: ChunkDispatchPayload = {
  jobId: 'job-1',
  chunkIndex: 0,
  totalChunks: 3,
  merchantId: 'merchant-1',
  columnMap: null,
  storagePath: 'merchant-1/upload.csv',
};

const dispatchChunkMock = dispatchChunk as jest.MockedFunction<typeof dispatchChunk>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LOCKED INVARIANT — finalize claim is owned solely by the finalize endpoint', () => {
  it('dispatches finalize when all chunks are drained, WITHOUT consuming the claim', async () => {
    const { client, rpc } = makeService(null); // no pending chunks left
    const dispatchFinalize = jest.fn().mockResolvedValue(undefined);

    await scheduleFollowingChunkWork(client, 'http://localhost:3000', baseBody, dispatchFinalize);

    // Must hand off to finalisation exactly once…
    expect(dispatchFinalize).toHaveBeenCalledTimes(1);
    expect(dispatchFinalize).toHaveBeenCalledWith('http://localhost:3000', baseBody);

    // …and must NOT consume the one-shot finalize claim. This is the exact
    // double-claim regression that strands the job in 'processing'.
    const claimCalls = rpc.mock.calls.filter(([fn]) => fn === 'try_claim_job_finalize');
    expect(claimCalls).toHaveLength(0);
    expect(dispatchChunkMock).not.toHaveBeenCalled();
  });

  it('dispatches the next pending chunk and does not finalize while work remains', async () => {
    const { client } = makeService(2); // chunk index 2 still pending
    const dispatchFinalize = jest.fn().mockResolvedValue(undefined);

    await scheduleFollowingChunkWork(client, 'http://localhost:3000', baseBody, dispatchFinalize);

    expect(dispatchChunkMock).toHaveBeenCalledTimes(1);
    expect(dispatchChunkMock).toHaveBeenCalledWith('http://localhost:3000', { ...baseBody, chunkIndex: 2 });
    expect(dispatchFinalize).not.toHaveBeenCalled();
  });
});
