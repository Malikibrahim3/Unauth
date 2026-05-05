import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';

type AuditTx = {
  id: string;
  order_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  shipping_address: string | null;
  billing_address: string | null;
  order_value: number | null;
  payment_method: string | null;
  card_last4: string | null;
  device_ip: string | null;
  refund_claimed: boolean | null;
  refund_reason: string | null;
  chargeback_filed: boolean | null;
  match_score: number | null;
  risk_level: string | null;
  processed_at: string | null;
  identity_score?: number | null;
  identity_confidence_grade?: string | null;
  cluster_id?: string | null;
  signals_matched?: string[] | null;
};

function uniq(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((v) => v?.trim()).filter(Boolean) as string[]));
}

export async function GET(
  req: NextRequest,
  { params }: { params: { runId: string } }
) {
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_AUDIT);
  if (denied) return denied;

  const { data: job } = await serviceClient
    .from('processing_jobs')
    .select('id, merchant_id')
    .eq('id', params.runId)
    .single();

  if (!job || job.merchant_id !== ctx.merchantId) {
    return NextResponse.json({ error: 'Audit run not found' }, { status: 404 });
  }

  const { data: directRows, error: directError } = await serviceClient
    .from('audit_transactions')
    .select('*')
    .eq('job_id', params.runId)
    .eq('customer_email', email)
    .order('processed_at', { ascending: true });

  if (directError) {
    return NextResponse.json({ error: 'Failed to load customer transactions' }, { status: 500 });
  }

  const direct = (directRows ?? []) as unknown as AuditTx[];
  const clusterIds = uniq(direct.map((row) => row.cluster_id));
  let rows = direct;

  const merchantFilter = `merchant_ids.cs.${JSON.stringify([ctx.userId])},merchant_ids.cs.${JSON.stringify([ctx.merchantId])}`;
  const { data: profileRows } = await serviceClient
    .from('customer_profiles')
    .select('id')
    .or(merchantFilter)
    .or(`primary_email.ilike.${email},emails.cs.["${email}"]`)
    .limit(1) as unknown as { data: Array<{ id: string }> | null };

  const profileId = profileRows?.[0]?.id ?? null;

  if (clusterIds.length > 0) {
    const { data: clusterRows } = await serviceClient
      .from('audit_transactions')
      .select('*')
      .eq('job_id', params.runId)
      .in('cluster_id', clusterIds)
      .order('processed_at', { ascending: true });

    const byId = new Map<string, AuditTx>();
    for (const row of [...direct, ...((clusterRows ?? []) as unknown as AuditTx[])]) {
      byId.set(row.id, row);
    }
    rows = Array.from(byId.values()).sort((a, b) => String(a.processed_at ?? '').localeCompare(String(b.processed_at ?? '')));
  }

  const directIds = new Set(direct.map((row) => row.id));
  const orderValue = rows.reduce((sum, row) => sum + (row.order_value ?? 0), 0);
  const maxScore = rows.reduce((max, row) => Math.max(max, row.identity_score ?? row.match_score ?? 0), 0);
  const signals = uniq(rows.flatMap((row) => Array.isArray(row.signals_matched) ? row.signals_matched : []));

  return NextResponse.json({
    customer: {
      id: profileId,
      email,
      names: uniq(rows.map((row) => row.customer_name)),
      emails: uniq(rows.map((row) => row.customer_email)),
      addresses: uniq(rows.flatMap((row) => [row.shipping_address, row.billing_address])),
      ips: uniq(rows.map((row) => row.device_ip)),
      cardLast4s: uniq(rows.map((row) => row.card_last4)),
      clusterIds,
      orderCount: rows.length,
      directOrderCount: direct.length,
      totalSpend: orderValue,
      maxScore,
      grade: rows.find((row) => row.identity_confidence_grade)?.identity_confidence_grade ?? null,
      refundCount: rows.filter((row) => row.refund_claimed).length,
      chargebackCount: rows.filter((row) => row.chargeback_filed).length,
      signals,
    },
    orders: rows.map((row) => ({
      id: row.id,
      orderId: row.order_id,
      date: row.processed_at,
      email: row.customer_email,
      name: row.customer_name,
      value: row.order_value,
      score: row.identity_score ?? row.match_score ?? 0,
      grade: row.identity_confidence_grade,
      clusterId: row.cluster_id,
      refundClaimed: row.refund_claimed,
      refundReason: row.refund_reason,
      chargebackFiled: row.chargeback_filed,
      signals: Array.isArray(row.signals_matched) ? row.signals_matched : [],
      isDirectEmailMatch: directIds.has(row.id),
    })),
  });
}
