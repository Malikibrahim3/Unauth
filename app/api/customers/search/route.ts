import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { escapePostgrestFilterValue } from '@/lib/supabase/merchantHelpers';
import { withRequestLogging } from '@/lib/log';

export const dynamic = 'force-dynamic';

/** Shape of a customer_profiles row selected by this route. */
type CustomerSearchRow = {
  id: string;
  names: string[] | null;
  primary_email: string | null;
  risk_level: string | null;
};

/**
 * GET /api/customers/search?q=<query>&limit=<n>
 * Returns matching customer profiles for the command palette.
 *
 * SECURITY: requires authenticated user with VIEW_CUSTOMERS permission.
 * Results are scoped to the caller's merchantId via merchant_ids array membership.
 * No unauthenticated access, no cross-merchant profile exposure.
 */
async function GETHandler(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const userClient = createClient();
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) return denied;
  const scopedClient = createScopedClient(ctx.merchantId, serviceClient);

  // ── Input validation ──────────────────────────────────────────────────────
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '5', 10), 20);

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Escape user input to prevent PostgREST filter injection via special chars.
  const safeQ = escapePostgrestFilterValue(q);
  const safeLike = `%${safeQ}%`;
  const qLower = q.toLowerCase();

  // ── Merchant-scoped search ─────────────────────────────────────────────────
  // SECURITY: Always constrain to caller's merchantId via merchant_ids array.
  // Use separate typed query methods instead of composing a raw .or() string
  // to eliminate PostgREST filter-string injection.
  //
  const emailRes = await (scopedClient
    .from('customer_profiles')
    .select('id, names, primary_email, risk_level')
    .contains('merchant_ids', [ctx.merchantId])
    .ilike('primary_email', safeLike)
    .order('risk_score', { ascending: false })
    .limit(limit) as unknown as Promise<{
      data: CustomerSearchRow[] | null;
      error: { message: string } | null;
    }>);

  // Merge and deduplicate by id
  const seen = new Set<string>();
  const merged: CustomerSearchRow[] = [];
  for (const row of emailRes.data ?? []) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      merged.push(row);
    }
  }

  // Application-side partial name match — safe: q is never interpolated into
  // a PostgREST filter string. We scan recency pages until we have enough
  // distinct matches or hit a documented hard cap.
  const PAGE = 500;
  const MAX_SCAN = 5000;
  let scanned = 0;
  let namePoolError: { message: string } | null = null;
  for (let offset = 0; scanned < MAX_SCAN && merged.length < limit; offset += PAGE) {
    const { data, error } = await (scopedClient
      .from('customer_profiles')
      .select('id, names, primary_email, risk_level')
      .contains('merchant_ids', [ctx.merchantId])
      .order('last_seen', { ascending: false })
      .range(offset, offset + PAGE - 1) as unknown as Promise<{
      data: CustomerSearchRow[] | null;
      error: { message: string } | null;
    }>);

    if (error) {
      namePoolError = error;
      break;
    }

    const page = data ?? [];
    scanned += page.length;
    for (const row of page) {
      if (seen.has(row.id)) continue;
      const matchesName = row.names?.some((name) =>
        name.toLowerCase().includes(qLower)
      );
      if (!matchesName) continue;
      seen.add(row.id);
      merged.push(row);
      if (merged.length >= limit) break;
    }

    if (page.length < PAGE) break;
  }

  if (emailRes.error && namePoolError) {
    // Double fallback: email ilike only, already escaped above
    const { data: fallback } = await scopedClient
      .from('customer_profiles')
      .select('id, names, primary_email, risk_level')
      .contains('merchant_ids', [ctx.merchantId])
      .ilike('primary_email', safeLike)
      .order('risk_score', { ascending: false })
      .limit(limit) as unknown as { data: CustomerSearchRow[] | null };

    const results = (fallback ?? []).map((r: CustomerSearchRow) => ({
      id: r.id,
      name: r.names?.[0] ?? r.primary_email ?? 'Unknown',
      email: r.primary_email,
      risk_level: r.risk_level ?? 'low',
    }));
    return NextResponse.json({ results });
  }

  const results = merged.slice(0, limit).map((r) => ({
    id: r.id,
    name: r.names?.[0] ?? r.primary_email ?? 'Unknown',
    email: r.primary_email,
    risk_level: r.risk_level ?? 'low',
  }));

  return NextResponse.json({ results });
}

export const GET = withRequestLogging('/api/customers/search', GETHandler);
