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

type ResultType = 'customer' | 'order' | 'case' | 'recovery';

interface SearchResult {
  type: ResultType;
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  riskLevel?: string;
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
    : ['customers', 'orders', 'cases'];

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
        .select('id, email, first_name, last_name')
        .eq('merchant_id', merchantId)
        .or(`email.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`)
        .limit(limit)
        .range(offset, offset + limit - 1);

      for (const c of (customers as Array<{ id: string; email: string | null; first_name: string | null; last_name: string | null }> ?? [])) {
        const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
        results.push({
          type: 'customer',
          id: c.id,
          label: name || c.email || c.id,
          sublabel: name ? c.email ?? undefined : undefined,
          href: `/customers/${c.id}`,
        });
      }
    } catch (error) {
      console.error('Search customers failed', error);
    }
  }

  // ── 2. Orders ── source_orders, merchant-scoped ────────────────────────────
  const matchedOrderIds: string[] = [];
  if (requested.includes('orders') || requested.includes('cases')) {
    try {
      const { data: orders } = await serviceClient
        .from('source_orders')
        .select('id, order_number, email, total_price, currency, source_customer_id')
        .eq('merchant_id', merchantId)
        .or(`order_number.ilike.${pattern},email.ilike.${pattern}`)
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
            href: o.source_customer_id ? `/customers/${o.source_customer_id}` : '/claims',
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

  return NextResponse.json({
    results,
    query: q,
    page,
    limit,
    total: results.length, // approximate — full count omitted to keep response fast
  });
}
