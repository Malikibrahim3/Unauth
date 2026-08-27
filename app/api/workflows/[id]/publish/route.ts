import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const { id } = await params;
  const draft = (await service.from(TABLES.WORKFLOW_DEFINITIONS).select('*').eq('merchant_id', ctx.merchantId).eq('id', id).eq('status', 'draft').maybeSingle()).data;
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  return NextResponse.json(
    {
      error: 'workflow_publication_unavailable',
      message: 'Pilot flow publication is unavailable until dispatcher idempotency, replay, audit, and failure recovery are independently proved.',
    },
    { status: 503 },
  );
}
