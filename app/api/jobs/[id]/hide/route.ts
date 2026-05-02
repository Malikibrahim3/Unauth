import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // Scope to the merchant's own processing_jobs via the merchants → processing_jobs relationship
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!merchant) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });

  const { error } = await supabase
    .from('processing_jobs')
    .update({ hidden_by_merchant: true } as any)
    .eq('id', params.id)
    .eq('merchant_id', merchant.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
