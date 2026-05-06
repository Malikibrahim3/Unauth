import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { writeActivityLog } from '@/lib/customers/activityLog';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.DELETE_CUSTOMER_NOTE);
  if (denied) return denied;

  // Fetch the note before deleting so we have profile_id for activity log
  const { data: noteRow } = await serviceClient
    .from('customer_notes')
    .select('id, customer_profile_id')
    .eq('id', resolvedParams.id)
    .eq('merchant_id', ctx.merchantId)
    .maybeSingle();

  const { error } = await serviceClient
    .from('customer_notes')
    .update({ deleted_by_merchant: true } as any)
    .eq('id', resolvedParams.id)
    .eq('merchant_id', ctx.merchantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAction({
    ctx,
    action: 'delete_customer_note',
    resourceType: 'customer_note',
    resourceId: resolvedParams.id,
    ip,
  });

  if (noteRow?.customer_profile_id) {
    await writeActivityLog({
      supabase: serviceClient,
      profileId: noteRow.customer_profile_id,
      merchantId: ctx.merchantId,
      eventType: 'note_deleted',
    });
  }

  return NextResponse.json({ ok: true });
}
