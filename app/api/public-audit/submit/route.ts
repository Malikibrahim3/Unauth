import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { streamParseCsv, MAX_ROWS } from '@/lib/processing/streamParser';
import { createJob, updateJobTotalRows, completeJob } from '@/lib/processing/job';
import { uploadChunkRows, dispatchChunk, originFromRequest } from '@/lib/processing/chunkedDispatch';
import { checkCsvUsageGuard } from '@/lib/processing/supabaseUsageGuard';
import { sniffCsvMagicBytes } from '@/lib/csv/sniffMagicBytes';
import { enforceRateLimit, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';
import { createRequestLogger } from '@/lib/log';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  createRequestLogger(request, '/api/public-audit/submit');

  const limited = await enforceRateLimit(
    rateLimitKey('public-audit', 'submit', request.headers.get('x-forwarded-for') ?? 'unknown'),
    limitFromEnv('RL_PUBLIC_AUDIT_PER_HOUR', 20, 3600, 'RL_PUBLIC_AUDIT_WINDOW_SECONDS')
  );
  if (limited) return limited;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'Invalid form submission.' }, { status: 400 });
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const upload = formData.get('file');
  const columnMapRaw = String(formData.get('columnMap') ?? '{}');

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }
  if (!(upload instanceof File)) {
    return NextResponse.json({ error: 'A CSV file is required.' }, { status: 400 });
  }
  if (!upload.name.toLowerCase().endsWith('.csv')) {
    return NextResponse.json({ error: 'Only .csv files are supported.' }, { status: 400 });
  }

  if (upload.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the 50 MB limit (${(upload.size / 1024 / 1024).toFixed(1)} MB).` },
      { status: 400 }
    );
  }

  let columnMap: Record<string, string> | null = null;
  try {
    columnMap = JSON.parse(columnMapRaw);
  } catch {
    return NextResponse.json({ error: 'Invalid column map.' }, { status: 400 });
  }

  const merchantId = process.env.PUBLIC_INTAKE_MERCHANT_ID ?? '';
  if (!merchantId) {
    return NextResponse.json({ error: 'Public audit intake is not configured.' }, { status: 503 });
  }

  const sc = createServiceClient();

  // Per-email daily cap: 3 submissions per calendar day (UTC).
  const todayUtc = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const { count: todayCount } = await sc
    .from('public_audits' as any)
    .select('id', { count: 'exact', head: true })
    .eq('submitted_email', email)
    .gte('created_at', `${todayUtc}T00:00:00Z`)
    .lte('created_at', `${todayUtc}T23:59:59Z`);

  if ((todayCount ?? 0) >= 3) {
    return NextResponse.json(
      { error: 'You have already submitted 3 audits today. Try again tomorrow.' },
      { status: 429 }
    );
  }

  const { data: publicAudit, error: insertPublicError } = await sc
    .from('public_audits' as any)
    .insert({
      submitted_email: email,
      original_filename: upload.name,
      status: 'submitted',
    } as any)
    .select('id')
    .single();

  if (insertPublicError || !publicAudit) {
    return NextResponse.json({ error: insertPublicError?.message ?? 'Failed to create audit.' }, { status: 500 });
  }

  const auditId = (publicAudit as { id: string }).id;
  const scopedClient = createScopedClient(merchantId, sc);
  const filePath = `${merchantId}/${Date.now()}_${upload.name}`;

  const { error: uploadError } = await sc.storage
    .from('merchant-csv-uploads-2')
    .upload(filePath, upload, {
      contentType: 'text/csv',
      upsert: false,
      cacheControl: '3600',
    });

  if (uploadError) {
    await sc.from('public_audits' as any).update({ status: 'failed' } as any).eq('id', auditId);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  await sc
    .from('public_audits' as any)
    .update({
      csv_path: filePath,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', auditId);

  const { data: fileData, error: downloadError } = await sc.storage
    .from('merchant-csv-uploads-2')
    .download(filePath);
  if (downloadError || !fileData) {
    await sc.from('public_audits' as any).update({ status: 'failed' } as any).eq('id', auditId);
    return NextResponse.json({ error: downloadError?.message ?? 'Failed to read uploaded CSV.' }, { status: 500 });
  }

  const magicBytes = await sniffCsvMagicBytes(upload, upload.name);
  if (!magicBytes.valid) {
    await sc.from('public_audits' as any).update({ status: 'failed' } as any).eq('id', auditId);
    return NextResponse.json({ error: magicBytes.message ?? 'Invalid CSV upload.' }, { status: 400 });
  }

  let jobId: string;
  try {
    jobId = await createJob(scopedClient, merchantId, {
      filename: upload.name,
      label: 'Last 90 days',
      uploadType: 'standard',
    });
  } catch (err) {
    await sc.from('public_audits' as any).update({ status: 'failed' } as any).eq('id', auditId);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create job.' }, { status: 500 });
  }

  await sc
    .from('processing_jobs')
    .update({ public_audit_id: auditId } as any)
    .eq('id', jobId);

  await sc
    .from('public_audits' as any)
    .update({ processing_job_id: jobId, status: 'processing' } as any)
    .eq('id', auditId);

  const file = new File([fileData], upload.name, { type: 'text/csv' });

  let parseResult: Awaited<ReturnType<typeof streamParseCsv>>;
  try {
    parseResult = await streamParseCsv(file, columnMap, async (chunkRows, chunkIdx) => {
      await uploadChunkRows(scopedClient, jobId, chunkIdx, chunkRows);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'CSV parse failed';
    await completeJob(scopedClient, jobId, false, [{ message }]);
    await sc.from('public_audits' as any).update({ status: 'failed' } as any).eq('id', auditId);
    return NextResponse.json({ error: message }, { status: 422 });
  }

  if (!parseResult.valid) {
    await completeJob(scopedClient, jobId, false, [
      { message: `Missing required columns: ${parseResult.missingRequired.join(', ')}` },
    ]);
    await sc.from('public_audits' as any).update({ status: 'failed' } as any).eq('id', auditId);
    return NextResponse.json({ error: 'CSV validation failed.' }, { status: 422 });
  }
  if (parseResult.rowCount > MAX_ROWS) {
    await completeJob(scopedClient, jobId, false, [
      { message: `Row count ${parseResult.rowCount} exceeds limit of ${MAX_ROWS}` },
    ]);
    await sc.from('public_audits' as any).update({ status: 'failed' } as any).eq('id', auditId);
    return NextResponse.json({ error: `Row count exceeds limit of ${MAX_ROWS}.` }, { status: 422 });
  }

  await updateJobTotalRows(scopedClient, jobId, parseResult.rowCount);
  await sc.from('public_audits' as any).update({ row_count: parseResult.rowCount } as any).eq('id', auditId);

  const usageGuard = await checkCsvUsageGuard(scopedClient);
  if (usageGuard.shouldStop) {
    await completeJob(scopedClient, jobId, false, [
      { message: usageGuard.reason ?? 'Supabase usage guard stopped this run', code: 'SUPABASE_USAGE_GUARD' },
    ]);
    await sc.from('public_audits' as any).update({ status: 'failed' } as any).eq('id', auditId);
    return NextResponse.json({ error: usageGuard.reason ?? 'Usage limit reached.' }, { status: 429 });
  }

  await dispatchChunk(originFromRequest(request), {
    jobId,
    chunkIndex: 0,
    totalChunks: parseResult.totalChunks,
    merchantId,
    storagePath: filePath,
    columnMap,
  });

  return NextResponse.json({ auditId }, { status: 201 });
}
