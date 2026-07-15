/**
 * Canonical CSV import — file & cell validation. Independent of the deleted
 * fraud-audit CSV worker. Enforces size/row caps, rejects binary content, and
 * neutralizes CSV formula injection (cells starting with = + - @ or tab).
 *
 * See ARCHITECTURE.md §7.3.
 */
export const MAX_CSV_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_CSV_ROWS = 100_000;
export const ALLOWED_CSV_EXTENSIONS = ['csv', 'tsv'] as const;
export const ALLOWED_CSV_MIME = ['text/csv', 'text/tab-separated-values', 'text/plain', 'application/csv', 'application/vnd.ms-excel'];

export type FileValidationResult = { ok: true } | { ok: false; code: string; message: string };

export function validateCsvExtension(filename: string): FileValidationResult {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (!(ALLOWED_CSV_EXTENSIONS as readonly string[]).includes(ext)) {
    return { ok: false, code: 'invalid_extension', message: `Only ${ALLOWED_CSV_EXTENSIONS.join('/')} files are supported.` };
  }
  return { ok: true };
}

export function validateCsvMime(mime: string | null | undefined): FileValidationResult {
  if (mime && !ALLOWED_CSV_MIME.includes(mime)) {
    return { ok: false, code: 'invalid_content_type', message: `Unsupported content type: ${mime}` };
  }
  return { ok: true };
}

export function validateCsvSize(byteLength: number): FileValidationResult {
  if (byteLength > MAX_CSV_BYTES) return { ok: false, code: 'file_too_large', message: `File exceeds ${MAX_CSV_BYTES} bytes.` };
  if (byteLength === 0) return { ok: false, code: 'empty_file', message: 'File is empty.' };
  return { ok: true };
}

/** Reject content containing NUL bytes (binary masquerading as CSV). */
export function looksBinary(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 0) return true;
  }
  return false;
}

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/** Neutralize spreadsheet formula injection by prefixing risky cells with a quote. */
export function sanitizeCell(value: string): string {
  if (value.length > 0 && FORMULA_PREFIXES.includes(value[0])) {
    return `'${value}`;
  }
  return value;
}

export function sanitizeRow(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) out[k] = sanitizeCell(v ?? '');
  return out;
}
