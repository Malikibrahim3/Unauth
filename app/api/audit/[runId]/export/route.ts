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

  // Fetch high + critical transactions for this job
  const { data: rows, error: txError } = await serviceClient
    .from('audit_transactions')
    .select(
      'order_id, processed_at, order_value, match_score, risk_level, customer_email, customer_name, fraud_flags'
    )
    .eq('job_id', runId)
    .in('risk_level', ['high', 'critical'])
    .order('match_score', { ascending: false })
    .limit(10000);

  if (txError) {
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }

  // Build CSV
  const headers = ['order_id', 'processed_at', 'order_value', 'match_score', 'risk_level', 'customer_email', 'customer_name', 'top_signals'];
  const csvLines: string[] = [headers.join(',')];

  for (const row of rows ?? []) {
    const flags = Array.isArray(row.fraud_flags) ? (row.fraud_flags as string[]).join('; ') : '';
    const cells = [
      row.order_id ?? '',
      row.processed_at ?? '',
      row.order_value != null ? String(row.order_value) : '',
      row.match_score != null ? String(Math.round(row.match_score)) : '',,
      row.risk_level ?? '',
      row.customer_email ? `"${row.customer_email.replace(/"/g, '""')}"` : '',
      row.customer_name ? `"${row.customer_name.replace(/"/g, '""')}"` : '',
      flags ? `"${flags.replace(/"/g, '""')}"` : '',
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
    metadata: { rowCount: rows?.length ?? 0 },
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
