import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: { runId: string } }
) {
  const { runId } = params;
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

  // ── Verify ownership (must belong to this merchant) ──────────────────────
  const { data: job, error: jobError } = await serviceClient
    .from('processing_jobs')
    .select('id, merchant_id')
    .eq('id', runId)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (job.merchant_id !== ctx.merchantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

  const PAGE_SIZE = 1000;
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error: txError } = await serviceClient
      .from('audit_transactions')
      .select(
        'order_id, processed_at, order_value, identity_score, identity_confidence_grade, cluster_id, signals_matched, customer_email, customer_name'
      )
      .eq('job_id', runId)
      .not('identity_confidence_grade', 'is', null)
      .order('identity_score', { ascending: false, nullsFirst: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (txError) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    rows.push(...(data as unknown as typeof rows));
    if (data.length < PAGE_SIZE) break;
  }

  // Build CSV
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
      row.order_id ?? '',
      row.processed_at ?? '',
      row.order_value != null ? String(row.order_value) : '',
      row.identity_score != null ? String(Math.round(row.identity_score)) : '',
      row.identity_confidence_grade ?? '',
      row.cluster_id ?? '',
      row.customer_email ? `"${row.customer_email.replace(/"/g, '""')}"` : '',
      row.customer_name ? `"${row.customer_name.replace(/"/g, '""')}"` : '',
      signals ? `"${signals.replace(/"/g, '""')}"` : '',
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
    },
  });
}
