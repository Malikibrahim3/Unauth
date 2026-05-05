import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { buildBehavioralNarrative } from '@/lib/customers/narrative';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IdentityTimelineEntry {
  date: string;
  field: 'email' | 'name' | 'address' | 'ip' | 'card_last4';
  value: string;
  isVariant: boolean; // different from the first-ever value seen for this field
}

export interface OrderHistoryEntry {
  orderId: string;
  date: string;
  email: string | null;
  name: string | null;
  address: string | null;
  ip: string | null;
  cardLast4: string | null;
  orderValue: number | null;
  fraudScore: number;
  riskLevel: string;
  fraudFlags: string[];
  refundClaimed: boolean;
  refundReason: string | null;
}

export interface LinkedAccount {
  entityType: string;
  entityValue: string;
  confidence: number;
  matchReasons: string[];
}

export interface CustomerIntelligencePanel {
  profile: {
    id: string;
    primary_email: string | null;
    emails: string[];
    names: string[];
    addresses: string[];
    ips: string[];
    card_last4s: string[];
    phones: string[];
    risk_score: number;
    risk_level: string;
    fraud_flags: string[];
    total_orders: number;
    total_refund_claims: number;
    total_chargebacks: number;
    total_merchants_seen_at: number;
    refund_rate: number;
    fastest_claim_days: number | null;
    avg_claim_days: number | null;
    refund_acceleration_score: number;
    first_seen: string;
    last_seen: string;
    profile_confidence: number;
    manually_reviewed: boolean;
    on_watchlist: boolean;
    watchlist_entry_id: string | null;
  };
  orderHistory: OrderHistoryEntry[];
  identityTimeline: IdentityTimelineEntry[];
  linkedAccounts: LinkedAccount[];
  narrative: string;
}

// ---------------------------------------------------------------------------
// GET /api/customers/[id]
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) return denied;

  const profileId = params.id;

  // -------------------------------------------------------------------------
  // 1. Fetch the customer profile — verify merchant has access
  //
  //    merchant_ids stores the merchants-table UUID for uploads processed
  //    after the merchants table was introduced. Older uploads stored the
  //    auth user UUID directly. Accept either to handle legacy data.
  // -------------------------------------------------------------------------
  const merchantFilter = `merchant_ids.cs.${JSON.stringify([ctx.merchantId])},merchant_ids.cs.${JSON.stringify([ctx.userId])}`;

  const { data: profileRow, error: profileError } = await serviceClient
    .from('customer_profiles')
    .select('*')
    .eq('id', profileId)
    .or(merchantFilter)
    .single() as unknown as { data: Record<string, unknown> | null; error: unknown };

  if (profileError || !profileRow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const profile = profileRow as any;

  // -------------------------------------------------------------------------
  // 2. Check watchlist status for this merchant
  // -------------------------------------------------------------------------
  const { data: watchlistRow } = await serviceClient
    .from('watchlist_entries')
    .select('id')
    .eq('customer_profile_id', profileId)
    .eq('merchant_id', ctx.merchantId)
    .eq('removed_by_merchant', false)
    .maybeSingle() as unknown as { data: { id: string } | null };

  // -------------------------------------------------------------------------
  // 3. Fetch audit appearances for this merchant's jobs
  // -------------------------------------------------------------------------
  const { data: appearances } = await serviceClient
    .from('customer_profile_audit_appearances')
    .select('audit_id')
    .eq('profile_id', profileId) as unknown as { data: { audit_id: string }[] | null };

  const auditIds = (appearances ?? []).map((a) => a.audit_id);

  // -------------------------------------------------------------------------
  // 4. Fetch fraud transactions for this profile
  //    Join on job_id (from appearances) and match by email or card
  // -------------------------------------------------------------------------
  const transactions: Array<any> = [];

  if (auditIds.length > 0) {
    const profileEmails = profile.emails as string[];
    const profileCards = profile.card_last4s as string[];
    const BATCH = 1000;
    for (let offset = 0; ; offset += BATCH) {
      let txQuery = serviceClient
        .from('audit_transactions')
        .select(
          'id,job_id,order_id,customer_email,customer_name,shipping_address,device_ip,card_last4,order_value,match_score,fraud_flags,risk_level,refund_claimed,refund_reason,processed_at'
        )
        .in('job_id', auditIds)
        .order('processed_at', { ascending: true })
        .range(offset, offset + BATCH - 1);

      if (profileEmails.length > 0) {
        txQuery = txQuery.in('customer_email', profileEmails);
      } else if (profileCards.length > 0) {
        txQuery = txQuery.in('card_last4', profileCards);
      }

      const { data: txData } = await txQuery as unknown as { data: typeof transactions | null };
      const rows = txData ?? [];
      if (rows.length === 0) break;
      transactions.push(...rows);
      if (rows.length < BATCH) break;
    }
  }

  // -------------------------------------------------------------------------
  // 5. Build order history
  // -------------------------------------------------------------------------
  const orderHistory: OrderHistoryEntry[] = transactions.map((tx) => ({
    orderId: tx.order_id,
    date: tx.processed_at,
    email: tx.customer_email,
    name: tx.customer_name,
    address: tx.shipping_address,
    ip: tx.device_ip,
    cardLast4: tx.card_last4,
    orderValue: tx.order_value,
    fraudScore: tx.match_score,
    riskLevel: tx.risk_level,
    fraudFlags: Array.isArray(tx.fraud_flags) ? tx.fraud_flags : [],
    refundClaimed: tx.refund_claimed ?? false,
    refundReason: tx.refund_reason,
  }));

  // -------------------------------------------------------------------------
  // 6. Build identity timeline — derive first-seen value per field, mark variants
  // -------------------------------------------------------------------------
  const identityTimeline: IdentityTimelineEntry[] = [];
  const firstSeen: Record<string, string> = {};

  function addEntry(
    date: string,
    field: IdentityTimelineEntry['field'],
    value: string | null | undefined
  ) {
    const v = (value ?? '').trim();
    if (!v) return;
    const key = field;
    if (!(key in firstSeen)) {
      firstSeen[key] = v;
      identityTimeline.push({ date, field, value: v, isVariant: false });
    } else if (firstSeen[key] !== v) {
      const alreadyAdded = identityTimeline.some((e) => e.field === field && e.value === v);
      if (!alreadyAdded) {
        identityTimeline.push({ date, field, value: v, isVariant: true });
      }
    }
  }

  for (const tx of transactions) {
    addEntry(tx.processed_at, 'email', tx.customer_email);
    addEntry(tx.processed_at, 'name', tx.customer_name);
    addEntry(tx.processed_at, 'address', tx.shipping_address);
    addEntry(tx.processed_at, 'ip', tx.device_ip);
    addEntry(tx.processed_at, 'card_last4', tx.card_last4);
  }

  identityTimeline.sort((a, b) => a.date.localeCompare(b.date));

  // -------------------------------------------------------------------------
  // 7. Fetch linked accounts from fraud_identity_clusters
  // -------------------------------------------------------------------------
  const linkedAccounts: LinkedAccount[] = [];

  if (profile.emails.length > 0) {
    const BATCH = 1000;
    const clusterRows: Array<{
      cluster_id: string;
      entity_type: string;
      entity_value: string;
      confidence: number;
      match_reasons: string[];
    }> = [];

    for (let offset = 0; ; offset += BATCH) {
      const res = await serviceClient
        .from('fraud_identity_clusters')
        .select('cluster_id,entity_type,entity_value,confidence,match_reasons')
        .in('entity_value', profile.emails)
        .range(offset, offset + BATCH - 1) as unknown as {
        data: Array<{
          cluster_id: string;
          entity_type: string;
          entity_value: string;
          confidence: number;
          match_reasons: string[];
        }> | null;
      } | null;

      const rows = res?.data ?? [];
      if (rows.length === 0) break;
      clusterRows.push(...rows);
      if (rows.length < BATCH) break;
    }

    if (clusterRows.length > 0) {
      const clusterIds = [...new Set(clusterRows.map((r) => r.cluster_id))];
      const allClusterMembers: Array<{
        cluster_id: string;
        entity_type: string;
        entity_value: string;
        confidence: number;
        match_reasons: string[];
      }> = [];

      for (let offset = 0; ; offset += BATCH) {
        const res = await serviceClient
          .from('fraud_identity_clusters')
          .select('cluster_id,entity_type,entity_value,confidence,match_reasons')
          .in('cluster_id', clusterIds)
          .not('entity_value', 'in', `(${profile.emails.map((e: string) => `"${e}"`).join(',')})`)
          .range(offset, offset + BATCH - 1) as unknown as {
            data: Array<{
              cluster_id: string;
              entity_type: string;
              entity_value: string;
              confidence: number;
              match_reasons: string[];
            }> | null;
          } | null;

        const rows = res?.data ?? [];
        if (rows.length === 0) break;
        allClusterMembers.push(...rows);
        if (rows.length < BATCH) break;
      }

      const dedup = new Set<string>();
      for (const member of allClusterMembers) {
        const key = `${member.cluster_id}|${member.entity_type}|${member.entity_value}`;
        if (dedup.has(key)) continue;
        dedup.add(key);
        linkedAccounts.push({
          entityType: member.entity_type,
          entityValue: member.entity_value,
          confidence: member.confidence,
          matchReasons: Array.isArray(member.match_reasons) ? member.match_reasons : [],
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // 8. Build behavioral narrative
  // -------------------------------------------------------------------------
  const narrative = buildBehavioralNarrative({
    totalOrders: profile.total_orders,
    totalRefundClaims: profile.total_refund_claims,
    refundRate: profile.refund_rate,
    fastestClaimDays: profile.fastest_claim_days,
    avgClaimDays: profile.avg_claim_days,
    refundAccelerationScore: profile.refund_acceleration_score,
    firstSeen: profile.first_seen,
    lastSeen: profile.last_seen,
    fraudFlags: profile.fraud_flags,
    linkedAccountCount: linkedAccounts.length,
  });

  // -------------------------------------------------------------------------
  // 9. Compose response
  // -------------------------------------------------------------------------
  const panel: CustomerIntelligencePanel = {
    profile: {
      id: profile.id,
      primary_email: profile.primary_email,
      emails: profile.emails,
      names: profile.names,
      addresses: profile.addresses,
      ips: profile.ips,
      card_last4s: profile.card_last4s,
      phones: profile.phones,
      risk_score: profile.risk_score,
      risk_level: profile.risk_level,
      fraud_flags: profile.fraud_flags,
      total_orders: profile.total_orders,
      total_refund_claims: profile.total_refund_claims,
      total_chargebacks: profile.total_chargebacks,
      total_merchants_seen_at: profile.total_merchants_seen_at,
      refund_rate: profile.refund_rate,
      fastest_claim_days: profile.fastest_claim_days,
      avg_claim_days: profile.avg_claim_days,
      refund_acceleration_score: profile.refund_acceleration_score,
      first_seen: profile.first_seen,
      last_seen: profile.last_seen,
      profile_confidence: profile.profile_confidence,
      manually_reviewed: profile.manually_reviewed,
      on_watchlist: !!watchlistRow,
      watchlist_entry_id: watchlistRow?.id ?? null,
    },
    orderHistory,
    identityTimeline,
    linkedAccounts,
    narrative,
  };

  logAction({
    ctx,
    action: 'view_customer',
    resourceType: 'customer_profile',
    resourceId: profileId,
    ip,
  });

  return NextResponse.json(panel);
}
