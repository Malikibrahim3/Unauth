import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('customer_notes')
    .select('*')
    .eq('merchant_id', user.id)
    .eq('customer_profile_id', params.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: 'Note body is required' }, { status: 400 });
  if (body.length > 2000) return NextResponse.json({ error: 'Note must be 2000 characters or fewer' }, { status: 400 });

  const { data, error } = await supabase
    .from('customer_notes')
    .insert({ merchant_id: user.id, customer_profile_id: params.id, body })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}
