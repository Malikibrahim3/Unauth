/**
 * lib/csv/sniffer.ts
 *
 * Lightweight CSV sniffer used by both the frontend UploadClient (via
 * sniffFile) and the backend streamParser (via sniffHeaders on the first
 * text chunk).
 *
 * Responsibilities:
 *  1. Strip UTF-8 BOM if present.
 *  2. Detect the column delimiter from the first line (comma, tab, semicolon,
 *     pipe) by counting occurrences outside quoted regions.
 *  3. Split the header row into tokens while honouring RFC-4180 double-quoted
 *     fields (a quoted field may contain the delimiter and be counted as one
 *     header, not several).
 *  4. Surface header collisions — two raw CSV headers that both map to the
 *     same canonical field after cleanHeader normalisation.
 */

import { cleanHeader } from './clean';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Maximum bytes to read when sniffing a File object. */
const SAMPLE_BYTES = 16_384; // 16 KB — enough for any real-world header row

const CANDIDATE_DELIMITERS = [',', '\t', ';', '|'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface SniffResult {
  /** Detected delimiter character (default ',' if ambiguous). */
  delimiter: string;
  /** Raw header strings as they appear in the CSV (BOM-stripped). */
  headers: string[];
  /**
   * Header collisions: groups where ≥2 raw headers normalise to the same
   * canonical field.  Show a warning in the UI / log on the backend.
   */
  collisions: Array<{ field: string; headers: string[] }>;
  /** True when the file started with a UTF-8 BOM (U+FEFF). */
  hasBom: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// BOM helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Strip leading UTF-8 BOM from a string, if present. */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delimiter detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Count how many times `delimiter` appears in `line` **outside** quoted
 * regions (simple RFC-4180: a `"` toggles in/out of a quoted region).
 */
function countDelimiterOutsideQuotes(line: string, delimiter: string): number {
  let count = 0;
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (!inQuote && ch === delimiter) {
      count++;
    }
  }
  return count;
}

/**
 * Detect the most likely delimiter in a CSV header line.
 * Returns ',' when no candidate clearly wins (empty line, binary data, etc.).
 */
export function detectDelimiter(line: string): string {
  let best: string = ',';
  let bestCount = 0;
  for (const c of CANDIDATE_DELIMITERS) {
    const n = countDelimiterOutsideQuotes(line, c);
    if (n > bestCount) {
      bestCount = n;
      best = c;
    }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// Header-line tokeniser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Split a single header line into tokens, honouring RFC-4180 double-quoting.
 * Outer double-quotes are stripped; `""` inside a quoted field → `"`.
 */
export function splitHeaderLine(line: string, delimiter: string): string[] {
  const headers: string[] = [];
  let current = '';
  let inQuote = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i += 2;
        continue;
      }
      inQuote = !inQuote;
    } else if (ch === delimiter && !inQuote) {
      headers.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
    i++;
  }

  // Last token
  headers.push(current.trim());
  return headers;
}

// ─────────────────────────────────────────────────────────────────────────────
// Collision detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect header collisions: two or more raw headers that normalise to the
 * same canonical field name via cleanHeader.
 */
function detectCollisions(
  headers: string[],
): Array<{ field: string; headers: string[] }> {
  const fieldToRaw = new Map<string, string[]>();

  for (const h of headers) {
    const canonical = cleanHeader(h);
    const existing = fieldToRaw.get(canonical) ?? [];
    existing.push(h);
    fieldToRaw.set(canonical, existing);
  }

  const collisions: Array<{ field: string; headers: string[] }> = [];
  for (const [field, raws] of fieldToRaw) {
    if (raws.length > 1) {
      collisions.push({ field, headers: raws });
    }
  }
  return collisions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main sniff entry-points
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sniff a raw CSV string (or the first text chunk of a stream).
 * Pass the full file text or at least the first 16 KB.
 */
export function sniffHeaders(rawText: string): SniffResult {
  const hasBom = rawText.charCodeAt(0) === 0xfeff;
  const text = hasBom ? rawText.slice(1) : rawText;

  const firstLine = text.split(/\r?\n/)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);
  const headers = splitHeaderLine(firstLine, delimiter);
  const collisions = detectCollisions(headers);

  return { delimiter, headers, collisions, hasBom };
}

/**
 * Async helper for the browser: read the first SAMPLE_BYTES of a File and
 * run sniffHeaders on it.
 */
export async function sniffFile(file: File): Promise<SniffResult> {
  const slice = file.slice(0, SAMPLE_BYTES);
  const text = await slice.text();
  return sniffHeaders(text);
}
