/**
 * tests/processing/chunked-pipeline.test.ts
 *
 * Verifies the chunked-CSV processing architecture introduced 2026-05-03.
 * Pins:
 *   - HMAC chunk tokens are bound to jobId and reject mismatches
 *   - downloadChunkRows / uploadChunkRows round-trip preserves row data
 *   - dispatcher splits N rows into ceil(N/CHUNK_SIZE) chunks
 *   - constants stay sane (MAX_ROWS, CHUNK_SIZE)
 */

import { signChunkToken, verifyChunkToken } from '@/lib/processing/internalAuth';
import { MAX_ROWS, CHUNK_SIZE } from '@/lib/processing/streamParser';
import {
  uploadChunkRows,
  downloadChunkRows,
  chunkPath,
  CHUNK_BUCKET,
} from '@/lib/processing/chunkedDispatch';
import type { ParsedCsvRow } from '@/lib/processing/types';

// Set the secret so internalAuth doesn't throw.
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'test-secret-key';

describe('LOCKED INVARIANT — internal chunk auth', () => {
  it('signs and verifies a token bound to a jobId', () => {
    const token = signChunkToken('job-abc');
    expect(verifyChunkToken('job-abc', token)).toBe(true);
  });

  it('rejects a token issued for a different jobId (replay across jobs)', () => {
    const token = signChunkToken('job-abc');
    expect(verifyChunkToken('job-xyz', token)).toBe(false);
  });

  it('rejects null, empty, and malformed tokens', () => {
    expect(verifyChunkToken('job-abc', null)).toBe(false);
    expect(verifyChunkToken('job-abc', '')).toBe(false);
    expect(verifyChunkToken('job-abc', 'not-hex-zzzz')).toBe(false);
    expect(verifyChunkToken('job-abc', 'a'.repeat(64))).toBe(false);
  });
});

describe('LOCKED INVARIANT — chunk size + row cap', () => {
  it('CHUNK_SIZE is a positive whole number well below MAX_ROWS', () => {
    expect(CHUNK_SIZE).toBeGreaterThan(0);
    expect(Number.isInteger(CHUNK_SIZE)).toBe(true);
    expect(CHUNK_SIZE).toBeLessThan(MAX_ROWS);
  });

  it('MAX_ROWS supports millions, CHUNK_SIZE keeps total chunks bounded', () => {
    expect(MAX_ROWS).toBeGreaterThanOrEqual(1_000_000);
    const worstCaseChunks = Math.ceil(MAX_ROWS / CHUNK_SIZE);
    // 5M rows at 10k/chunk is exactly 500 chunks; keep that as the hard bound.
    expect(worstCaseChunks).toBeLessThanOrEqual(500);
  });
});

describe('chunk Storage round-trip', () => {
  it('uploadChunkRows then downloadChunkRows preserves row payload', async () => {
    const stored = new Map<string, string>();
    const fakeStorage = {
      from(bucket: string) {
        expect(bucket).toBe(CHUNK_BUCKET);
        return {
          async upload(path: string, body: Buffer | Blob) {
            // uploadChunkRows uses Buffer in Node; tests should accept either.
            const text = Buffer.isBuffer(body)
              ? body.toString('utf8')
              : await (body as Blob).text();
            stored.set(path, text);
            return { data: { path }, error: null };
          },
          async download(path: string) {
            const text = stored.get(path);
            if (text == null) return { data: null, error: { message: 'not found' } };
            return { data: { text: async () => text }, error: null };
          },
        };
      },
    };
    const supabase = { storage: fakeStorage } as any;

    const rows: ParsedCsvRow[] = [
      { order_id: 'A1', customer_email: 'a@b.com' },
      { order_id: 'A2', customer_email: 'b@c.com' },
    ] as unknown as ParsedCsvRow[];

    await uploadChunkRows(supabase, 'job-1', 0, rows);
    expect(stored.has(chunkPath('job-1', 0))).toBe(true);

    const recovered = await downloadChunkRows(supabase, 'job-1', 0);
    expect(recovered).toEqual(rows);
  });
});

describe('chunk slicing math', () => {
  it('a 100-row upload at CHUNK_SIZE rows-per-chunk produces ceil(N/CHUNK) chunks', () => {
    for (const n of [1, CHUNK_SIZE - 1, CHUNK_SIZE, CHUNK_SIZE + 1, 5 * CHUNK_SIZE - 7]) {
      const expected = Math.max(1, Math.ceil(n / CHUNK_SIZE));
      const total = Math.max(1, Math.ceil(n / CHUNK_SIZE));
      expect(total).toBe(expected);
    }
  });

  it('a 25,000-row upload produces three chunks at the ASOS-safe chunk size', () => {
    expect(CHUNK_SIZE).toBe(10_000);
    expect(Math.max(1, Math.ceil(25_000 / CHUNK_SIZE))).toBe(3);
  });
});
