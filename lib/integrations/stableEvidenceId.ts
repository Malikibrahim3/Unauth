import { createHash } from 'node:crypto';

/** Deterministic evidence row id for idempotent provider sync upserts. */
export function stableEvidenceId(
  merchantId: string,
  sourceProvider: string,
  evidenceType: string,
  rawReference: string,
): string {
  const hash = createHash('sha256')
    .update(`${merchantId}:${sourceProvider}:${evidenceType}:${rawReference}`, 'utf8')
    .digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `8${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}
