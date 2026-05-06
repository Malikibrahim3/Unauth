/* ────────────────────────────────────────────────────────────────────────────
 * 🔒 LOCKED FILE — DO NOT MODIFY WITHOUT EXPLICIT USER PERMISSION 🔒
 *
 * Stream-parses CSV uploads. The MAX_ROWS cap protects the chunked pipeline
 * from runaway uploads; CHUNK_SIZE controls per-chunk wall-clock time on
 * Vercel functions (must finish well under the 300s function cap). Any
 * change requires explicit user sign-off — see workspace memory rule
 * "Locked CSV upload pipeline".
 * ──────────────────────────────────────────────────────────────────────── */

import Papa from 'papaparse';
import { Readable } from 'node:stream';
import { cleanHeader } from '../csv/clean';
import { validateHeaders } from '../csv/validate';
import { sniffHeaders } from '../csv/sniffer';
import type { ParsedCsvRow } from './types';

/** Hard cap on rows per upload. With CHUNK_SIZE=25k that's 200 chunks worst
 *  case — still bounded but covers all realistic merchant CSVs. */
export const MAX_ROWS = 5_000_000;

/** Rows per chunk. Sized so a single chunk fits comfortably inside the 300s
 *  Vercel function cap even with cross-merchant lookups + DB writes. */
export const CHUNK_SIZE = 25_000;

export interface StreamParseResult {
  /** Parsed rows. When onChunk is provided, this will be empty (rows are flushed to Storage).
   *  When onChunk is not provided, this contains all rows (backward-compatible). */
  rows: ParsedCsvRow[];
  headers: string[];
  valid: boolean;
  missingRequired: string[];
  rowCount: number;
  totalChunks: number;
  hasGroundTruth: boolean;
  /** Raw CSV headers that did not map to any known canonical field. Non-fatal — surface as a warning. */
  unmappedHeaders: string[];
}

/**
 * Build a lookup from raw CSV header (lowercased) → canonical field name,
 * using the merchant-confirmed column_map stored in csv_upload_queue.
 *
 * The column_map is keyed by canonical field name and valued by the actual
 * CSV header the merchant selected in the UI, e.g.:
 *   { customer_email: "Email Address", order_id: "Order #", ... }
 *
 * We invert it so we can rename during transformHeader.
 */
function buildHeaderRemapFromColumnMap(
  columnMap: Record<string, string> | null | undefined
): Map<string, string> {
  const remap = new Map<string, string>();
  if (!columnMap) return remap;
  for (const [canonicalField, csvHeader] of Object.entries(columnMap)) {
    if (csvHeader) {
      // Key: what PapaParse will see (lowercased raw header)
      // Value: the canonical field name the engine expects
      remap.set(csvHeader.trim().toLowerCase(), canonicalField);
    }
  }
  return remap;
}

export async function streamParseCsv(
  file: File,
  columnMap?: Record<string, string> | null,
  onChunk?: (rows: ParsedCsvRow[], chunkIndex: number) => Promise<void>
): Promise<StreamParseResult> {
  let rows: ParsedCsvRow[] = [];
  let chunkIndex = 0;
  let totalRowCount = 0;
  let parsedMeta: Papa.ParseMeta | null = null;
  let firstRowKeys: string[] | null = null;

  // Build the remap table once, before parsing begins
  const headerRemap = buildHeaderRemapFromColumnMap(columnMap);

  // ── Sniff the first chunk for BOM and delimiter ───────────────────────────
  // We read the first 16 KB as text, strip BOM if present, and detect the
  // delimiter so PapaParse gets an explicit hint rather than guessing.
  const SNIFF_BYTES = 16_384;
  const sniffSlice = file.slice(0, SNIFF_BYTES);
  const sniffText = await sniffSlice.text();
  const { delimiter: detectedDelimiter, hasBom } = sniffHeaders(sniffText);

  // When the file starts with a BOM we rebuild the File without the BOM byte
  // so PapaParse never sees it as part of the first header name.
  let parseTarget: File = file;
  if (hasBom) {
    const rawBuffer = await file.arrayBuffer();
    // UTF-8 BOM is 3 bytes: EF BB BF
    const stripped = rawBuffer.slice(3);
    parseTarget = new File([stripped], file.name, { type: file.type });
  }

  const webStream = parseTarget.stream();
  const nodeStream = Readable.fromWeb(webStream as any);

  await new Promise<void>((resolve, reject) => {
    Papa.parse(nodeStream as any, {
      header: true,
      skipEmptyLines: true,
      // Supply the sniffed delimiter so PapaParse doesn't have to guess.
      // PapaParse accepts '' to mean "auto-detect" — we always pass our own
      // result because our detector is quote-aware and already ran.
      delimiter: detectedDelimiter,
      transformHeader: (h: string) => {
        const lower = h.trim().toLowerCase();
        // If this header was explicitly mapped by the merchant, use that canonical name directly.
        // Otherwise fall back to the alias table in cleanHeader.
        return headerRemap.get(lower) ?? cleanHeader(h);
      },
      // PapaParse step is invoked synchronously and does NOT await Promises.
      // To keep memory bounded we must pause the parser while the chunk
      // upload runs, then resume it. Without pause/resume the parser keeps
      // pushing rows while the upload is in flight — defeating the streaming
      // memory bound and risking out-of-order chunk indices.
      step: (result: Papa.ParseStepResult<ParsedCsvRow>, parser: Papa.Parser) => {
        if (rows.length >= MAX_ROWS) {
          parser.abort();
          return;
        }
        if (!result.data) return;
        // Capture header keys from the first row before onChunk may clear them
        if (!firstRowKeys) firstRowKeys = Object.keys(result.data) as string[];
        rows.push(result.data);
        totalRowCount++;
        if (rows.length >= CHUNK_SIZE && onChunk) {
          const batch = rows;
          rows = [];
          const idx = chunkIndex++;
          parser.pause();
          // Retry up to 3 times with exponential back-off on transient errors.
          const MAX_RETRIES = 3;
          (async () => {
            let lastErr: unknown;
            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
              try {
                await onChunk(batch, idx);
                return;
              } catch (err) {
                lastErr = err;
                if (attempt < MAX_RETRIES - 1) {
                  await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
                }
              }
            }
            throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
          })()
            .then(() => parser.resume())
            .catch((err) => {
              parser.abort();
              reject(err instanceof Error ? err : new Error(String(err)));
            });
        }
      },
      complete: (results: any) => {
        parsedMeta = results.meta as Papa.ParseMeta | null;
        resolve();
      },
      error: (err: any) => {
        reject(new Error(`CSV parse error: ${err.message} (row ${err.row})`));
      },
    } as any);

    nodeStream.on('error', (err) => reject(err));
  });

  // Flush any remaining rows as the final chunk — with the same retry policy.
  if (rows.length > 0 && onChunk) {
    const idx = chunkIndex++;
    const finalBatch = rows;
    rows = [];
    const MAX_RETRIES = 3;
    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await onChunk(finalBatch, idx);
        lastErr = undefined;
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    if (lastErr) throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }
  const totalChunks = chunkIndex;

  // After transformHeader, keys in each row are already canonical field names.
  // We just need the header list for validation — derive it from the first row keys we captured.
  const canonicalHeaders: string[] = firstRowKeys ?? [];
  const { missingRequired, unknownColumns } = validateHeaders(canonicalHeaders);

  const hasGroundTruth = canonicalHeaders.includes('ground_truth_label');

  // parsedMeta referenced to satisfy the no-unused-vars lint rule
  void parsedMeta;

  return {
    rows,
    headers: canonicalHeaders,
    valid: missingRequired.length === 0,
    missingRequired,
    rowCount: totalRowCount,
    totalChunks,
    hasGroundTruth,
    unmappedHeaders: unknownColumns,
  };
}
