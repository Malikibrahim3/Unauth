import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { enforceRateLimit, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';

// ---------------------------------------------------------------------------
// CSV cell escaping — neutralizes formula injection (CVE-class: CSV injection).
// Cells beginning with =, +, -, @, tab (0x09) or CR (0x0D) are prefixed with
// a single-quote so spreadsheet apps (Excel, Sheets) treat them as text.
// Cells containing commas or double-quotes are also quoted per RFC 4180.
// ---------------------------------------------------------------------------
function escapeCsvCell(value: string): string {
  if (!value) return '';
  // Neutralize formula-leading characters
  const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];
  if (FORMULA_PREFIXES.some((p) => value.startsWith(p))) {
    value = `'${value}`;
  }
  // RFC 4180: quote cells containing comma, double-quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function GETHandler(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  // ── Auth + permission ─────────────────────────────────────────────────────
  const userClient = await createClient();
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.EXPORT_AUDIT);
  if (denied) return denied;
  const scopedClient = createScopedClient(ctx.merchantId, serviceClient);

  const limited = await enforceRateLimit(
    rateLimitKey('audit', 'export', ctx.merchantId),
    limitFromEnv('RL_AUDIT_EXPORT_PER_HOUR', 60, 3600, 'RL_AUDIT_EXPORT_WINDOW_SECONDS')
  );
  if (limited) return limited;

  // ── Verify ownership (must belong to this merchant) ──────────────────────
  const { data: job, error: jobError } = await scopedClient
    .from('processing_jobs')
    .select('id, merchant_id')
    .eq('id', runId)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const rows: Array<{
    order_id: string | null;
    processed_at: string | null;
    order_value: number | null;
    identity_score: number | null;
    identity_confidence_grade: string | null;
    cluster_id: string | null;
    signals_matched: unknown;
    customer_email: string | null;
    customer_name: string | null;
  }> = [];

  // Determine total rows expected so we can detect truncation.
  const { count: totalCount } = await serviceClient
    .from('audit_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', runId);

  const expectedTotalRows = totalCount ?? 0;

  const PAGE_SIZE = 1000;
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error: txError } = await serviceClient
      .from('audit_transactions')
      .select(
        'order_id, processed_at, order_value, identity_score, identity_confidence_grade, cluster_id, signals_matched, customer_email, customer_name'
      )
      .eq('job_id', runId)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (txError) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    rows.push(...(data as unknown as typeof rows));
    if (data.length < PAGE_SIZE) break;
  }

  // Sanity-check — warn in headers if we got fewer rows than expected.
  const rowsIncomplete = !(rows.length >= expectedTotalRows);

  // Build CSV — all user-supplied values pass through escapeCsvCell to prevent
  // formula injection when exported files are opened in Excel / Sheets.
  const headers = [
    'order_id',
    'processed_at',
    'order_value',
    'identity_score',
    'identity_confidence_grade',
    'cluster_id',
    'customer_email',
    'customer_name',
    'signals_matched',
  ];
  const csvLines: string[] = [headers.join(',')];

  for (const row of rows) {
    const signals = Array.isArray(row.signals_matched) ? (row.signals_matched as string[]).join('; ') : '';
    const cells = [
      escapeCsvCell(row.order_id ?? ''),
      escapeCsvCell(row.processed_at ?? ''),
      row.order_value != null ? String(row.order_value) : '',
      row.identity_score != null ? String(Math.round(row.identity_score)) : '',
      escapeCsvCell(row.identity_confidence_grade ?? ''),
      escapeCsvCell(row.cluster_id ?? ''),
      escapeCsvCell(row.customer_email ?? ''),
      escapeCsvCell(row.customer_name ?? ''),
      escapeCsvCell(signals),
    ];
    csvLines.push(cells.join(','));
  }

  const csv = csvLines.join('\n');
  const fileName = `audit-${runId.slice(0, 8)}.csv`;

  // ── Audit log ─────────────────────────────────────────────────────────────
  logAction({
    ctx,
    action: 'export_audit',
    resourceType: 'processing_job',
    resourceId: runId,
    metadata: { rowCount: rows.length },
    ip,
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      ...(rowsIncomplete ? { 'X-Export-Warning': `Expected ${expectedTotalRows} rows, exported ${rows.length}` } : {}),
    },
  });
}

export const GET = withRequestLogging('/api/audit/[runId]/export', GETHandler);
