/**
 * Declarative field-mapping engine. A provider mapping is a list of FieldMapping
 * declarations; `applyMapping` runs them against a raw record and returns the
 * canonical field bag plus any record errors. Each mapping declares its
 * canonical field, source path(s), whether it is required, a transformer, a
 * fallback, and error severity — as required by the plan.
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §3.
 */
import { readPath } from '@/lib/connectors/mapping/normalizeValue';
import { recordError, type RecordError, type RecordErrorSeverity } from '@/lib/connectors/mapping/recordErrors';

export type MappingContext = { currency?: string; raw: Record<string, unknown> };

export type FieldMapping = {
  canonicalField: string;
  /** Source dot-paths, tried in order; the first non-null wins. */
  sourcePaths: string[];
  required?: boolean;
  /** Transform the raw value. Return undefined if it cannot be produced. */
  transform?: (raw: unknown, ctx: MappingContext) => unknown;
  fallback?: unknown;
  errorSeverity?: RecordErrorSeverity;
  /** Whether the raw source attribute may be retained in raw_metadata. */
  retainRaw?: boolean;
};

export type MappingResult = {
  value: Record<string, unknown>;
  errors: RecordError[];
};

export function applyMapping(
  mappings: FieldMapping[],
  raw: Record<string, unknown>,
  ctx: Omit<MappingContext, 'raw'> = {},
): MappingResult {
  const value: Record<string, unknown> = {};
  const errors: RecordError[] = [];
  const context: MappingContext = { ...ctx, raw };

  for (const m of mappings) {
    let rawValue: unknown = undefined;
    for (const path of m.sourcePaths) {
      const v = readPath(raw, path);
      if (v != null) { rawValue = v; break; }
    }

    let out = m.transform ? m.transform(rawValue, context) : rawValue;
    if (out === undefined || out === null) out = m.fallback ?? null;

    if ((out === null || out === undefined) && m.required) {
      errors.push(
        recordError(m.canonicalField, 'required_field_missing', `Required field '${m.canonicalField}' is missing`, {
          severity: m.errorSeverity ?? 'error',
          rawValue,
        }),
      );
      continue;
    }
    value[m.canonicalField] = out ?? null;
  }

  return { value, errors };
}
