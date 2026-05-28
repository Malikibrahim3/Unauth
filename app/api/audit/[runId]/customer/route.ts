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

/**
 * Resolve a profile ID for a set of audit transaction IDs.
 *
 * Primary: customer_profile_audit_appearances — populated by the processing
 * pipeline and is the authoritative link between transactions and profiles.
 *
 * Fallback: direct email lookup against customer_profiles, using both
 * merchantId and userId to handle legacy merchant_ids formats.
 */
async function resolveProfileId(
  serviceClient: ReturnType<typeof createServiceClient>,
  runId: string,
  txIds: string[],
  email: string,
  merchantId: string,
  userId: string,
): Promise<string | null> {
  // 1. Appearances — most reliable, set by the ingest pipeline
  if (txIds.length > 0) {
    const { data: appRows } = await serviceClient
      .from('customer_profile_audit_appearances')
      .select('profile_id')
      .eq('audit_id', runId)
      .in('transaction_id', txIds.slice(0, 100)) // cap to avoid large IN clause
      .limit(1) as unknown as { data: Array<{ profile_id: string }> | null };

    const profileId = appRows?.[0]?.profile_id ?? null;
    if (profileId) return profileId;
  }

  // 2. Email-based lookup — handles customers whose appearances haven't been
  // written yet. Accept both merchantId and userId (legacy merchant_ids format).
  const emailLower = email.trim().toLowerCase();
  const safeEmail = escapePostgrestFilterValue(emailLower);

  const merchantFilter = [
    `merchant_ids.cs.${JSON.stringify([merchantId])}`,
    `merchant_ids.cs.${JSON.stringify([userId])}`,
  ].join(',');

  const { data: profileRows } = await serviceClient
    .from(TABLES.CUSTOMER_PROFILES)
    .select('id')
    .or(merchantFilter)
    .or(`primary_email.ilike.${safeEmail},emails.cs.["${safeEmail}"]`)
    .limit(1) as unknown as { data: Array<{ id: string }> | null };

  return profileRows?.[0]?.id ?? null;
}

async function loadTransactionsById(
  serviceClient: ReturnType<typeof createServiceClient>,
  runId: string,
  txIds: string[],
): Promise<AuditTx[]> {
  if (txIds.length === 0) return [];
  const { data } = await serviceClient
    .from(TABLES.AUDIT_TRANSACTIONS)
    .select('*')
    .eq('job_id', runId)
    .in('id', txIds)
    .order('processed_at', { ascending: true });
  return (data ?? []) as unknown as AuditTx[];
}

async function expandWithClusterRows(
  serviceClient: ReturnType<typeof createServiceClient>,
  runId: string,
  direct: AuditTx[],
): Promise<AuditTx[]> {
  const clusterIds = uniq(direct.map((row) => row.cluster_id));
  if (clusterIds.length === 0) return direct;

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
  return Array.from(byId.values()).sort((a, b) =>
    String(a.processed_at ?? '').localeCompare(String(b.processed_at ?? '')),
  );
}

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
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_AUDIT);
  if (denied) return denied;

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
      // profile_id path: look up appearances for this profile in this audit
      const { data: appRows } = await serviceClient
        .from('customer_profile_audit_appearances')
        .select('transaction_id')
        .eq('audit_id', runId)
        .eq('profile_id', profileIdParam);

      const txIds = (appRows ?? [])
        .map((r: { transaction_id: string }) => r.transaction_id)
        .filter(Boolean);

      direct = await loadTransactionsById(serviceClient, runId, txIds);
      if (direct.length === 0) {
        return NextResponse.json({ error: 'Customer not found in audit' }, { status: 404 });
      }
      rows = await expandWithClusterRows(serviceClient, runId, direct);
      profileId = profileIdParam;
      displayEmail =
        rows.find((row) => row.customer_email)?.customer_email?.trim() ||
        emailParam ||
        profileIdParam;
    } else {
      // email path: find transactions by email match
      const safeLookup = escapePostgrestFilterValue(emailParam!.trim());
      const { data: directRows, error: directError } = await serviceClient
        .from(TABLES.AUDIT_TRANSACTIONS)
        .select('*')
        .eq('job_id', runId)
        .or(`customer_email.ilike.${safeLookup},customer_name.ilike.${safeLookup}`)
        .order('processed_at', { ascending: true });

      if (directError) {
        throw new Error('Failed to load customer transactions');
      }

      direct = (directRows ?? []) as unknown as AuditTx[];
      if (direct.length === 0) {
        return NextResponse.json({ error: 'Customer not found in audit' }, { status: 404 });
      }

      rows = await expandWithClusterRows(serviceClient, runId, direct);

      // Resolve profile — appearances first, then email fallback
      const directTxIds = direct.map((row) => row.id);
      const resolvedEmail = direct.find((row) => row.customer_email)?.customer_email?.trim() || emailParam!;
      profileId = await resolveProfileId(
        serviceClient,
        runId,
        directTxIds,
        resolvedEmail,
        ctx.merchantId,
        user.id,
      );

      displayEmail = resolvedEmail;
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
