import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { withRequestLogging } from '@/lib/log';

async function PATCHHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.HIDE_JOB);
  if (denied) return denied;
  const scopedClient = createScopedClient(ctx.merchantId, serviceClient);

  const { error } = await scopedClient
    .from('processing_jobs')
    .update({ hidden_by_merchant: true } as any)
    .eq('id', resolvedParams.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAction({
    ctx,
    action: 'hide_job',
    resourceType: 'processing_job',
    resourceId: resolvedParams.id,
    ip,
  });

  return NextResponse.json({ ok: true });
}

export const PATCH = withRequestLogging('/api/jobs/[id]/hide', PATCHHandler);
