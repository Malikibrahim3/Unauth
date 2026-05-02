import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await service
    .from('lookup_daily_counts' as any)
    .select('count')
    .eq('merchant_id', user.id)
    .eq('lookup_date', today)
    .single();

  const used = (data as { count?: number } | null)?.count ?? 0;
  return NextResponse.json({ used, limit: 200 });
}
