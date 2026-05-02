import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // Confirm the transaction belongs to a job owned by this merchant before updating
  const { data: tx } = await supabase
    .from('audit_transactions')
    .select('id, job_id')
    .eq('id', params.id)
    .single();

  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Verify job ownership
  const { data: job } = await supabase
    .from('processing_jobs')
    .select('merchant_id')
    .eq('id', tx.job_id)
    .single();

  if (!job || job.merchant_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('audit_transactions')
    .update({ dismissed_by_merchant: true } as any)
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
