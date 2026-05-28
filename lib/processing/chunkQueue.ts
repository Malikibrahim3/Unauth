import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChunkDispatchPayload } from './chunkedDispatch';
import { dispatchChunk } from './chunkedDispatch';

export type ChunkBeginStatus = 'processing' | 'completed' | 'missing';

export async function registerProcessingJobChunks(
  service: SupabaseClient,
  payload: Pick<ChunkDispatchPayload, 'jobId' | 'merchantId' | 'totalChunks' | 'storagePath' | 'columnMap'>
): Promise<void> {
  const { error } = await service.rpc('register_processing_job_chunks' as never, {
    p_job_id: payload.jobId,
    p_merchant_id: payload.merchantId,
    p_total_chunks: payload.totalChunks,
    p_storage_path: payload.storagePath,
    p_column_map: payload.columnMap ?? null,
  });
  if (error) {
    throw new Error(`register_processing_job_chunks failed: ${error.message}`);
  }
}

export async function beginProcessingJobChunk(
  service: SupabaseClient,
  jobId: string,
  chunkIndex: number
): Promise<ChunkBeginStatus> {
  const { data, error } = await service.rpc('begin_processing_job_chunk' as never, {
    p_job_id: jobId,
    p_chunk_index: chunkIndex,
  });
  if (error) {
    throw new Error(`begin_processing_job_chunk failed: ${error.message}`);
  }
  const status = String(data ?? 'missing');
  if (status === 'completed' || status === 'processing' || status === 'missing') {
    return status;
  }
  return 'missing';
}

export async function completeProcessingJobChunk(
  service: SupabaseClient,
  jobId: string,
  chunkIndex: number
): Promise<void> {
  const { error } = await service.rpc('complete_processing_job_chunk' as never, {
    p_job_id: jobId,
    p_chunk_index: chunkIndex,
  });
  if (error) {
    throw new Error(`complete_processing_job_chunk failed: ${error.message}`);
  }
}

export async function failProcessingJobChunk(
  service: SupabaseClient,
  jobId: string,
  chunkIndex: number,
  message: string
): Promise<void> {
  await service.rpc('fail_processing_job_chunk' as never, {
    p_job_id: jobId,
    p_chunk_index: chunkIndex,
    p_error: message,
  });
}

export async function nextPendingChunkIndex(
  service: SupabaseClient,
  jobId: string
): Promise<number | null> {
  const { data, error } = await service.rpc('next_pending_processing_chunk_index' as never, {
    p_job_id: jobId,
  });
  if (error) {
    throw new Error(`next_pending_processing_chunk_index failed: ${error.message}`);
  }
  if (data === null || data === undefined) return null;
  return Number(data);
}

export async function tryClaimJobFinalize(
  service: SupabaseClient,
  jobId: string
): Promise<boolean> {
  const { data, error } = await service.rpc('try_claim_job_finalize' as never, {
    p_job_id: jobId,
  });
  if (error) {
    throw new Error(`try_claim_job_finalize failed: ${error.message}`);
  }
  return Boolean(data);
}

/** After a chunk finishes, dispatch the next pending chunk or finalize when all are done. */
export async function scheduleFollowingChunkWork(
  service: SupabaseClient,
  origin: string,
  body: ChunkDispatchPayload,
  dispatchFinalize: (origin: string, payload: ChunkDispatchPayload) => Promise<void>
): Promise<void> {
  const nextIndex = await nextPendingChunkIndex(service, body.jobId);
  if (nextIndex !== null) {
    await dispatchChunk(origin, { ...body, chunkIndex: nextIndex });
    return;
  }

  // All chunks drained — dispatch finalisation. The finalize endpoint performs
  // the single authoritative claim (try_claim_job_finalize), so racing or
  // duplicate dispatches are deduped there. Claiming here would consume the
  // one-shot claim before the endpoint could, leaving the job stuck in
  // 'processing' forever (the endpoint then logs "Finalize already claimed").
  await dispatchFinalize(origin, body);
}
