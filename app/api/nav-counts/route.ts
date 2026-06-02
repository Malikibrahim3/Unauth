import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { resolveCallerContext } from '@/lib/permissions';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const ctx = await resolveCallerContext(serviceClient, user.id);
  if (!ctx) {
    return NextResponse.json({ watchlistCount: 0, claimsCount: 0 });
  }

  const [watchlistResult, claimsResult] = await Promise.all([
    serviceClient
      .from('watchlist_entries' as never)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id' as never, ctx.merchantId as never),
    serviceClient
      .from('merchant_claims' as never)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id' as never, ctx.merchantId as never)
      .in('status' as never, ['open', 'under_review', 'pending_evidence'] as never),
  ]);

  return NextResponse.json({
    watchlistCount: watchlistResult.count ?? 0,
    claimsCount: claimsResult.count ?? 0,
  });
}
