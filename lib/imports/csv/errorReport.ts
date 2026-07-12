/**
 * Canonical CSV import — row-level error report. Produces a downloadable CSV of
 * (row, field, code, message) so a merchant can fix and re-import only the
 * failed rows.
 */
import type { RowError } from '@/lib/imports/csv/processor';

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildErrorReportCsv(errors: RowError[]): string {
  const header = 'row,field,code,message';
  const lines = errors.map((e) => [String(e.row), e.field, e.code, e.message].map(csvEscape).join(','));
  return [header, ...lines].join('\n');
}
