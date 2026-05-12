/**
 * Phase E-5 — Analyst Command Center: Unified Search Endpoint
 * GET /api/search?q=<query>&types=customers,orders,evidence&limit=5&page=1
 *
 * Feature-flagged: endpoint always available to authorised merchants, but
 * only called by CommandPalette when FLAG_COMMAND_CENTER=true.
 *
 * Returns paginated, merchant-scoped results across:
 *   - customers    → customer_profiles (name, email)
 *   - orders       → audit_transactions (order_id)
 *   - evidence     → evidence_packages (customer name, order_id)
 *
 * Multi-tenancy: all queries scope through processing_jobs.merchant_id.
 * Input validated with Zod per program principle §9.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const SearchQuerySchema = z.object({
  q:     z.string().min(1).max(200),
  types: z.string().optional(), // comma-separated: customers,orders,evidence
  limit: z.coerce.number().int().min(1).max(20).default(5),
  page:  z.coerce.number().int().min(1).default(1),
});

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

type ResultType = 'customer' | 'order' | 'evidence';

interface SearchResult {
  type: ResultType;
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  riskLevel?: string;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

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

  const parsed = SearchQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }

  const { q, limit, page } = parsed.data;
  const types = parsed.data.types
    ? parsed.data.types.split(',').map((s) => s.trim())
    : ['customers', 'orders', 'evidence'];

  const offset = (page - 1) * limit;
  const results: SearchResult[] = [];

  // Resolve merchant job IDs once — used for transaction/evidence scoping
  let merchantJobIds: string[] = [];
  try {
    const { data: jobs } = await serviceClient
      .from('processing_jobs')
      .select('id')
      .eq('merchant_id', ctx.merchantId)
      .limit(500);
    merchantJobIds = (jobs ?? []).map((j: { id: string }) => j.id);
  } catch {
    // fall through — scoped results will be empty
  }

  // ── 1. Customers ──────────────────────────────────────────────────────────
  if (types.includes('customers')) {
    try {
      const { data: customers } = await serviceClient
        .from('customer_profiles' as any)
        .select('id, name, email, risk_level')
        .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
        .in(
          'id',
          merchantJobIds.length > 0
            ? (
                await serviceClient
                  .from('transactions' as any)
                  .select('customer_profile_id')
                  .in('processing_job_id', merchantJobIds.slice(0, 100))
                  .not('customer_profile_id', 'is', null)
                  .limit(500)
              ).data?.map((r: { customer_profile_id: string }) => r.customer_profile_id).filter(Boolean) ?? []
            : [],
        )
        .limit(limit)
        .range(offset, offset + limit - 1);

      for (const c of (customers as Array<{ id: string; name: string | null; email: string | null; risk_level: string | null }> ?? [])) {
        results.push({
          type: 'customer',
          id: c.id,
          label: c.name ?? c.email ?? c.id,
          sublabel: c.name ? c.email ?? undefined : undefined,
          href: `/customers/${c.id}`,
          riskLevel: c.risk_level ?? undefined,
        });
      }
    } catch { /* non-fatal */ }
  }

  // ── 2. Orders ─────────────────────────────────────────────────────────────
  if (types.includes('orders') && merchantJobIds.length > 0) {
    try {
      const { data: orders } = await serviceClient
        .from('audit_transactions' as any)
        .select('id, order_id, order_value, risk_level')
        .ilike('order_id', `%${q}%`)
        .in('job_id', merchantJobIds.slice(0, 100))
        .limit(limit)
        .range(offset, offset + limit - 1);

      for (const o of (orders as Array<{ id: string; order_id: string; order_value: number | null; risk_level: string | null }> ?? [])) {
        results.push({
          type: 'order',
          id: o.id,
          label: `Order ${o.order_id}`,
          sublabel: o.order_value
            ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(o.order_value)
            : undefined,
          href: `/inbox`,
          riskLevel: o.risk_level ?? undefined,
        });
      }
    } catch { /* non-fatal */ }
  }

  // ── 3. Evidence packages ──────────────────────────────────────────────────
  if (types.includes('evidence') && merchantJobIds.length > 0) {
    try {
      const { data: evidence } = await serviceClient
        .from('evidence_packages' as any)
        .select('id, customer_name, order_id, ce3_eligible')
        .or(`customer_name.ilike.%${q}%,order_id.ilike.%${q}%`)
        .in('job_id', merchantJobIds.slice(0, 100))
        .limit(limit)
        .range(offset, offset + limit - 1);

      for (const e of (evidence as Array<{ id: string; customer_name: string | null; order_id: string | null; ce3_eligible: boolean }> ?? [])) {
        results.push({
          type: 'evidence',
          id: e.id,
          label: e.customer_name ?? `Evidence ${e.id.slice(0, 8)}`,
          sublabel: e.ce3_eligible ? 'CE3.0 eligible' : undefined,
          href: `/chargebacks`,
        });
      }
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({
    results,
    query: q,
    page,
    limit,
    total: results.length, // approximate — full count omitted to keep response fast
  });
}
