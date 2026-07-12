import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { createScopedClient } from '@/lib/supabase/scoped';
import { TABLES } from '@/lib/supabase/tables';

export const dynamic = 'force-dynamic';

/** Import job status (merchant-scoped). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const scoped = createScopedClient(ctx.merchantId, serviceClient);
  const { data, error } = await scoped
    .from(TABLES.PROCESSING_JOBS)
    .select('id, job_kind, status, label, total_rows, processed_rows, failed_rows, created_at, completed_at')
    .eq('id', jobId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(data);
}
