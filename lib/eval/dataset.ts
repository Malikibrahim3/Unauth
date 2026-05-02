/**
 * lib/eval/dataset.ts
 *
 * Loads a labelled CSV for engine evaluation.
 *
 * The labelled CSV format is identical to the standard order CSV, with one
 * additional column appended: `_label_is_fraud` (boolean: true/1 = fraud).
 * This column is stripped before any row reaches the scoring engine.
 */

import fs from 'fs';
import Papa from 'papaparse';
import { cleanRow } from '../csv/clean';
import { csvRowSchema } from '../csv/schema';
import { normaliseRow } from '../csv/normalise';
import type { NormalisedOrder } from '../engine/types';

export interface LabelledDataset {
  orders: NormalisedOrder[];
  labels: boolean[];
}

/**
 * Parse a labelled CSV file and return orders (stripped of labels) plus the
 * ground-truth label array in the same order.
 *
 * @throws if the file does not exist
 * @throws if `_label_is_fraud` column is absent
 */
export function loadLabelledCsv(filePath: string): LabelledDataset {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Labelled dataset not found at ${filePath} — regenerate it per FRAUD_RINGS_BREAKDOWN.md`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().toLowerCase(),
  });

  const rawHeaders = (parsed.meta.fields ?? []) as string[];
  if (!rawHeaders.includes('_label_is_fraud')) {
    throw new Error(
      `_label_is_fraud column is absent from ${filePath} — this CSV is not labelled. ` +
      `Add a boolean _label_is_fraud column (true/false or 1/0) to each row before running eval.`
    );
  }

  const orders: NormalisedOrder[] = [];
  const labels: boolean[] = [];

  for (const raw of parsed.data) {
    const rawLabel = raw['_label_is_fraud'];
    const isLabel =
      rawLabel === 'true' ||
      rawLabel === '1' ||
      rawLabel === 'TRUE' ||
      rawLabel === 'True';

    // Strip the label column — the engine must never see it.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _label_is_fraud: _stripped, ...rowWithoutLabel } = raw;

    const cleaned = cleanRow(rowWithoutLabel as Record<string, unknown>);
    const result = csvRowSchema.safeParse(cleaned);
    if (!result.success) {
      // Skip rows that fail schema validation (same behaviour as parseCsvBuffer)
      continue;
    }

    orders.push(normaliseRow(result.data));
    labels.push(isLabel);
  }

  return { orders, labels };
}
