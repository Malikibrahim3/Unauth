/**
 * Canonical CSV import — safe UTF-8 parse via papaparse. Header row → object
 * rows. Independent of the deleted fraud-audit CSV pipeline.
 */
import Papa from 'papaparse';

export type ParsedCsv = { headers: string[]; rows: Array<Record<string, string>>; parseErrors: string[] };

export function parseCsvText(text: string, delimiter?: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter: delimiter ?? '',
    transformHeader: (h) => h.trim(),
  });
  const headers = (result.meta.fields ?? []).map((h) => h.trim());
  const parseErrors = (result.errors ?? []).map((e) => `${e.type}:${e.code} @row ${e.row ?? '?'}`);
  return { headers, rows: result.data ?? [], parseErrors };
}
