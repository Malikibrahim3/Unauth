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
  identity_id: string;
  display_name: string | null;
  email: string | null;
};

/**
 * GET /api/customers/search?q=<query>&limit=<n>
 * Returns matching customer profiles for the command palette.
 *
 * SECURITY: requires authenticated user with VIEW_CUSTOMERS permission.
 * Candidate identity IDs and display fields both come from merchant_customers.
 * `identities` is network-level and deliberately has no names or emails.
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

  // Fetch display fields from the same merchant-owned source of truth.
  const { data, error } = await serviceClient
    .from(TABLES.MERCHANT_CUSTOMERS)
    .select('identity_id, display_name, email')
    .eq('merchant_id', ctx.merchantId)
    .in('identity_id', ownedProfileIds)
    .order('updated_at', { ascending: false })
    .limit(limit) as unknown as {
      data: CustomerSearchRow[] | null;
      error: { message: string } | null;
    };

  if (error) {
    return NextResponse.json({ error: 'Customer search failed' }, { status: 500 });
  }

  const seen = new Set<string>();
  const results = (data ?? []).flatMap((r) => {
    if (!r.identity_id || seen.has(r.identity_id)) return [];
    seen.add(r.identity_id);
    return [{
      id: r.identity_id,
      name: r.display_name ?? r.email ?? 'Unknown customer',
      email: r.email,
      risk_level: '',
    }];
  });

  return NextResponse.json({ results });
}

export const GET = withRequestLogging('/api/customers/search', GETHandler);
