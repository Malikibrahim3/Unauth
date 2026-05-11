import { detectDelimiter, splitHeaderLine, stripBom } from './sniffer';

export const CSV_MAGIC_BYTE_SAMPLE_SIZE = 512;

export type CsvMagicByteFailureReason =
  | 'invalid_extension'
  | 'empty_file'
  | 'binary_file'
  | 'invalid_text_encoding'
  | 'not_csv';

export interface CsvMagicByteResult {
  valid: boolean;
  hasBom: boolean;
  delimiter?: string;
  reason?: CsvMagicByteFailureReason;
  message?: string;
}

const ALLOWED_CSV_EXTENSIONS = /\.(csv|tsv)$/i;
const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;
const JSON_START_CHARS = new Set(['{', '[']);
const NON_CSV_START_CHARS = new Set(['<']);

function startsWithUtf8Bom(bytes: Uint8Array): boolean {
  return (
    bytes.length >= UTF8_BOM.length &&
    bytes[0] === UTF8_BOM[0] &&
    bytes[1] === UTF8_BOM[1] &&
    bytes[2] === UTF8_BOM[2]
  );
}

function hasDisallowedControlByte(bytes: Uint8Array): boolean {
  for (const byte of bytes) {
    if (byte === 0x09 || byte === 0x0a || byte === 0x0d) continue;
    if (byte < 0x20 || byte === 0x7f) return true;
  }
  return false;
}

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function firstNonEmptyLine(text: string): string {
  const withoutBom = stripBom(text);
  return withoutBom
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? '';
}

function isCsvLikeText(text: string): { ok: boolean; delimiter?: string } {
  const leading = stripBom(text).trimStart();
  if (!leading) return { ok: false };

  const firstChar = leading[0];
  if (JSON_START_CHARS.has(firstChar) || NON_CSV_START_CHARS.has(firstChar)) {
    return { ok: false };
  }

  const line = firstNonEmptyLine(text);
  if (!line) return { ok: false };

  const delimiter = detectDelimiter(line);
  if (!line.includes(delimiter)) return { ok: false };

  const headers = splitHeaderLine(line, delimiter).filter((header) => header.trim().length > 0);
  if (headers.length < 2) return { ok: false };

  return { ok: true, delimiter };
}

export async function sniffCsvMagicBytes(
  file: Blob,
  fileName: string,
): Promise<CsvMagicByteResult> {
  if (!ALLOWED_CSV_EXTENSIONS.test(fileName)) {
    return {
      valid: false,
      hasBom: false,
      reason: 'invalid_extension',
      message: 'Only .csv and .tsv uploads are supported.',
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      hasBom: false,
      reason: 'empty_file',
      message: 'CSV file is empty.',
    };
  }

  const sampleBuffer = await file.slice(0, CSV_MAGIC_BYTE_SAMPLE_SIZE).arrayBuffer();
  const sample = new Uint8Array(sampleBuffer);
  const hasBom = startsWithUtf8Bom(sample);

  if (sample.includes(0) || hasDisallowedControlByte(sample)) {
    return {
      valid: false,
      hasBom,
      reason: 'binary_file',
      message: 'CSV upload appears to be a binary file.',
    };
  }

  const decoded = decodeUtf8(sample);
  if (decoded === null) {
    return {
      valid: false,
      hasBom,
      reason: 'invalid_text_encoding',
      message: 'CSV upload must be valid UTF-8 text.',
    };
  }

  const csvLike = isCsvLikeText(decoded);
  if (!csvLike.ok) {
    return {
      valid: false,
      hasBom,
      reason: 'not_csv',
      message: 'CSV upload does not look like a delimited CSV or TSV file.',
    };
  }

  return {
    valid: true,
    hasBom,
    delimiter: csvLike.delimiter,
  };
}
