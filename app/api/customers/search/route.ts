import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/customers/search?q=<query>&limit=<n>
 * Returns matching customer profiles for the command palette.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '5', 10), 20);

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createServiceClient();
  const like = `%${q}%`;

  // Search by name array text, primary_email, or emails array
  const { data, error } = await supabase
    .from('customer_profiles')
    .select('id, names, primary_email, risk_level')
    .or(`primary_email.ilike.${like},names.cs.{${q}}`)
    .order('risk_score', { ascending: false })
    .limit(limit);

  if (error) {
    // Fallback: text search on primary_email only
    const { data: fallback } = await supabase
      .from('customer_profiles')
      .select('id, names, primary_email, risk_level')
      .ilike('primary_email', like)
      .order('risk_score', { ascending: false })
      .limit(limit);

    const results = (fallback ?? []).map((r: any) => ({
      id: r.id,
      name: r.names?.[0] ?? r.primary_email ?? 'Unknown',
      email: r.primary_email,
      risk_level: r.risk_level ?? 'low',
    }));
    return NextResponse.json({ results });
  }

  const results = (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.names?.[0] ?? r.primary_email ?? 'Unknown',
    email: r.primary_email,
    risk_level: r.risk_level ?? 'low',
  }));

  return NextResponse.json({ results });
}
