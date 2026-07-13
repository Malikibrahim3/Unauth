/**
 * Analyst Command Center — Unified Search Endpoint (v2 data model)
 * GET /api/search?q=<query>&types=customers,orders,cases&limit=5&page=1
 *
 * Feature-flagged: endpoint always available to authorised merchants, but
 * only called by CommandPalette when FLAG_COMMAND_CENTER=true.
 *
 * Returns paginated, merchant-scoped results across the v2 read model:
 *   - customers → source_customers (email, name)
 *   - orders    → source_orders (order_number, email)
 *   - cases     → support_payout_cases (matched via their source order)
 *
 * Multi-tenancy: every query is scoped directly by merchant_id. No cross-merchant
 * data is returned. Input validated with Zod per program principle §9.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { formatCurrency } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

const SearchQuerySchema = z.object({
  q:     z.string().min(1).max(200),
  types: z.string().optional(), // comma-separated: customers,orders,cases
  limit: z.coerce.number().int().min(1).max(20).default(5),
  page:  z.coerce.number().int().min(1).default(1),
});

type ResultType = 'customer' | 'order' | 'case' | 'ticket' | 'shipment' | 'refund' | 'return' | 'dispute' | 'transaction' | 'loss' | 'recovery';

/**
 * Resolve payout-case hrefs for a set of related order or ticket ids so ticket /
 * shipment / transaction results deep-link to their case when one exists.
 */
async function caseHrefResolver(
  client: ReturnType<typeof createServiceClient>,
  merchantId: string,
  orderIds: string[],
  ticketIds: string[],
): Promise<{ byOrder: Map<string, string>; byTicket: Map<string, string> }> {
  const byOrder = new Map<string, string>();
  const byTicket = new Map<string, string>();
  if (orderIds.length === 0 && ticketIds.length === 0) return { byOrder, byTicket };
  const orFilters: string[] = [];
  if (orderIds.length) orFilters.push(`source_order_id.in.(${orderIds.join(',')})`);
  if (ticketIds.length) orFilters.push(`source_ticket_id.in.(${ticketIds.join(',')})`);
  const { data } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id, source_order_id, source_ticket_id')
    .eq('merchant_id', merchantId)
    .or(orFilters.join(','));
  for (const row of (data as Array<{ id: string; source_order_id: string | null; source_ticket_id: string | null }> ?? [])) {
    if (row.source_order_id && !byOrder.has(row.source_order_id)) byOrder.set(row.source_order_id, `/claims/${row.id}`);
    if (row.source_ticket_id && !byTicket.has(row.source_ticket_id)) byTicket.set(row.source_ticket_id, `/claims/${row.id}`);
  }
  return { byOrder, byTicket };
}

interface SearchResult {
  type: ResultType;
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  riskLevel?: string;
  /** Internal join hint (stripped from the response). */
  _orderId?: string;
}

/** Strip characters that would break a PostgREST `or(...)` ilike filter. */
function sanitizeIlike(value: string): string {
  return value.replace(/[%,()*]/g, ' ').trim();
}

function isUuid(value: string): boolean {
  return z.string().uuid().safeParse(value).success;
}

export async function GET(req: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(
    serviceClient,
    user.id,
    PERMISSIONS.VIEW_CUSTOMERS,
  );
  if (denied || !ctx?.merchantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const merchantId = ctx.merchantId;

  const parsed = SearchQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }

  const { q, limit, page } = parsed.data;
  // Accept the legacy 'evidence' type as an alias for 'cases'.
  const requested = parsed.data.types
    ? parsed.data.types.split(',').map((s) => s.trim()).map((t) => (t === 'evidence' ? 'cases' : t))
    : ['customers', 'orders', 'cases', 'tickets', 'shipments', 'refunds', 'returns', 'disputes', 'losses', 'recoveries'];

  const term = sanitizeIlike(q);
  if (!term) {
    return NextResponse.json({ results: [], query: q, page, limit, total: 0 });
  }
  const pattern = `%${term}%`;
  const offset = (page - 1) * limit;
  const results: SearchResult[] = [];

  // Each read is intentionally independent: one unavailable source projection
  // must not hide otherwise-authorised results from the other groups.
  if (requested.includes('customers')) {
    try {
      const { data: customers } = await serviceClient
        .from('source_customers')
        .select('id, merchant_customer_id, email, first_name, last_name')
        .eq('merchant_id', merchantId)
        .or(`email.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`)
        .limit(limit)
        .range(offset, offset + limit - 1);

      for (const c of (customers as Array<{ id: string; merchant_customer_id: string | null; email: string | null; first_name: string | null; last_name: string | null }> ?? [])) {
        const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
        results.push({
          type: 'customer',
          id: c.id,
          label: name || c.email || c.id,
          sublabel: name ? c.email ?? undefined : undefined,
          href: `/customers/${c.merchant_customer_id ?? c.id}`,
        });
      }
    } catch (error) {
      console.error('Search customers failed', error);
    }
  }

  // ── 2. Orders ── source_orders, merchant-scoped (also matches SKU / external id)
  const matchedOrderIds: string[] = [];
  if (requested.includes('orders') || requested.includes('cases')) {
    try {
      // SKU / product-ref matches resolve to their orders so a SKU search finds
      // the order (and, downstream, its case).
      const skuOrderIds: string[] = [];
      try {
        const { data: lines } = await serviceClient
          .from(TABLES.SOURCE_ORDER_LINES)
          .select('source_order_id')
          .eq('merchant_id', merchantId)
          .or(`sku.ilike.${pattern},product_ref.ilike.${pattern}`)
          .limit(limit);
        for (const l of (lines as Array<{ source_order_id: string | null }> ?? [])) {
          if (l.source_order_id) skuOrderIds.push(l.source_order_id);
        }
      } catch (error) { console.error('Search order lines failed', error); }

      const orderOr = [`order_number.ilike.${pattern}`, `email.ilike.${pattern}`, `external_id.ilike.${pattern}`];
      if (skuOrderIds.length > 0) orderOr.push(`id.in.(${skuOrderIds.join(',')})`);
      const { data: orders } = await serviceClient
        .from('source_orders')
        .select('id, order_number, email, total_price, currency, source_customer_id')
        .eq('merchant_id', merchantId)
        .or(orderOr.join(','))
        .limit(limit)
        .range(offset, offset + limit - 1);

      for (const o of (orders as Array<{ id: string; order_number: string | null; email: string | null; total_price: number | null; currency: string | null; source_customer_id: string | null }> ?? [])) {
        matchedOrderIds.push(o.id);
        if (requested.includes('orders')) {
          results.push({
            type: 'order',
            id: o.id,
            label: o.order_number ? `Order ${o.order_number}` : `Order ${o.id.slice(0, 8)}`,
            sublabel: o.total_price != null ? formatCurrency(o.total_price, o.currency ?? undefined) : o.email ?? undefined,
            href: `/orders/${o.id}`,
          });
        }
      }
    } catch (error) {
      console.error('Search orders failed', error);
    }
  }

  // ── 3. Payout cases ── support_payout_cases for matched orders or by id ─────
  if (requested.includes('cases')) {
    try {
      const orFilters: string[] = [];
      if (isUuid(q)) orFilters.push(`id.eq.${q}`);
      if (matchedOrderIds.length > 0) {
        orFilters.push(`source_order_id.in.(${matchedOrderIds.join(',')})`);
      }
      let caseQuery = serviceClient
        .from(TABLES.MERCHANT_CLAIMS)
        .select('id, claim_type, status, amount_at_risk, currency')
        .eq('merchant_id', merchantId)
        .limit(limit);
      if (orFilters.length > 0) caseQuery = caseQuery.or(orFilters.join(','));
      else if (!isUuid(q)) caseQuery = caseQuery.ilike('claim_type', pattern);
      const { data: cases } = await caseQuery.range(offset, offset + limit - 1);

      for (const c of (cases as Array<{ id: string; claim_type: string | null; status: string | null; amount_at_risk: number | null; currency: string | null }> ?? [])) {
        results.push({
          type: 'case',
          id: c.id,
          label: `Payout case · ${(c.claim_type ?? 'claim').replace(/_/g, ' ')}`,
          sublabel: c.amount_at_risk != null ? formatCurrency(c.amount_at_risk, c.currency ?? undefined) : c.status ?? undefined,
          href: `/claims/${c.id}`,
        });
      }
    } catch (error) {
      console.error('Search payout cases failed', error);
    }
  }

  // ── 4. Tickets ── source_tickets by external id / subject ───────────────────
  const matchedTicketIds: string[] = [];
  if (requested.includes('tickets')) {
    try {
      const ticketOr = isUuid(q) ? `id.eq.${q}` : `external_id.ilike.${pattern},subject.ilike.${pattern}`;
      const { data: tickets } = await serviceClient
        .from(TABLES.SOURCE_TICKETS)
        .select('id, external_id, subject, status, updated_at')
        .eq('merchant_id', merchantId)
        .or(ticketOr)
        .limit(limit)
        .range(offset, offset + limit - 1);
      for (const t of (tickets as Array<{ id: string; external_id: string | null; subject: string | null; status: string | null; updated_at: string | null }> ?? [])) {
        matchedTicketIds.push(t.id);
        results.push({
          type: 'ticket',
          id: t.id,
          label: `Ticket ${t.external_id ?? t.id.slice(0, 8)}`,
          sublabel: t.subject ?? t.status ?? undefined,
          href: `/tickets/${t.id}`,
        });
      }
    } catch (error) { console.error('Search tickets failed', error); }
  }

  // ── 5. Shipments ── source_shipments by tracking number ─────────────────────
  const shipmentOrderIds: string[] = [];
  if (requested.includes('shipments')) {
    try {
      const { data: shipments } = await serviceClient
        .from(TABLES.SOURCE_SHIPMENTS)
        .select('id, tracking_number, carrier, status, source_order_id, updated_at')
        .eq('merchant_id', merchantId)
        .or(isUuid(q) ? `id.eq.${q}` : `tracking_number.ilike.${pattern},external_id.ilike.${pattern}`)
        .limit(limit)
        .range(offset, offset + limit - 1);
      for (const s of (shipments as Array<{ id: string; tracking_number: string | null; carrier: string | null; status: string | null; source_order_id: string | null; updated_at: string | null }> ?? [])) {
        if (s.source_order_id) shipmentOrderIds.push(s.source_order_id);
        results.push({
          type: 'shipment',
          id: s.id,
          label: `Shipment ${s.tracking_number ?? s.id.slice(0, 8)}`,
          sublabel: [s.carrier, s.status].filter(Boolean).join(' · ') || undefined,
          href: `/shipments/${s.id}`,
          _orderId: s.source_order_id ?? undefined,
        });
      }
    } catch (error) { console.error('Search shipments failed', error); }
  }

  // ── 6. Transactions ── source_transactions by external / provider reference ─
  const txnOrderIds: string[] = [];
  if (requested.includes('transactions')) {
    try {
      const { data: txns } = await serviceClient
        .from(TABLES.SOURCE_TRANSACTIONS)
        .select('id, external_id, provider_reference, transaction_type, amount_minor, currency, source_order_id')
        .eq('merchant_id', merchantId)
        .or(isUuid(q) ? `id.eq.${q}` : `external_id.ilike.${pattern},provider_reference.ilike.${pattern}`)
        .limit(limit)
        .range(offset, offset + limit - 1);
      for (const t of (txns as Array<{ id: string; external_id: string | null; provider_reference: string | null; transaction_type: string | null; amount_minor: number | null; currency: string | null; source_order_id: string | null }> ?? [])) {
        if (t.source_order_id) txnOrderIds.push(t.source_order_id);
        results.push({
          type: 'transaction',
          id: t.id,
          label: `Transaction ${t.external_id ?? t.provider_reference ?? t.id.slice(0, 8)}`,
          sublabel: [t.transaction_type, t.amount_minor != null ? formatCurrency(t.amount_minor / 100, t.currency ?? undefined) : null].filter(Boolean).join(' · ') || undefined,
          href: '/claims',
          _orderId: t.source_order_id ?? undefined,
        });
      }
    } catch (error) { console.error('Search transactions failed', error); }
  }

  const objectSearch = [
    { requested: 'refunds', type: 'refund' as const, table: TABLES.SOURCE_REFUNDS, href: 'refunds', amount: true, select: 'id,external_id,amount,currency,ingested_at' },
    { requested: 'returns', type: 'return' as const, table: TABLES.SOURCE_RETURNS, href: 'returns', amount: false, select: 'id,external_id,status,updated_at' },
    { requested: 'disputes', type: 'dispute' as const, table: TABLES.SOURCE_DISPUTES, href: 'disputes', amount: true, select: 'id,external_id,status,amount,currency,ingested_at' },
  ];
  for (const object of objectSearch) {
    if (!requested.includes(object.requested)) continue;
    try {
      const { data } = await serviceClient.from(object.table).select(object.select).eq('merchant_id', merchantId)
        .or(isUuid(q) ? `id.eq.${q}` : `external_id.ilike.${pattern}`).limit(limit).range(offset, offset + limit - 1);
      for (const row of (data as Array<Record<string, any>> ?? [])) results.push({ type: object.type, id: row.id, label: `${object.type[0].toUpperCase()}${object.type.slice(1)} ${row.external_id}`, sublabel: object.amount && row.amount != null && row.currency ? formatCurrency(row.amount, row.currency) : row.status ?? undefined, href: `/${object.href}/${row.id}` });
    } catch (error) { console.error(`Search ${object.requested} failed`, error); }
  }

  if (requested.includes('losses') && isUuid(q)) {
    try {
      const { data } = await serviceClient.from(TABLES.LOSS_CASES).select('id,status,currency,realised_loss_minor').eq('merchant_id', merchantId).eq('id', q).limit(limit);
      for (const row of (data as Array<Record<string, any>> ?? [])) results.push({ type: 'loss', id: row.id, label: `Loss ${row.id.slice(0, 8)}`, sublabel: row.realised_loss_minor != null && row.currency ? formatCurrency(row.realised_loss_minor / 100, row.currency) : row.status, href: `/losses/${row.id}` });
    } catch (error) { console.error('Search losses failed', error); }
  }

  // Resolve case deep-links for ticket / shipment / transaction results.
  try {
    const { byOrder, byTicket } = await caseHrefResolver(
      serviceClient,
      merchantId,
      [...new Set([...shipmentOrderIds, ...txnOrderIds])],
      matchedTicketIds,
    );
    for (const r of results) {
      if (r.type === 'ticket' && byTicket.has(r.id)) r.href = byTicket.get(r.id)!;
      if ((r.type === 'shipment' || r.type === 'transaction') && r._orderId && byOrder.has(r._orderId)) {
        r.href = byOrder.get(r._orderId)!;
      }
    }
  } catch (error) { console.error('Search case-href resolution failed', error); }

  // ── 7. Recoveries ── recovery_cases by id or matched payout case ────────────
  if (requested.includes('recoveries')) {
    try {
      const caseIds = results.filter((r) => r.type === 'case').map((r) => r.id);
      const recOr: string[] = [];
      if (isUuid(q)) recOr.push(`id.eq.${q}`);
      if (caseIds.length > 0) recOr.push(`support_payout_case_id.in.(${caseIds.join(',')})`);
      if (recOr.length > 0) {
        const { data: recoveries } = await serviceClient
          .from(TABLES.RECOVERY_CASES)
          .select('id, recovery_type, owner_type, status, merchant_loss_amount, currency')
          .eq('merchant_id', merchantId)
          .or(recOr.join(','))
          .limit(limit)
          .range(offset, offset + limit - 1);
        for (const r of (recoveries as Array<{ id: string; recovery_type: string | null; owner_type: string | null; status: string | null; merchant_loss_amount: number | null; currency: string | null }> ?? [])) {
          results.push({
            type: 'recovery',
            id: r.id,
            label: `Recovery · ${(r.recovery_type ?? 'case').replace(/_/g, ' ')}`,
            sublabel: r.merchant_loss_amount != null ? formatCurrency(r.merchant_loss_amount, r.currency ?? undefined) : r.status ?? undefined,
            href: `/recoveries/${r.id}`,
          });
        }
      }
    } catch (error) { console.error('Search recoveries failed', error); }
  }

  // Strip internal join hints before returning.
  const publicResults = results.map(({ _orderId, ...rest }) => rest);

  return NextResponse.json({
    results: publicResults,
    query: q,
    page,
    limit,
    total: publicResults.length, // approximate — full count omitted to keep response fast
  });
}
