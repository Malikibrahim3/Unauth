/**
 * Field-value transformers for the declarative mapping layer.
 *
 * All timestamps become ISO UTC. All money becomes integer minor units + ISO
 * currency (via lib/canonical/money). Transformers return `undefined` for a
 * value they cannot produce, so the mapping engine can distinguish "absent" from
 * a real value and apply required/fallback rules.
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §3.
 */
import { toMinorUnits } from '@/lib/canonical/money';

/** Read a dotted path (e.g. "customer.email") from an object. */
export function readPath(obj: unknown, path: string): unknown {
  if (obj == null) return undefined;
  let cur: unknown = obj;
  for (const key of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

export function toStringOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

export function toIntOrNull(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** Parse a timestamp to ISO 8601 UTC (offsets normalized); null if unparseable. */
export function toIsoUtc(value: unknown): string | null {
  if (value == null || value === '') return null;
  const s = typeof value === 'number' ? value : String(value);
  const ms = typeof s === 'number' ? s : Date.parse(s);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

/** Convert a decimal amount ("84.00" | 84) to integer minor units for a currency. */
export function toMinor(value: unknown, currency: string): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return toMinorUnits(n, currency);
}

/** Already-minor integer (canonical API sends minor units directly). */
export function asMinor(value: unknown): number | null {
  return toIntOrNull(value);
}
