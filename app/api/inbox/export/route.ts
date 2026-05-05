import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { signalLabel } from '@/lib/copy/signalLabels';

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function topReason(signals: unknown): string {
  if (!Array.isArray(signals) || signals.length === 0) return 'Needs manual review';
  const first = signals.find((s) => typeof s === 'string') as string | undefined;
  if (!first) return 'Needs manual review';
  return signalLabel(first).short;
}

export async function GET() {
  const userClient = createClient();
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { denied } = await requirePermission(serviceClient, user.id, PERMISSIONS.EXPORT_AUDIT);
  if (denied) return denied;

  const { data: rows, error } = await serviceClient
    .from('audit_transactions')
    .select('order_id, processed_at, order_value, match_score, risk_level, customer_email, customer_name, signals_matched')
    .in('risk_level', ['high', 'critical'])
    .is('dismissed_by_merchant', false)
    .order('match_score', { ascending: false })
    .limit(10000);

  if (error) return NextResponse.json({ error: 'Failed to export queue' }, { status: 500 });

  const headers = [
    'order_id',
    'date',
    'risk_level',
    'score',
    'value_at_risk',
    'why_flagged',
    'customer_email',
    'customer_name',
  ];
  const lines = [headers.join(',')];

  for (const row of (rows ?? []) as any[]) {
    lines.push([
      row.order_id ?? '',
      row.processed_at ?? '',
      row.risk_level ?? '',
      row.match_score != null ? String(Math.round(row.match_score)) : '',
      row.order_value != null ? String(row.order_value) : '',
      csvEscape(topReason(row.signals_matched)),
      row.customer_email ? csvEscape(row.customer_email) : '',
      row.customer_name ? csvEscape(row.customer_name) : '',
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
