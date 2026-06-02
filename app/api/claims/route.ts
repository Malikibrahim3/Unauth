import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { createClaimSchema, upsertMerchantClaim } from '@/lib/claims/store';
import { fetchMerchantScopedCustomerProfile } from '@/lib/supabase/merchantHelpers';
import { appendClaimEvent } from '@/lib/claims/events';
import { ACTIVE_CLAIM_STATUSES, FINAL_CLAIM_STATUSES } from '@/lib/claims/sla';

async function getMerchantShops(serviceClient: any, merchantId: string) {
  const { data } = await serviceClient
    .from('merchant_shopify_connections' as any)
    .select('shop_domain,active')
    .eq('merchant_id', merchantId)
    .eq('active', true);
  return (data ?? []).map((r: any) => r.shop_domain as string);
}

async function merchantOwnsShopDomain(serviceClient: any, merchantId: string, shopDomain: string): Promise<boolean> {
  const shops = await getMerchantShops(serviceClient, merchantId);
  return shops.includes(shopDomain);
}

type DuplicateClaimRow = {
  id: string;
  status: string;
  customer_id: string | null;
  shopify_order_id: string | null;
  order_ref?: string | null;
  updated_at?: string | null;
};

async function queryDuplicateClaimsByColumn(
  serviceClient: any,
  merchantId: string,
  column: 'shopify_order_id' | 'order_ref',
  orderKey: string,
  shopDomain: string | null | undefined,
): Promise<DuplicateClaimRow[]> {
  let query = serviceClient
    .from('merchant_claims' as any)
    .select('id,status,customer_id,shopify_order_id,order_ref,updated_at')
    .eq('merchant_id', merchantId)
    .eq(column, orderKey)
    .limit(10);
  if (shopDomain) query = query.eq('shop_domain', shopDomain);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as DuplicateClaimRow[];
}

async function findDuplicateClaim(
  serviceClient: any,
  merchantId: string,
  orderKey: string | null,
  shopDomain: string | null | undefined,
  currentClaimId?: string,
) {
  if (!orderKey) return null;
  const rows = [
    ...await queryDuplicateClaimsByColumn(serviceClient, merchantId, 'shopify_order_id', orderKey, shopDomain),
    ...await queryDuplicateClaimsByColumn(serviceClient, merchantId, 'order_ref', orderKey, shopDomain),
  ];
  const uniqueRows = Array.from(new Map(rows.map((row) => [row.id, row])).values())
    .filter((row) => row.id !== currentClaimId);

  const active = uniqueRows.find((row) => ACTIVE_CLAIM_STATUSES.includes(row.status as any));
  if (active) return { kind: 'active' as const, row: active };

  const resolved = uniqueRows.find((row) => FINAL_CLAIM_STATUSES.includes(row.status as any));
  if (resolved) return { kind: 'resolved' as const, row: resolved };

  return null;
}

export async function GET(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_FRAUD_FEEDBACK);
  if (denied) return denied;

  const profileId = request.nextUrl.searchParams.get('profileId');
  const orderId = request.nextUrl.searchParams.get('orderId');
  const statusFilter = request.nextUrl.searchParams.get('status');
  const queue = request.nextUrl.searchParams.get('queue');
  const excludeId = request.nextUrl.searchParams.get('excludeId');
  const sort = request.nextUrl.searchParams.get('sort');
  const shops = await getMerchantShops(serviceClient, ctx.merchantId);

  const pageSize = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10)));
  const orderColumn = sort === 'age' ? 'submitted_at' : 'updated_at';
  const ascending = sort === 'age';
  let query = serviceClient
    .from('merchant_claims' as any)
    .select('id,customer_id,shop_domain,shopify_order_id,order_ref,order_source,claim_type,status,amount_at_risk,currency,submitted_at,created_at,updated_at,first_viewed_at,first_viewed_by,assigned_to,assigned_at,snoozed_until,snooze_reason,last_customer_response_text,last_customer_response_at,last_customer_response_by')
    .eq('merchant_id', ctx.merchantId)
    .order(orderColumn, { ascending })
    .limit(pageSize);

  if (profileId) query = query.eq('customer_id', profileId);
  if (orderId) query = query.eq('shopify_order_id', orderId);
  if (queue === 'active') query = query.in('status', [...ACTIVE_CLAIM_STATUSES]).or(`snoozed_until.is.null,snoozed_until.lte.${new Date().toISOString()}`);
  else if (queue === 'snoozed') query = query.not('snoozed_until', 'is', null).gt('snoozed_until', new Date().toISOString());
  else if (statusFilter) query = query.eq('status', statusFilter);
  if (excludeId) query = query.neq('id', excludeId);
  let { data: claims, error: claimsError } = await query;

  if (claimsError) {
    let fallbackQuery = serviceClient
      .from('merchant_claims' as any)
      .select('id,customer_id,shop_domain,shopify_order_id,claim_type,status,amount_at_risk,currency,submitted_at,created_at,updated_at')
      .eq('merchant_id', ctx.merchantId)
      .order(orderColumn, { ascending })
      .limit(pageSize);

    if (profileId) fallbackQuery = fallbackQuery.eq('customer_id', profileId);
    if (orderId) fallbackQuery = fallbackQuery.eq('shopify_order_id', orderId);
    if (queue === 'active') fallbackQuery = fallbackQuery.in('status', [...ACTIVE_CLAIM_STATUSES]);
    else if (statusFilter) fallbackQuery = fallbackQuery.eq('status', statusFilter);
    if (excludeId) fallbackQuery = fallbackQuery.neq('id', excludeId);
    const fallback = await fallbackQuery;
    claims = fallback.data;
  }

  const claimIds = (claims ?? []).flatMap((claim: any) => (claim.id ? [claim.id] : []));
  const outcomesByClaimId = new Map<string, any[]>();
  const eventsByClaimId = new Map<string, any[]>();
  const evidenceCountByClaimId = new Map<string, number>();

  if (claimIds.length > 0) {
    const { data: outcomeRows } = await serviceClient
      .from('merchant_case_outcomes' as any)
      .select('id,claim_id,decision,outcome,amount_refunded,amount_recovered,notes,actor_user_id,decided_at,created_at,updated_at')
      .in('claim_id', claimIds)
      .order('updated_at', { ascending: false });
    for (const outcome of outcomeRows ?? []) {
      const rows = outcomesByClaimId.get(outcome.claim_id) ?? [];
      rows.push(outcome);
      outcomesByClaimId.set(outcome.claim_id, rows);
    }

    const { data: eventRows } = await serviceClient
      .from('claim_events' as any)
      .select('id,claim_id,event_type,previous_status,new_status,previous_decision,new_decision,previous_outcome,new_outcome,note,actor_user_id,metadata,created_at')
      .eq('merchant_id', ctx.merchantId)
      .in('claim_id', claimIds)
      .order('created_at', { ascending: false });
    for (const event of eventRows ?? []) {
      const rows = eventsByClaimId.get(event.claim_id) ?? [];
      rows.push(event);
      eventsByClaimId.set(event.claim_id, rows);
    }

    const { data: evidenceRows } = await serviceClient
      .from('claim_evidence_items' as any)
      .select('claim_id')
      .in('claim_id', claimIds);
    for (const row of evidenceRows ?? []) {
      evidenceCountByClaimId.set(row.claim_id, (evidenceCountByClaimId.get(row.claim_id) ?? 0) + 1);
    }
  }

  return NextResponse.json({
    shops,
    activeShopDomain: shops[0] ?? null,
    claims: (claims ?? []).map((c: any) => ({
      id: c.id,
      customer_id: c.customer_id,
      shop_domain: c.shop_domain,
      shopify_order_id: c.shopify_order_id,
      order_ref: c.order_ref ?? null,
      order_source: c.order_source ?? null,
      claim_type: c.claim_type,
      status: c.status,
      amount_at_risk: c.amount_at_risk,
      currency: c.currency,
      submitted_at: c.submitted_at ?? null,
      created_at: c.created_at ?? null,
      updated_at: c.updated_at,
      first_viewed_at: c.first_viewed_at ?? null,
      first_viewed_by: c.first_viewed_by ?? null,
      assigned_to: c.assigned_to ?? null,
      assigned_at: c.assigned_at ?? null,
      snoozed_until: c.snoozed_until ?? null,
      snooze_reason: c.snooze_reason ?? null,
      last_customer_response_text: c.last_customer_response_text ?? null,
      last_customer_response_at: c.last_customer_response_at ?? null,
      last_customer_response_by: c.last_customer_response_by ?? null,
      evidence_count: evidenceCountByClaimId.get(c.id) ?? 0,
      outcomes: outcomesByClaimId.get(c.id) ?? [],
      events: eventsByClaimId.get(c.id) ?? [],
      latest_outcome: (outcomesByClaimId.get(c.id) ?? [])[0] ?? null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_FRAUD_FEEDBACK);
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

  // Verify the customer profile belongs to this merchant.
  // CSV customers (no shop_domain, order_ref supplied instead of shopify_order_id) are fully
  // supported — the schema requires only one of shopify_order_id | order_ref | audit_transaction_id,
  // and this ownership check is profile-based, not Shopify-connection-based. Verified 2026-05-27.
  if (parsed.data.customer_id) {
    const profile = await fetchMerchantScopedCustomerProfile(serviceClient, ctx.merchantId, parsed.data.customer_id, ctx.userId);
    if (!profile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // If a shop_domain is supplied, additionally verify ownership of it.
  if (parsed.data.shop_domain) {
    if (!(await merchantOwnsShopDomain(serviceClient, ctx.merchantId, parsed.data.shop_domain))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const duplicateOrderKey = parsed.data.shopify_order_id ?? parsed.data.order_ref ?? parsed.data.audit_transaction_id ?? null;
  const duplicate = await findDuplicateClaim(
    serviceClient,
    ctx.merchantId,
    duplicateOrderKey,
    parsed.data.shop_domain,
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
    const claimInput = {
      ...parsed.data,
      merchant_id: ctx.merchantId,
      actor_user_id: parsed.data.actor_user_id ?? user.id,
    };
    let claim;
    try {
      claim = await upsertMerchantClaim(serviceClient, claimInput);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!/(order_ref|order_source|audit_transaction_id)/i.test(message)) throw error;

      const fallbackShopDomain = parsed.data.shop_domain ?? (await getMerchantShops(serviceClient, ctx.merchantId))[0] ?? null;
      if (!fallbackShopDomain) throw error;
      const fallbackOrderId = parsed.data.shopify_order_id ?? parsed.data.order_ref ?? parsed.data.audit_transaction_id ?? null;
      if (!fallbackOrderId) throw error;

      const legacyPayload = {
        id: parsed.data.id,
        merchant_id: ctx.merchantId,
        shop_domain: fallbackShopDomain,
        shopify_order_id: fallbackOrderId,
        customer_id: parsed.data.customer_id,
        claim_type: parsed.data.claim_type,
        customer_claim_reason: parsed.data.customer_claim_reason,
        normalized_reason: parsed.data.normalized_reason,
        status: parsed.data.status,
        amount_at_risk: parsed.data.amount_at_risk,
        currency: parsed.data.currency,
        submitted_at: parsed.data.submitted_at,
        actor_user_id: parsed.data.actor_user_id ?? user.id,
        detection_method: parsed.data.detection_method ?? 'manual',
      };

      const { data, error: fallbackError } = await serviceClient
        .from('merchant_claims' as any)
        .upsert(legacyPayload, { onConflict: 'id' })
        .select()
        .single();
      if (fallbackError) throw fallbackError;
      claim = data;
    }
    await appendClaimEvent(serviceClient, {
      claim_id: claim.id,
      merchant_id: ctx.merchantId,
      shop_domain: claim.shop_domain ?? parsed.data.shop_domain ?? null,
      event_type: wasUpdate ? 'claim_updated' : 'claim_created',
      new_status: claim.status ?? parsed.data.status,
      actor_user_id: user.id,
      triggered_by: 'merchant_manual',
      metadata: {
        triggered_by: 'merchant_manual',
        claim_type: claim.claim_type ?? parsed.data.claim_type,
        order_ref: claim.order_ref ?? parsed.data.order_ref ?? claim.shopify_order_id ?? parsed.data.shopify_order_id ?? null,
        order_source: claim.order_source ?? parsed.data.order_source ?? null,
      },
    });
    return NextResponse.json({ claim: { id: claim.id, shop_domain: claim.shop_domain, shopify_order_id: claim.shopify_order_id, order_ref: claim.order_ref, order_source: claim.order_source, claim_type: claim.claim_type, status: claim.status } });
  } catch {
    return NextResponse.json({ error: 'Failed to upsert claim' }, { status: 500 });
  }
}
