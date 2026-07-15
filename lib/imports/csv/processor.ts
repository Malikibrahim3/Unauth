/**
 * Canonical CSV import — row processor. Validates each row independently: valid
 * rows are never rolled back because another row is invalid (partial success),
 * invalid rows produce a row-specific error, and duplicates (by external id
 * within the file) are skipped. No domain events are emitted for invalid rows —
 * that is the commit job's responsibility, and only for the valid set.
 *
 * See ARCHITECTURE.md §7.3.
 */
import type { CsvDatasetKey, DatasetConfig, RowValue } from '@/lib/imports/csv/entitySchemas';
import { CSV_DATASETS } from '@/lib/imports/csv/entitySchemas';
import { applyHeaderMapping, type HeaderMapping } from '@/lib/imports/csv/mapping';
import { sanitizeRow } from '@/lib/imports/csv/fileValidation';
import { hasBlockingError } from '@/lib/connectors/mapping/recordErrors';

export type RowError = { row: number; field: string; code: string; message: string };
export type ProcessedRow = { row: number; externalId: string; entity: unknown };

export type ProcessResult = {
  dataset: CsvDatasetKey;
  valid: ProcessedRow[];
  errors: RowError[];
  duplicatesSkipped: number;
  totalRows: number;
};

function coerceNumbers(row: Record<string, RowValue>, numericFields: string[]): Record<string, RowValue> {
  const out = { ...row };
  for (const f of numericFields) {
    if (out[f] != null && out[f] !== '') {
      const n = Number(out[f]);
      out[f] = Number.isFinite(n) ? n : out[f]; // leave as-is so validation flags it
    }
  }
  return out;
}

export function processCsvRows(
  datasetKey: CsvDatasetKey,
  mapping: HeaderMapping,
  rawRows: Array<Record<string, string>>,
): ProcessResult {
  const dataset: DatasetConfig = CSV_DATASETS[datasetKey];
  const valid: ProcessedRow[] = [];
  const errors: RowError[] = [];
  const seenExternalIds = new Set<string>();
  let duplicatesSkipped = 0;

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 1;
    const mapped = coerceNumbers(applyHeaderMapping(sanitizeRow(raw), mapping), dataset.numericFields);
    const { externalId, entity, errors: rowErrors } = dataset.toCanonical(mapped);

    if (rowErrors.length > 0 && hasBlockingError(rowErrors)) {
      for (const e of rowErrors) errors.push({ row: rowNumber, field: e.field, code: e.code, message: e.message });
      return;
    }
    if (!externalId || !entity) {
      errors.push({ row: rowNumber, field: 'external_id', code: 'required_field_missing', message: 'external_id missing' });
      return;
    }
    if (seenExternalIds.has(externalId)) {
      duplicatesSkipped += 1;
      return;
    }
    seenExternalIds.add(externalId);
    valid.push({ row: rowNumber, externalId, entity });
  });

  return { dataset: datasetKey, valid, errors, duplicatesSkipped, totalRows: rawRows.length };
}
