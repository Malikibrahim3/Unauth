import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { withRequestLogging } from '@/lib/log';
import { findCustomerProfileIdsByText } from '@/lib/customers/profileSearch';
import { enforceEntitlement } from '@/lib/product/requireEntitlement';

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
 * Candidate profile IDs are resolved ONLY through findCustomerProfileIdsByText,
 * which scopes by customer_profile_identities.merchant_id. Display rows are then
 * fetched by those already-owned IDs. `identities` is a network-level table with
 * no merchant_id column, so it is NEVER scanned unscoped here (doing so leaked
 * cross-tenant profiles when the scoped-client proxy silently no-op'd on it).
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

  const gated = await enforceEntitlement(serviceClient, ctx.merchantId, 'CUSTOMER_SEARCH');
  if (gated) return gated;

  // ── Input validation ──────────────────────────────────────────────────────
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '5', 10), 20);

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // ── Merchant-scoped candidate resolution ────────────────────────────────────
  // The ONLY source of candidate IDs is the merchant-scoped anchor index. This
  // guarantees every returned profile is visible to the caller's merchant.
  const merchantFilter = `merchant_ids.cs.${JSON.stringify([ctx.merchantId])}`;
  const ownedProfileIds = await findCustomerProfileIdsByText(serviceClient, {
    merchantIds: [ctx.merchantId],
    merchantFilter,
    query: q,
    limit: 100,
  });

  if (ownedProfileIds.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // Fetch display fields ONLY for IDs already proven to belong to this merchant.
  const { data } = await serviceClient
    .from(TABLES.CUSTOMER_PROFILES)
    .select('id, names, primary_email, risk_level')
    .in('id', ownedProfileIds)
    .order('risk_score', { ascending: false })
    .limit(limit) as unknown as { data: CustomerSearchRow[] | null };

  const results = (data ?? []).map((r) => ({
    id: r.id,
    name: r.names?.[0] ?? r.primary_email ?? 'Unknown',
    email: r.primary_email,
    risk_level: r.risk_level ?? 'low',
  }));

  return NextResponse.json({ results });
}

export const GET = withRequestLogging('/api/customers/search', GETHandler);
