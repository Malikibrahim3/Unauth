import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { buildFoundingMerchantApplicationNotification } from '@/lib/email/templates';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const storeName = typeof body?.storeName === 'string' ? body.storeName.trim() : '';
  const monthlyOrderVolume = typeof body?.monthlyOrderVolume === 'string' ? body.monthlyOrderVolume.trim() : '';
  const monthlyRefundChargebackVolume =
    typeof body?.monthlyRefundChargebackVolume === 'string' && body.monthlyRefundChargebackVolume.trim()
      ? body.monthlyRefundChargebackVolume.trim()
      : null;
  const fraudProblem = typeof body?.fraudProblem === 'string' ? body.fraudProblem.trim() : '';
  const agreedToTerms = body?.agreedToTerms === true;

  if (!storeName || !monthlyOrderVolume || !fraudProblem || !agreedToTerms) {
    return NextResponse.json({ error: 'Missing required application fields.' }, { status: 400 });
  }

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!merchant) {
    return NextResponse.json({ error: 'Merchant account not found.' }, { status: 404 });
  }

  const { data: completedAudit } = await serviceClient
    .from('processing_jobs')
    .select('id')
    .eq('merchant_id', (merchant as { id: string }).id)
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle();

  if (!completedAudit) {
    return NextResponse.json({ error: 'Network applications unlock after a completed siloed audit.' }, { status: 403 });
  }

  const timestamp = new Date().toISOString();

  const { data: application, error: insertError } = await serviceClient
    .from('founding_merchant_applications' as any)
    .upsert({
      merchant_id: (merchant as { id: string }).id,
      created_by_user_id: user.id,
      store_name: storeName,
      monthly_order_volume: monthlyOrderVolume,
      monthly_refund_chargeback_volume: monthlyRefundChargebackVolume,
      fraud_problem: fraudProblem,
      agreed_to_terms_at: timestamp,
      updated_at: timestamp,
    } as never, { onConflict: 'merchant_id' })
    .select('id')
    .single();

  if (insertError || !application) {
    return NextResponse.json({ error: insertError?.message ?? 'Failed to save application.' }, { status: 500 });
  }

  const notification = buildFoundingMerchantApplicationNotification({
    storeName,
    monthlyOrderVolume,
    monthlyRefundChargebackVolume,
    fraudProblem,
    applicantEmail: user.email ?? 'Unknown',
  });

  const emailResult = await sendEmail({
    to: 'hello@unauth.app',
    subject: `Founding merchant application — ${storeName}`,
    html: notification.html,
    text: notification.text,
    replyTo: user.email ?? 'hello@unauth.app',
  });

  if (emailResult.ok) {
    await serviceClient
      .from('founding_merchant_applications' as any)
      .update({ internal_notified_at: new Date().toISOString() } as never)
      .eq('id', (application as { id: string }).id);
  }

  return NextResponse.json({ ok: true });
}
