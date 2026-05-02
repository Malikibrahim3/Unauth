import Papa from 'papaparse';
import { Readable } from 'node:stream';
import { cleanHeader } from '../csv/clean';
import { validateHeaders } from '../csv/validate';
import type { ParsedCsvRow } from './types';

export const MAX_ROWS = 100_000;

export interface StreamParseResult {
  rows: ParsedCsvRow[];
  headers: string[];
  valid: boolean;
  missingRequired: string[];
  rowCount: number;
  hasGroundTruth: boolean;
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
  columnMap?: Record<string, string> | null
): Promise<StreamParseResult> {
  const rows: ParsedCsvRow[] = [];
  let parsedMeta: Papa.ParseMeta | null = null;

  // Build the remap table once, before parsing begins
  const headerRemap = buildHeaderRemapFromColumnMap(columnMap);

  const webStream = file.stream();
  const nodeStream = Readable.fromWeb(webStream as any);

  await new Promise<void>((resolve, reject) => {
    Papa.parse(nodeStream as any, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => {
        const lower = h.trim().toLowerCase();
        // If this header was explicitly mapped by the merchant, use that canonical name directly.
        // Otherwise fall back to the alias table in cleanHeader.
        return headerRemap.get(lower) ?? cleanHeader(h);
      },
      step: (result: Papa.ParseStepResult<ParsedCsvRow>, parser: Papa.Parser) => {
        if (rows.length >= MAX_ROWS) {
          parser.abort();
          return;
        }
        if (result.data) {
          rows.push(result.data);
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

  // After transformHeader, keys in each row are already canonical field names.
  // We just need the header list for validation — derive it from the first row.
  const canonicalHeaders = rows.length > 0 ? Object.keys(rows[0]) : [];
  const { missingRequired } = validateHeaders(canonicalHeaders);

  const hasGroundTruth = canonicalHeaders.includes('ground_truth_label');

  // parsedMeta referenced to satisfy the no-unused-vars lint rule
  void parsedMeta;

  return {
    rows,
    headers: canonicalHeaders,
    valid: missingRequired.length === 0,
    missingRequired,
    rowCount: rows.length,
    hasGroundTruth,
  };
}
