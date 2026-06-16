import Papa from 'papaparse';
import { validateHeaders, validateRows } from './validate';
import type { ValidationResult } from './validate';
import { cleanRow, cleanHeader } from './clean';

export const MAX_ROWS = 100_000;
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export interface ParseResult {
  rows: Record<string, string>[];
  headers: string[];
  validation: ValidationResult;
}

export function parseCsvBuffer(buffer: Buffer | string): ParseResult {
  const content = typeof buffer === 'string' ? buffer : buffer.toString('utf-8');

  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().toLowerCase(),
  });

  const rawHeaders = result.meta.fields ?? [];
  const headers = rawHeaders.map(cleanHeader);
  const rows = result.data;

  const { missingRequired } = validateHeaders(headers);
  if (missingRequired.length > 0) {
    return {
      rows: [],
      headers,
      validation: {
        valid: false,
        rowCount: 0,
        errorCount: missingRequired.length,
        errors: missingRequired.map((col) => ({
          row: 1,
          field: col,
          message: `Required column "${col}" is missing from the CSV header.`,
        })),
        warnings: [],
        hasGroundTruth: false,
      },
    };
  }

  const truncated = rows.slice(0, MAX_ROWS);
  const cleaned = truncated.map((row) => cleanRow(row as Record<string, unknown>));
  const validation = validateRows(cleaned as Record<string, string>[], headers);

  return { rows: cleaned as Record<string, string>[], headers, validation };
}
