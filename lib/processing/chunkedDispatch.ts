/* ────────────────────────────────────────────────────────────────────────────
 * 🔒 LOCKED FILE — DO NOT MODIFY WITHOUT EXPLICIT USER PERMISSION 🔒
 *
 * Helpers for the chunked CSV processing pipeline. Owns:
 *   - Storage layout for per-chunk JSON blobs
 *   - Server-to-server fire-and-forget chunk dispatch
 * Any change requires explicit user sign-off — see workspace memory rule
 * "Locked CSV upload pipeline".
 * ──────────────────────────────────────────────────────────────────────── */

import type { ParsedCsvRow } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { signChunkToken, INTERNAL_CHUNK_TOKEN_HEADER } from './internalAuth';

export const CHUNK_BUCKET = 'merchant-csv-uploads-2';
// Path uses .csv extension and we declare text/csv on upload because the
// bucket's MIME allow-list only permits text/csv. The body is still JSON —
// we read it back via Blob.text() + JSON.parse(), the declared MIME never
// matters to anything except the bucket policy.
export const chunkPath = (jobId: string, index: number) => `_chunks/${jobId}/${index}.csv`;
export const chunkPrefix = (jobId: string) => `_chunks/${jobId}`;
const CHUNK_CONTENT_TYPE = 'text/csv';

/** Upload one chunk's parsed rows to Storage as JSON-in-a-csv-blob.
 *  Uses Buffer (not Blob) — supabase-js storage on Node handles Buffer most
 *  reliably; Blob support depends on global Node Blob compat which varies. */
export async function uploadChunkRows(
  supabase: SupabaseClient,
  jobId: string,
  index: number,
  rows: ParsedCsvRow[]
): Promise<void> {
  const body = Buffer.from(JSON.stringify(rows), 'utf8');
  const { error } = await supabase.storage
    .from(CHUNK_BUCKET)
    .upload(chunkPath(jobId, index), body, {
      contentType: CHUNK_CONTENT_TYPE,
      upsert: true,
    });
  if (error) {
    throw new Error(
      `uploadChunkRows ${index} → ${chunkPath(jobId, index)} failed: ${error.message}`
    );
  }
}

/** Download and parse one chunk's rows from Storage. */
export async function downloadChunkRows(
  supabase: SupabaseClient,
  jobId: string,
  index: number
): Promise<ParsedCsvRow[]> {
  const { data, error } = await supabase.storage
    .from(CHUNK_BUCKET)
    .download(chunkPath(jobId, index));
  if (error || !data) throw new Error(`downloadChunkRows ${index} failed: ${error?.message ?? 'no data'}`);
  const text = await data.text();
  return JSON.parse(text) as ParsedCsvRow[];
}

/** Best-effort cleanup of all chunk JSON blobs for a job. */
export async function deleteChunkArtifacts(
  supabase: SupabaseClient,
  jobId: string,
  totalChunks: number
): Promise<void> {
  if (totalChunks <= 0) return;
  const paths = Array.from({ length: totalChunks }, (_, i) => chunkPath(jobId, i));
  const { error } = await supabase.storage.from(CHUNK_BUCKET).remove(paths);
  if (error) console.warn('[chunkedDispatch] chunk cleanup partial failure (non-fatal):', error.message);
}

export interface ChunkDispatchPayload {
  jobId: string;
  chunkIndex: number;
  totalChunks: number;
  merchantId: string;
  columnMap: Record<string, string> | null;
  storagePath: string;     // original CSV path (for cleanup at end)
}

/**
 * Fire-and-forget POST to /api/process-csv-chunk for the next chunk in the
 * chain. We DO NOT await response.body — the function completes and Vercel
 * picks up the new invocation independently. We do await the fetch promise
 * itself so the request is at least sent before we return.
 */
export async function dispatchChunk(
  origin: string,
  payload: ChunkDispatchPayload
): Promise<void> {
  const url = `${origin.replace(/\/$/, '')}/api/process-csv-chunk`;
  const token = signChunkToken(payload.jobId);

  // We use AbortController so we can cancel the body wait — the chunk worker
  // will independently complete on its own Vercel function instance.
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [INTERNAL_CHUNK_TOKEN_HEADER]: token,
      },
      body: JSON.stringify(payload),
      // keepalive lets the request survive the dispatcher's response close.
      keepalive: true,
    }).then((r) => {
      // Drain the body asynchronously; ignore the result.
      void r.body?.cancel();
    }).catch((err) => {
      console.error('[chunkedDispatch] dispatch fetch failed:', err);
    });
  } catch (err) {
    console.error('[chunkedDispatch] dispatch threw:', err);
  }
}

/** Compute origin URL from a NextRequest. Falls back to env var. */
export function originFromRequest(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
  if (env) return env.startsWith('http') ? env : `https://${env}`;
  // Derive from the incoming request URL.
  try {
    const u = new URL(req.url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:3000';
  }
}
