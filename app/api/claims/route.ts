import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { createClaimSchema, resolveSourceOrderId, upsertMerchantClaim } from '@/lib/claims/store';
import { appendClaimEvent } from '@/lib/claims/events';
import { ACTIVE_CLAIM_STATUSES, FINAL_CLAIM_STATUSES } from '@/lib/claims/sla';
import { TABLES } from '@/lib/supabase/tables';
import { CLAIM_EVIDENCE_ORIGIN_FILTER } from '@/lib/integrations/canonicalEvidence';
import { toStoredClaimType } from '@/lib/payouts/taxonomy';

type DuplicateClaimRow = {
  id: string;
  status: string;
  identity_id: string | null;
  source_order_id: string | null;
  source_ticket_id: string | null;
  claim_type: string | null;
  updated_at?: string | null;
};

/**
 * One order can accrue multiple post-purchase payout events over time (e.g. an
 * INR followed later by a damaged reship). We therefore do NOT dedupe on order
 * alone. A duplicate is the same order + same case reason (claim_type) and, when
 * both carry a helpdesk ticket, the same ticket. Different reasons or different
 * tickets on one order are legitimately distinct payout cases.
 */
async function findDuplicateClaim(
  serviceClient: any,
  merchantId: string,
  sourceOrderId: string | null,
  claimType: string | null,
  sourceTicketId: string | null,
  currentClaimId?: string,
) {
  if (!sourceOrderId) return null;
  const { data, error } = await serviceClient
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id,status,identity_id,source_order_id,source_ticket_id,claim_type,updated_at')
    .eq('merchant_id', merchantId)
    .eq('source_order_id', sourceOrderId)
    .limit(20);
  if (error) return null;
  const rows = ((data ?? []) as DuplicateClaimRow[]).filter((row) => {
    if (row.id === currentClaimId) return false;
    if (claimType && row.claim_type && row.claim_type !== claimType) return false;
    if (sourceTicketId && row.source_ticket_id && row.source_ticket_id !== sourceTicketId) return false;
    return true;
  });

  const active = rows.find((row) => (ACTIVE_CLAIM_STATUSES as readonly string[]).includes(row.status));
  if (active) return { kind: 'active' as const, row: active };

  const resolved = rows.find((row) => (FINAL_CLAIM_STATUSES as readonly string[]).includes(row.status));
  if (resolved) return { kind: 'resolved' as const, row: resolved };

  return null;
}

type SourceOrderSummary = {
  id: string;
  external_id: string;
  order_number: string | null;
  email: string | null;
};

export async function GET(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (denied) return denied;

  const profileId = request.nextUrl.searchParams.get('profileId');
  const orderId = request.nextUrl.searchParams.get('orderId');
  const statusFilter = request.nextUrl.searchParams.get('status');
  const queue = request.nextUrl.searchParams.get('queue');
  const excludeId = request.nextUrl.searchParams.get('excludeId');
  const sort = request.nextUrl.searchParams.get('sort');

  const pageSize = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10)));
  const orderColumn = sort === 'age' ? 'submitted_at' : 'updated_at';
  const ascending = sort === 'age';
  let query = serviceClient
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id,identity_id,source_order_id,source_ticket_id,claim_type,status,detection_method,requested_action,amount_at_risk,currency,submitted_at,created_at,updated_at,first_viewed_at,assigned_to,assigned_at,snoozed_until')
    .eq('merchant_id', ctx.merchantId)
    .order(orderColumn, { ascending })
    .limit(pageSize);

  if (profileId) query = query.eq('identity_id', profileId);
  if (orderId) {
    const sourceOrderId = await resolveSourceOrderId(serviceClient, ctx.merchantId, orderId);
    if (!sourceOrderId) return NextResponse.json({ claims: [] });
    query = query.eq('source_order_id', sourceOrderId);
  }
  if (queue === 'active') query = query.in('status', [...ACTIVE_CLAIM_STATUSES]).or(`snoozed_until.is.null,snoozed_until.lte.${new Date().toISOString()}`);
  else if (queue === 'snoozed') query = query.not('snoozed_until', 'is', null).gt('snoozed_until', new Date().toISOString());
  else if (statusFilter) query = query.eq('status', statusFilter);
  if (excludeId) query = query.neq('id', excludeId);
  const { data: claims, error: claimsError } = await query;
  if (claimsError) {
    return NextResponse.json({ error: 'Failed to load claims' }, { status: 500 });
  }

  const claimIds = (claims ?? []).flatMap((claim: any) => (claim.id ? [claim.id] : []));
  const outcomesByClaimId = new Map<string, any[]>();
  const eventsByClaimId = new Map<string, any[]>();
  const evidenceCountByClaimId = new Map<string, number>();
  const orderById = new Map<string, SourceOrderSummary>();

  if (claimIds.length > 0) {
    const { data: outcomeRows } = await serviceClient
      .from('claim_outcomes')
      .select('id,claim_id,decision,outcome,amount_refunded,amount_recovered,notes,decided_by,decided_at,updated_at')
      .in('claim_id', claimIds)
      .order('updated_at', { ascending: false });
    for (const outcome of outcomeRows ?? []) {
      const rows = outcomesByClaimId.get(outcome.claim_id) ?? [];
      rows.push(outcome);
      outcomesByClaimId.set(outcome.claim_id, rows);
    }

    const { data: eventRows } = await serviceClient
      .from('claim_events')
      .select('id,claim_id,event_type,from_status,to_status,note,actor_user_id,metadata,created_at')
      .eq('merchant_id', ctx.merchantId)
      .in('claim_id', claimIds)
      .order('created_at', { ascending: false });
    for (const event of eventRows ?? []) {
      const metadata = (event.metadata ?? {}) as Record<string, unknown>;
      const rows = eventsByClaimId.get(event.claim_id) ?? [];
      rows.push({
        ...event,
        previous_status: event.from_status ?? null,
        new_status: event.to_status ?? null,
        previous_decision: metadata.previous_decision ?? null,
        new_decision: metadata.new_decision ?? null,
        previous_outcome: metadata.previous_outcome ?? null,
        new_outcome: metadata.new_outcome ?? null,
      });
      eventsByClaimId.set(event.claim_id, rows);
    }

    const { data: evidenceRows } = await serviceClient
      .from('evidence_items')
      .select('claim_id')
      .eq('merchant_id', ctx.merchantId)
      .in('claim_id', claimIds)
      .or(CLAIM_EVIDENCE_ORIGIN_FILTER);
    for (const row of evidenceRows ?? []) {
      evidenceCountByClaimId.set(row.claim_id, (evidenceCountByClaimId.get(row.claim_id) ?? 0) + 1);
    }

    const sourceOrderIds = [...new Set((claims ?? []).flatMap((c: any) => (c.source_order_id ? [c.source_order_id] : [])))];
    if (sourceOrderIds.length > 0) {
      const { data: orderRows } = await serviceClient
        .from('source_orders')
        .select('id,external_id,order_number,email')
        .eq('merchant_id', ctx.merchantId)
        .in('id', sourceOrderIds);
      for (const row of (orderRows ?? []) as SourceOrderSummary[]) {
        orderById.set(row.id, row);
      }
    }
  }

  return NextResponse.json({
    claims: (claims ?? []).map((c: any) => {
      const order = c.source_order_id ? orderById.get(c.source_order_id) ?? null : null;
      return {
        id: c.id,
        customer_id: c.identity_id,
        identity_id: c.identity_id,
        source_order_id: c.source_order_id,
        source_ticket_id: c.source_ticket_id,
        shopify_order_id: order?.external_id ?? null,
        order_ref: order?.order_number ?? null,
        customer_email: order?.email ?? null,
        claim_type: c.claim_type,
        status: c.status,
        amount_at_risk: c.amount_at_risk,
        requested_action: c.requested_action ?? 'unknown',
        currency: c.currency,
        submitted_at: c.submitted_at ?? null,
        created_at: c.created_at ?? null,
        updated_at: c.updated_at,
        first_viewed_at: c.first_viewed_at ?? null,
        assigned_to: c.assigned_to ?? null,
        assigned_at: c.assigned_at ?? null,
        snoozed_until: c.snoozed_until ?? null,
        evidence_count: evidenceCountByClaimId.get(c.id) ?? 0,
        outcomes: outcomesByClaimId.get(c.id) ?? [],
        events: eventsByClaimId.get(c.id) ?? [],
        latest_outcome: (outcomesByClaimId.get(c.id) ?? [])[0] ?? null,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createClaimSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const msg = firstIssue?.message === 'Select an order before saving the claim.'
      ? firstIssue.message
      : 'Invalid claim payload';
    const status = firstIssue?.message === 'Select an order before saving the claim.' ? 422 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  // Resolve the platform order reference to a merchant-scoped source order.
  // The lookup doubles as the ownership check: it is scoped to ctx.merchantId.
  const sourceOrderId =
    parsed.data.source_order_id ??
    await resolveSourceOrderId(serviceClient, ctx.merchantId, parsed.data.shopify_order_id ?? parsed.data.order_ref);
  if (!sourceOrderId && !parsed.data.source_ticket_id) {
    return NextResponse.json({ error: 'Order not found for this merchant.' }, { status: 422 });
  }

  const duplicate = await findDuplicateClaim(
    serviceClient,
    ctx.merchantId,
    sourceOrderId,
    (parsed.data.case_reason ? toStoredClaimType(parsed.data.case_reason) : null) ?? parsed.data.claim_type ?? null,
    parsed.data.source_ticket_id ?? null,
    parsed.data.id,
  );
  if (duplicate) {
    const duplicateCode =
      duplicate.kind === 'active' ? 'duplicate_active_claim' : 'duplicate_resolved_claim';
    return NextResponse.json({
      error: 'A claim already exists for this order. Reopen the existing claim if new evidence changes the decision.',
      code: duplicateCode,
      existingClaimId: duplicate.row.id,
      existingStatus: duplicate.row.status,
    }, { status: 409 });
  }

  try {
    const wasUpdate = !!parsed.data.id;
    const claim = await upsertMerchantClaim(serviceClient, {
      ...parsed.data,
      merchant_id: ctx.merchantId,
      source_order_id: sourceOrderId,
      actor_user_id: parsed.data.actor_user_id ?? user.id,
    });
    await appendClaimEvent(serviceClient, {
      claim_id: claim.id,
      merchant_id: ctx.merchantId,
      event_type: wasUpdate ? 'claim_updated' : 'claim_created',
      new_status: claim.status ?? parsed.data.status,
      actor_user_id: user.id,
      triggered_by: 'merchant_manual',
      metadata: {
        triggered_by: 'merchant_manual',
        claim_type: claim.claim_type ?? parsed.data.claim_type,
        source_order_id: claim.source_order_id ?? sourceOrderId,
        order_ref: parsed.data.order_ref ?? parsed.data.shopify_order_id ?? null,
      },
    });
    return NextResponse.json({ claim: { id: claim.id, source_order_id: claim.source_order_id, claim_type: claim.claim_type, status: claim.status } });
  } catch {
    return NextResponse.json({ error: 'Failed to upsert claim' }, { status: 500 });
  }
}
