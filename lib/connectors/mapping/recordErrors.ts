/**
 * Record-level mapping errors. Collected during normalization; a required-field
 * error means the canonical entity is NOT produced (visible ingestion error
 * instead of a partial record). Never carries raw secrets/PII — only a hash.
 */
import { createHash } from 'crypto';

export type RecordErrorSeverity = 'info' | 'warning' | 'error';

export type RecordError = {
  field: string;
  code: string;
  severity: RecordErrorSeverity;
  message: string;
  rawValueHash?: string;
};

export function hashRawValue(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex').slice(0, 32);
}

export function recordError(
  field: string,
  code: string,
  message: string,
  opts: { severity?: RecordErrorSeverity; rawValue?: unknown } = {},
): RecordError {
  return {
    field,
    code,
    severity: opts.severity ?? 'error',
    message,
    ...(opts.rawValue !== undefined ? { rawValueHash: hashRawValue(opts.rawValue) } : {}),
  };
}

export function hasBlockingError(errors: RecordError[]): boolean {
  return errors.some((e) => e.severity === 'error');
}
