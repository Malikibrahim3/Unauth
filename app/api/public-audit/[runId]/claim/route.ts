import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient, createServiceClient } from '@/lib/supabase/server';

interface ClaimBody {
  storeName?: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const body = (await request.json().catch(() => ({}))) as ClaimBody;
  const storeName = (body.storeName ?? '').trim();

  const supabase = createClient();
  const service = createServiceClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: publicAudit } = await service
    .from('public_audits' as any)
    .select('id, submitted_email, processing_job_id')
    .eq('id', runId)
    .maybeSingle();
  if (!publicAudit) {
    return NextResponse.json({ error: 'Audit not found.' }, { status: 404 });
  }

  const audit = publicAudit as { id: string; submitted_email: string; processing_job_id: string | null };
  if (audit.submitted_email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: 'This audit belongs to a different email address.' }, { status: 403 });
  }

  let merchantId: string;
  const { data: merchant } = await service
    .from('merchants')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (merchant) {
    merchantId = (merchant as { id: string }).id;
    if (storeName) {
      await service
        .from('merchants')
        .update({ name: storeName, setup_complete: true } as any)
        .eq('id', merchantId);
    }
  } else {
    const created = await service
      .from('merchants')
      .insert({
        user_id: user.id,
        name: storeName || 'My Store',
        setup_complete: true,
      } as any)
      .select('id')
      .single();

    if (!created.data) {
      return NextResponse.json({ error: created.error?.message ?? 'Could not create merchant account.' }, { status: 500 });
    }
    merchantId = (created.data as { id: string }).id;
  }

  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata ?? {}),
      setup_complete: true,
      store_name: storeName || user.user_metadata?.store_name || null,
    },
  });

  await service
    .from('public_audits' as any)
    .update({
      linked_user_id: user.id,
      linked_merchant_id: merchantId,
      status: 'claimed',
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', audit.id);

  if (audit.processing_job_id) {
    await service
      .from('processing_jobs')
      .update({ merchant_id: merchantId } as any)
      .eq('id', audit.processing_job_id);
  }

  return NextResponse.json({ ok: true });
}
