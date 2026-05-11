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
    match_status: string | null;
    candidate_cluster_id: string | null;
    confirmed_identity_id: string | null;
    signals_matched: unknown;
    customer_email: string | null;
    customer_name: string | null;
    // New identity-resolution contract fields
    identity_match_score: number | null;
    identity_match_grade: string | null;
    matched_datapoints: unknown;
    changed_datapoints: unknown;
    identity_evidence: unknown;
    evidence_summary: string | null;
    // Context fields (merchant decision support only)
    context_flags: unknown;
    context_summary: string | null;
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
        'order_id, processed_at, order_value, identity_score, identity_confidence_grade, cluster_id, match_status, candidate_cluster_id, confirmed_identity_id, signals_matched, customer_email, customer_name, identity_match_score, identity_match_grade, matched_datapoints, changed_datapoints, identity_evidence, evidence_summary, context_flags, context_summary'
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

  const headers = [
    'order_id',
    'processed_at',
    'order_value',
    'match_status',
    'identity_match_score',
    'identity_match_grade',
    'cluster_id',
    'candidate_cluster_id',
    'confirmed_identity_id',
    'customer_email',
    'customer_name',
    'matched_datapoints',
    'changed_datapoints',
    'evidence_summary',
    'identity_evidence',
    'context_flags',
    'context_summary',
    'recommended_review_reason',
    // Legacy columns (kept for backward compat)
    'identity_score',
    'identity_confidence_grade',
    'signals_matched',
  ];
  const csvLines: string[] = [headers.join(',')];

  for (const row of rows) {
    const signals = Array.isArray(row.signals_matched) ? (row.signals_matched as string[]).join('; ') : '';
    const matchedDp = Array.isArray(row.matched_datapoints) ? (row.matched_datapoints as string[]).join('; ') : '';
    const changedDp = Array.isArray(row.changed_datapoints) ? (row.changed_datapoints as string[]).join('; ') : '';
    const identityEvidenceStr = row.identity_evidence ? JSON.stringify(row.identity_evidence) : '';
    const contextFlagsStr = Array.isArray(row.context_flags)
      ? (row.context_flags as Array<{ flag?: string; detail?: string }>)
          .map((f) => `${f.flag ?? ''}: ${f.detail ?? ''}`)
          .join('; ')
      : '';

    // Build recommended_review_reason: identity first, context second
    const reviewParts: string[] = [];
    if (row.evidence_summary) reviewParts.push(row.evidence_summary);
    if (row.context_summary)  reviewParts.push(row.context_summary);
    const recommendedReviewReason = reviewParts.join(' ');

    const cells = [
      escapeCsvCell(row.order_id ?? ''),
      escapeCsvCell(row.processed_at ?? ''),
      row.order_value != null ? String(row.order_value) : '',
      escapeCsvCell(row.match_status ?? ''),
      row.identity_match_score != null ? String(Math.round(row.identity_match_score)) : '',
      escapeCsvCell(row.identity_match_grade ?? ''),
      escapeCsvCell(row.cluster_id ?? ''),
      escapeCsvCell(row.candidate_cluster_id ?? ''),
      escapeCsvCell(row.confirmed_identity_id ?? ''),
      escapeCsvCell(row.customer_email ?? ''),
      escapeCsvCell(row.customer_name ?? ''),
      escapeCsvCell(matchedDp),
      escapeCsvCell(changedDp),
      escapeCsvCell(row.evidence_summary ?? ''),
      escapeCsvCell(identityEvidenceStr),
      escapeCsvCell(contextFlagsStr),
      escapeCsvCell(row.context_summary ?? ''),
      escapeCsvCell(recommendedReviewReason),
      // Legacy columns
      row.identity_score != null ? String(Math.round(row.identity_score)) : '',
      escapeCsvCell(row.identity_confidence_grade ?? ''),
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
