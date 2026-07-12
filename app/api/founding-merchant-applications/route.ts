import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { resolveCallerContext } from '@/lib/permissions';
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
  const postPurchaseLossProblem =
    typeof body?.postPurchaseLossProblem === 'string'
      ? body.postPurchaseLossProblem.trim()
      : typeof body?.fraudProblem === 'string'
        ? body.fraudProblem.trim()
        : '';
  const agreedToTerms = body?.agreedToTerms === true;

  if (!storeName || !monthlyOrderVolume || !postPurchaseLossProblem || !agreedToTerms) {
    return NextResponse.json({ error: 'Missing required application fields.' }, { status: 400 });
  }

  // v2 tenancy: the merchants.user_id column was dropped at cutover. Resolve the
  // caller's merchant server-side from active membership instead.
  const ctx = await resolveCallerContext(serviceClient, user.id);
  if (!ctx) {
    return NextResponse.json({ error: 'Merchant account not found.' }, { status: 404 });
  }
  const merchantId = ctx.merchantId;

  const { data: completedAudit } = await serviceClient
    .from(TABLES.PROCESSING_JOBS)
    .select('id')
    .eq('merchant_id', merchantId)
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
      merchant_id: merchantId,
      created_by_user_id: user.id,
      store_name: storeName,
      monthly_order_volume: monthlyOrderVolume,
      monthly_refund_chargeback_volume: monthlyRefundChargebackVolume,
      fraud_problem: postPurchaseLossProblem,
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
    fraudProblem: postPurchaseLossProblem,
    applicantEmail: user.email ?? 'Unknown',
  });

  const emailResult = await sendEmail({
    to: 'hello@unauth.co',
    subject: `Founding merchant application — ${storeName}`,
    html: notification.html,
    text: notification.text,
    replyTo: user.email ?? 'hello@unauth.co',
  });

  if (emailResult.ok) {
    await serviceClient
      .from('founding_merchant_applications' as any)
      .update({ internal_notified_at: new Date().toISOString() } as never)
      .eq('id', (application as { id: string }).id);
  }

  return NextResponse.json({ ok: true });
}
