import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { escapePostgrestFilterValue } from '@/lib/supabase/merchantHelpers';

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

async function loadTransactionsForProfile(
  serviceClient: ReturnType<typeof createServiceClient>,
  runId: string,
  profileId: string,
): Promise<{ direct: AuditTx[]; rows: AuditTx[]; profileId: string }> {
  const { data: appearanceRows } = await serviceClient
    .from('customer_profile_audit_appearances')
    .select('transaction_id')
    .eq('audit_id', runId)
    .eq('profile_id', profileId);
  const txIds = (appearanceRows ?? []).map((r: { transaction_id: string }) => r.transaction_id).filter(Boolean);

  const { data: directRows, error: directError } = await serviceClient
    .from(TABLES.AUDIT_TRANSACTIONS)
    .select('*')
    .eq('job_id', runId)
    .in('id', txIds.length > 0 ? txIds : ['00000000-0000-0000-0000-000000000000'])
    .order('processed_at', { ascending: true });

  if (directError) {
    throw new Error('Failed to load customer transactions');
  }

  const direct = (directRows ?? []) as unknown as AuditTx[];
  const clusterIds = uniq(direct.map((row) => row.cluster_id));
  let rows = direct;

  if (clusterIds.length > 0) {
    const { data: clusterRows } = await serviceClient
      .from(TABLES.AUDIT_TRANSACTIONS)
      .select('*')
      .eq('job_id', runId)
      .in('cluster_id', clusterIds)
      .order('processed_at', { ascending: true });

    const byId = new Map<string, AuditTx>();
    for (const row of [...direct, ...((clusterRows ?? []) as unknown as AuditTx[])]) {
      byId.set(row.id, row);
    }
    rows = Array.from(byId.values()).sort((a, b) =>
      String(a.processed_at ?? '').localeCompare(String(b.processed_at ?? '')),
    );
  }

  return { direct, rows, profileId };
}

async function loadTransactionsForCustomerKey(
  serviceClient: ReturnType<typeof createServiceClient>,
  runId: string,
  customerKey: string,
): Promise<{ direct: AuditTx[]; rows: AuditTx[]; profileId: string | null; displayEmail: string }> {
  const lookup = customerKey.trim();
  const lookupLower = lookup.toLowerCase();
  const safeLookup = escapePostgrestFilterValue(lookup);

  const { data: directRows, error: directError } = await serviceClient
    .from(TABLES.AUDIT_TRANSACTIONS)
    .select('*')
    .eq('job_id', runId)
    .or(`customer_email.ilike.${safeLookup},customer_name.ilike.${safeLookup}`)
    .order('processed_at', { ascending: true });

  if (directError) {
    throw new Error('Failed to load customer transactions');
  }

  const direct = (directRows ?? []) as unknown as AuditTx[];
  const clusterIds = uniq(direct.map((row) => row.cluster_id));
  let rows = direct;

  const merchantFilter = `merchant_ids.cs.${JSON.stringify([ctx.merchantId])}`;
  const safeEmail = escapePostgrestFilterValue(lookupLower);
  const { data: profileRows } = await serviceClient
    .from(TABLES.CUSTOMER_PROFILES)
    .select('id')
    .or(merchantFilter)
    .or(`primary_email.ilike.${safeEmail},emails.cs.["${safeEmail}"]`)
    .limit(1) as unknown as { data: Array<{ id: string }> | null };

  const profileId = profileRows?.[0]?.id ?? null;

  if (clusterIds.length > 0) {
    const { data: clusterRows } = await serviceClient
      .from(TABLES.AUDIT_TRANSACTIONS)
      .select('*')
      .eq('job_id', runId)
      .in('cluster_id', clusterIds)
      .order('processed_at', { ascending: true });

    const byId = new Map<string, AuditTx>();
    for (const row of [...direct, ...((clusterRows ?? []) as unknown as AuditTx[])]) {
      byId.set(row.id, row);
    }
    rows = Array.from(byId.values()).sort((a, b) =>
      String(a.processed_at ?? '').localeCompare(String(b.processed_at ?? '')),
    );
  }

  const displayEmail =
    direct.find((row) => row.customer_email)?.customer_email?.trim() ||
    lookup;

  return { direct, rows, profileId, displayEmail };
}

// Module-level ctx placeholder — set in GET before calling helpers
let ctx: { merchantId: string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const profileIdParam = req.nextUrl.searchParams.get('profile_id')?.trim();
  const emailParam = req.nextUrl.searchParams.get('email')?.trim();
  if (!profileIdParam && !emailParam) {
    return NextResponse.json({ error: 'Missing email or profile_id' }, { status: 400 });
  }

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const serviceClient = createServiceClient();
  const permission = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_AUDIT);
  if (permission.denied) return permission.denied;
  ctx = permission.ctx;

  const { runId } = await params;

  const { data: job } = await serviceClient
    .from(TABLES.PROCESSING_JOBS)
    .select('id, merchant_id')
    .eq('id', runId)
    .single();

  if (!job || job.merchant_id !== ctx.merchantId) {
    return NextResponse.json({ error: 'Audit run not found' }, { status: 404 });
  }

  try {
    let direct: AuditTx[];
    let rows: AuditTx[];
    let profileId: string | null;
    let displayEmail: string;

    if (profileIdParam) {
      const loaded = await loadTransactionsForProfile(serviceClient, runId, profileIdParam);
      if (loaded.direct.length === 0 && loaded.rows.length === 0) {
        return NextResponse.json({ error: 'Customer not found in audit' }, { status: 404 });
      }
      direct = loaded.direct;
      rows = loaded.rows;
      profileId = loaded.profileId;
      displayEmail =
        rows.find((row) => row.customer_email)?.customer_email?.trim() ||
        emailParam ||
        profileIdParam;
    } else {
      const loaded = await loadTransactionsForCustomerKey(serviceClient, runId, emailParam!);
      if (loaded.direct.length === 0 && loaded.rows.length === 0) {
        return NextResponse.json({ error: 'Customer not found in audit' }, { status: 404 });
      }
      direct = loaded.direct;
      rows = loaded.rows;
      profileId = loaded.profileId;
      displayEmail = loaded.displayEmail;
    }

    const directIds = new Set(direct.map((row) => row.id));
    const clusterIds = uniq(direct.map((row) => row.cluster_id));
    const orderValue = rows.reduce((sum, row) => sum + (row.order_value ?? 0), 0);
    const maxScore = rows.reduce((max, row) => Math.max(max, row.identity_score ?? row.match_score ?? 0), 0);
    const signals = uniq(rows.flatMap((row) => (Array.isArray(row.signals_matched) ? row.signals_matched : [])));

    return NextResponse.json({
      customer: {
        id: profileId,
        email: displayEmail,
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
  } catch {
    return NextResponse.json({ error: 'Failed to load customer transactions' }, { status: 500 });
  }
}
