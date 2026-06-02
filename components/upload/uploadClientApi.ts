import type { DuplicateWarning, FilePreflightResult } from '@/components/upload/uploadClientTypes';
import { CSV_TEMPLATE_HEADERS, EXAMPLE_ROW } from '@/components/upload/uploadClientConstants';

function normalizeCsvHeaders(headers: string[]): string[] {
  const normalized: string[] = [];
  for (const header of headers) {
    const trimmed = header.trim();
    if (trimmed.length > 0) normalized.push(trimmed);
  }
  return normalized;
}

export async function validateCsvFile(fileToCheck: File, headers: string[]): Promise<FilePreflightResult> {
  const lowerName = fileToCheck.name.toLowerCase();
  const looksLikeCsv =
    lowerName.endsWith('.csv') || fileToCheck.type === 'text/csv' || fileToCheck.type === 'application/vnd.ms-excel';
  if (!looksLikeCsv) {
    return { ok: false, message: 'Please upload a .csv file.' };
  }
  if (fileToCheck.size === 0) {
    return { ok: false, message: 'This CSV is empty. Please upload a file with a header row and at least one order.' };
  }
  const normalizedHeaders = normalizeCsvHeaders(headers);
  if (normalizedHeaders.length === 0) {
    return { ok: false, message: 'We could not find a header row in this CSV.' };
  }
  if (normalizedHeaders.length === 1 && !normalizedHeaders[0].includes(',')) {
    return { ok: false, message: 'This file does not look like a CSV export. Please upload a comma-separated CSV.' };
  }
  const sampleText = await fileToCheck.slice(0, 64 * 1024).text();
  const rows: string[] = [];
  for (const line of sampleText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length > 0) rows.push(trimmed);
  }
  if (rows.length < 2) {
    return { ok: false, message: 'This CSV has a header row but no order rows. Please upload a file with at least one order.' };
  }
  const dangerousCell = rows
    .slice(1, 51)
    .some((line) =>
      line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).some((cell) => /^[=+\-@\t\r]/.test(cell.trim().replace(/^"+|"+$/g, ''))),
    );
  return {
    ok: true,
    warnings: dangerousCell
      ? ['Some cells look like spreadsheet formulas. We will treat them as plain text in exports.']
      : undefined,
  };
}

export async function checkDuplicateFile(hash: string): Promise<DuplicateWarning | null> {
  const res = await fetch('/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checkDuplicateOnly: true, fileHash: hash }),
  });
  if (res.status === 409) {
    const body = await res.json();
    return {
      existingRunId: body.existingRunId,
      existingFilename: body.existingFilename,
      existingLabel: body.existingLabel,
      existingCreatedAt: body.existingCreatedAt,
      existingStatus: body.existingStatus,
    };
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status} checking duplicate upload`);
  }
  return null;
}

export async function hashFile(f: File): Promise<string> {
  const buf = await f.arrayBuffer();
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function downloadTemplate() {
  const csv = `${CSV_TEMPLATE_HEADERS}\n${EXAMPLE_ROW}\n`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'unauth-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function storageUploadErrorMessage(uploadError: { message?: string; error?: string }): string {
  return uploadError.message ?? uploadError.error ?? JSON.stringify(uploadError);
}
