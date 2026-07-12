/**
 * Canonical CSV import — server-validated header mapping. A client-supplied
 * column map is NEVER trusted: every target must be an allowed canonical field
 * for the dataset. Applies the map to a raw CSV row to produce a canonical-keyed
 * row.
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §7.3.
 */
import type { DatasetConfig, RowValue } from '@/lib/imports/csv/entitySchemas';

export type HeaderMapping = Record<string, string>; // csvHeader -> canonicalField

export type MappingValidation =
  | { ok: true }
  | { ok: false; code: string; message: string; invalidTargets: string[] };

export function validateHeaderMapping(mapping: HeaderMapping, dataset: DatasetConfig): MappingValidation {
  const allowed = new Set(dataset.allowedFields);
  const invalidTargets = Object.values(mapping).filter((target) => !allowed.has(target));
  if (invalidTargets.length > 0) {
    return { ok: false, code: 'invalid_mapping', message: 'Column map targets fields not allowed for this dataset.', invalidTargets };
  }
  const mappedTargets = new Set(Object.values(mapping));
  const missingRequired = dataset.requiredFields.filter((f) => !mappedTargets.has(f));
  if (missingRequired.length > 0) {
    return { ok: false, code: 'missing_required_mapping', message: `Required fields not mapped: ${missingRequired.join(', ')}`, invalidTargets: missingRequired };
  }
  return { ok: true };
}

export function applyHeaderMapping(row: Record<string, string>, mapping: HeaderMapping): Record<string, RowValue> {
  const out: Record<string, RowValue> = {};
  for (const [csvHeader, canonicalField] of Object.entries(mapping)) {
    const v = row[csvHeader];
    out[canonicalField] = v == null || v === '' ? null : v;
  }
  return out;
}
