import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { parseCsvText } from '@/lib/imports/csv/parse';
import { processCsvRows } from '@/lib/imports/csv/processor';
import { CSV_DATASETS, isCsvDataset } from '@/lib/imports/csv/entitySchemas';
import { validateHeaderMapping } from '@/lib/imports/csv/mapping';
import { validateCsvSize, looksBinary, MAX_CSV_ROWS } from '@/lib/imports/csv/fileValidation';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  dataset: z.string(),
  mapping: z.record(z.string()),
  csv: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const serviceClient = createServiceClient();
  const { denied } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const { dataset, mapping, csv } = parsed.data;

  if (!isCsvDataset(dataset)) return NextResponse.json({ error: 'unsupported_dataset' }, { status: 400 });
  const size = validateCsvSize(Buffer.byteLength(csv, 'utf8'));
  if (!size.ok) return NextResponse.json({ error: size.code, message: size.message }, { status: 400 });
  if (looksBinary(csv)) return NextResponse.json({ error: 'binary_content' }, { status: 400 });

  const mappingValidation = validateHeaderMapping(mapping, CSV_DATASETS[dataset]);
  if (!mappingValidation.ok) return NextResponse.json({ error: mappingValidation.code, message: mappingValidation.message }, { status: 400 });

  const { rows, parseErrors } = parseCsvText(csv);
  if (rows.length > MAX_CSV_ROWS) return NextResponse.json({ error: 'too_many_rows', max: MAX_CSV_ROWS }, { status: 400 });

  const result = processCsvRows(dataset, mapping, rows);
  return NextResponse.json({
    dataset,
    total_rows: result.totalRows,
    valid_count: result.valid.length,
    error_count: result.errors.length,
    duplicates_skipped: result.duplicatesSkipped,
    parse_errors: parseErrors.slice(0, 20),
    errors: result.errors.slice(0, 100),
    preview: result.valid.slice(0, 5),
  });
}
