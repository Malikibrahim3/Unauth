import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { signalLabel } from '@/lib/copy/signalLabels';
import {
  escapeCsvCell,
  fetchMerchantReviewQueueRows,
} from '@/lib/supabase/merchantHelpers';

export const dynamic = 'force-dynamic';

function topReason(signals: unknown): string {
  if (!Array.isArray(signals) || signals.length === 0) return 'Needs manual review';
  const first = signals.find((s) => typeof s === 'string') as string | undefined;
  if (!first) return 'Needs manual review';
  return signalLabel(first).short;
}

export async function GET() {
  const userClient = createClient();
  const { data, error: authError } = await userClient.auth.getUser();
  const user = data?.user ?? null;
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.EXPORT_AUDIT);
  if (denied) return denied;

  // Use shared review-queue definition — same as inbox page. No drift possible.
  // Filters: identity_confidence_grade NOT NULL or match_status IN (candidate,probable,definite),
  //          dismissed_by_merchant != true, match_status != 'none'.
  // Order: identity_score DESC, processed_at DESC.
  let rows: Array<Record<string, unknown>>;
  try {
    const result = await fetchMerchantReviewQueueRows(serviceClient, ctx.merchantId, {
      paginate: true,
    });
    rows = result.rows;
  } catch {
    return NextResponse.json({ error: 'Failed to export queue' }, { status: 500 });
  }

  if (rows.length === 0) {
    const csv = ['order_id,date,confidence_grade,identity_score,value_at_risk,why_flagged,customer_email,customer_name'].join('\n');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="review-queue-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const headers = [
    'order_id',
    'date',
    'confidence_grade',
    'identity_score',
    'value_at_risk',
    'why_flagged',
    'customer_email',
    'customer_name',
  ];
  const lines = [headers.join(',')];

  for (const row of rows) {
    lines.push([
      escapeCsvCell(row.order_id ?? ''),
      escapeCsvCell(row.processed_at ?? ''),
      escapeCsvCell(row.identity_confidence_grade ?? row.match_status ?? ''),
      escapeCsvCell(row.identity_score != null ? String(Math.round(row.identity_score as number)) : ''),
      escapeCsvCell(row.order_value != null ? String(row.order_value) : ''),
      escapeCsvCell(topReason(row.signals_matched)),
      escapeCsvCell(row.customer_email ?? ''),
      escapeCsvCell(row.customer_name ?? ''),
    ].join(','));
  }

  const csv = lines.join('\n');
  const filename = `review-queue-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
