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
  orderDate: string | null;
  processedAt: string;
  email: string | null;
  name: string | null;
  address: string | null;
  ip: string | null;
  cardLast4: string | null;
  orderValue: number | null;
  fraudScore: number;
  riskLevel: string;
  fraudFlags: string[];
  // Refund / claim fields
  refundStatus: string | null;
  refundRequested: boolean;
  refundReason: string | null;
  refundDate: string | null;
  refundAmount: number | null;
  returnRequested: boolean;
  // Chargeback fields
  chargebackFiled: boolean;
  chargebackDate: string | null;
  chargebackReasonCode: string | null;
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

const TX_SELECT =
  'id,job_id,order_id,customer_email,customer_name,shipping_address,device_ip,card_last4,order_value,match_score,fraud_flags,risk_level,refund_claimed,refund_reason,chargeback_filed,chargeback_date,chargeback_reason_code,processed_at,cluster_id';

// ---------------------------------------------------------------------------
// GET /api/customers/[id]
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) return denied;

  const profileId = resolvedParams.id;

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
  // 3a. Resolve merchant-owned job IDs — used as the security boundary for
  //     ALL subsequent transaction queries. Service role bypasses RLS so
  //     we MUST enforce merchant scope at the application layer.
  // -------------------------------------------------------------------------
  const { data: ownedJobs } = await serviceClient
    .from('processing_jobs')
    .select('id')
    .eq('merchant_id', ctx.merchantId) as unknown as { data: { id: string }[] | null };

  const ownedJobIds = (ownedJobs ?? []).map((j) => j.id);

  // -------------------------------------------------------------------------
  // 3b. Fetch audit appearances scoped strictly to this merchant's jobs
  // -------------------------------------------------------------------------
  let appearances: { audit_id: string; transaction_id: string | null }[] = [];
  if (ownedJobIds.length > 0) {
    const { data: appRows } = await serviceClient
      .from('customer_profile_audit_appearances')
      .select('audit_id,transaction_id')
      .eq('profile_id', profileId)
      .in('audit_id', ownedJobIds) as unknown as { data: { audit_id: string; transaction_id: string | null }[] | null };
    appearances = appRows ?? [];
  }

  const auditIds = appearances.map((a) => a.audit_id);
  const transactionIds = appearances
    .map((a) => (a as { transaction_id?: string | null }).transaction_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  // -------------------------------------------------------------------------
  // 4. Fetch fraud transactions for this profile
  //    Primary path: join on appearance job_ids + identity match
  //    Fallback path: direct identity query when appearances are missing/stale
  // -------------------------------------------------------------------------
  const transactions: Array<any> = [];
  const profileEmails = profile.emails as string[];
  const profileCards = profile.card_last4s as string[];
  const profileIps = profile.ips as string[];

  async function fetchDirectIdentityRows() {
    // Scope by merchant-owned job IDs to prevent cross-merchant data leakage.
    if (ownedJobIds.length === 0) return [];

    // Identify the primary identity attribute to match on.
    // If none present, return empty — we cannot scope safely.
    let identityField: string | null = null;
    let identityValues: string[] = [];
    if (profileEmails.length > 0) {
      identityField = 'customer_email';
      identityValues = profileEmails;
    } else if (profileCards.length > 0) {
      identityField = 'card_last4';
      identityValues = profileCards;
    } else if (profileIps.length > 0) {
      identityField = 'device_ip';
      identityValues = profileIps;
    } else {
      return [];
    }

    // Paginate without a fixed cap.  Uses the same 1000-row page size as the
    // primary path above, but loops until exhausted (no hard limit).
    const rows: Array<any> = [];
    const PAGE = 1000;
    for (let offset = 0; ; offset += PAGE) {
      const { data: page } = await (serviceClient
        .from('audit_transactions')
        .select(TX_SELECT)
        .in('job_id', ownedJobIds)
        .in(identityField, identityValues)
        .order('processed_at', { ascending: true })
        .range(offset, offset + PAGE - 1)) as unknown as { data: Array<any> | null };
      if (!page || page.length === 0) break;
      rows.push(...page);
      if (page.length < PAGE) break;
    }
    return rows;
  }

  const pushRows = (rows: Array<any>) => {
    const seen = new Set(transactions.map((row) => row.id ?? `${row.order_id}-${row.processed_at}`));
    for (const row of rows) {
      const key = row.id ?? `${row.order_id}-${row.processed_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      transactions.push(row);
    }
  };

  if (transactionIds.length > 0) {
    // Paginate to remove the 1000-row cap; always include job_id scope.
    const BATCH = 1000;
    for (let offset = 0; ; offset += BATCH) {
      const { data: txByAppearance } = await serviceClient
        .from('audit_transactions')
        .select(TX_SELECT)
        .in('id', transactionIds)
        .in('job_id', ownedJobIds)
        .order('processed_at', { ascending: true })
        .range(offset, offset + BATCH - 1) as unknown as { data: Array<any> | null };
      const rows = txByAppearance ?? [];
      if (rows.length === 0) break;
      pushRows(rows);
      if (rows.length < BATCH) break;
    }
  }

  if (transactions.length < (profile.total_orders ?? 0) && auditIds.length > 0) {
    const BATCH = 1000;
    for (let offset = 0; ; offset += BATCH) {
      let txQuery = serviceClient
        .from('audit_transactions')
        .select(TX_SELECT)
        .in('job_id', auditIds)
        .order('processed_at', { ascending: true })
        .range(offset, offset + BATCH - 1);

      if (profileEmails.length > 0) {
        txQuery = txQuery.in('customer_email', profileEmails);
      } else if (profileCards.length > 0) {
        txQuery = txQuery.in('card_last4', profileCards);
      } else if (profileIps.length > 0) {
        txQuery = txQuery.in('device_ip', profileIps);
      }

      const { data: txData } = await txQuery as unknown as { data: typeof transactions | null };
      const rows = txData ?? [];
      if (rows.length === 0) break;
      pushRows(rows);
      if (rows.length < BATCH) break;
    }
  }

  if (transactions.length === 0 && auditIds.length === 0) {
    const rows = await fetchDirectIdentityRows();
    pushRows(rows);
  }

  // -------------------------------------------------------------------------
  // 5. Build order history
  // -------------------------------------------------------------------------
  const orderHistory: OrderHistoryEntry[] = transactions.map((tx) => ({
    orderId: tx.order_id,
    orderDate: null,
    processedAt: tx.processed_at,
    email: tx.customer_email,
    name: tx.customer_name,
    address: tx.shipping_address,
    ip: tx.device_ip,
    cardLast4: tx.card_last4,
    orderValue: tx.order_value,
    fraudScore: tx.match_score,
    riskLevel: tx.risk_level,
    fraudFlags: Array.isArray(tx.fraud_flags) ? tx.fraud_flags : [],
    refundStatus: null,
    refundRequested: !!tx.refund_claimed,
    refundReason: tx.refund_reason ?? null,
    refundDate: null,
    refundAmount: null,
    returnRequested: false,
    chargebackFiled: !!tx.chargeback_filed,
    chargebackDate: tx.chargeback_date ?? null,
    chargebackReasonCode: tx.chargeback_reason_code ?? null,
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
  // 7. Derive linked-identity signals from merchant-owned audit_transactions.
  //    SECURITY: Do NOT read the global identity cluster graph table — that
  //    table contains cross-merchant entity values, cluster membership counts,
  //    entity types, confidence scores, and match reasons that must never be
  //    exposed via merchant-facing APIs, even in aggregated form.
  //    Instead, surface identity signals directly from the transactions this
  //    merchant uploaded: count how many distinct identity fields the customer
  //    has used, treating each distinct variant as a linked-account signal.
  // -------------------------------------------------------------------------
  const linkedAccounts: LinkedAccount[] = [];

  // Group variants by field type — each distinct value variant is a signal.
  const variantsByField = new Map<string, Set<string>>();
  for (const entry of identityTimeline) {
    if (!variantsByField.has(entry.field)) {
      variantsByField.set(entry.field, new Set());
    }
    variantsByField.get(entry.field)!.add(entry.value);
  }

  for (const [field, values] of variantsByField.entries()) {
    if (values.size > 1) {
      // Multiple distinct values for this field type — signals identity change/alias
      linkedAccounts.push({
        entityType: field,
        entityValue: `${values.size} distinct values observed`,
        confidence: 0.7,
        matchReasons: ['identity_variant_within_merchant_scope'],
      });
    }
  }

  // Also count distinct orders across this merchant's jobs as a corroboration signal.
  const distinctJobIds = new Set(transactions.map((tx: any) => tx.job_id).filter(Boolean));
  if (distinctJobIds.size > 1) {
    linkedAccounts.push({
      entityType: 'job',
      entityValue: `Seen across ${distinctJobIds.size} uploads`,
      confidence: 0.5,
      matchReasons: ['multi_upload_recurrence'],
    });
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
