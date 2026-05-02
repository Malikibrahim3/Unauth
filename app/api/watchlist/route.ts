import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('watchlist_entries')
    .select('*')
    .eq('merchant_id', user.id)
    .order('added_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { customerProfileId, emailHash, displayName, displayEmail, lastSeenRisk } = body;

  const { data, error } = await supabase
    .from('watchlist_entries')
    .upsert({
      merchant_id: user.id,
      customer_profile_id: customerProfileId ?? null,
      email_hash: emailHash ?? null,
      display_name: displayName ?? null,
      display_email: displayEmail ?? null,
      last_seen_risk: lastSeenRisk ?? null,
    }, { onConflict: 'merchant_id,customer_profile_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}
