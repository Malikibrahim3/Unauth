import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';

const schema = z.object({ action: z.enum(['pause', 'resume']) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied || !ctx) return denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Pause or resume action required' }, { status: 400 });
  if (parsed.data.action === 'resume') {
    return NextResponse.json(
      {
        error: 'workflow_activation_unavailable',
        message: 'Pilot flow activation is unavailable until dispatcher idempotency, replay, audit, and failure recovery are independently proved.',
      },
      { status: 503 },
    );
  }
  const { id } = await params;
  const { data, error } = await service.from(TABLES.WORKFLOW_DEFINITIONS).update({
    active: false,
    updated_by: user.id,
  }).eq('merchant_id', ctx.merchantId).eq('id', id).eq('status', 'published').select('id,active,status,version').maybeSingle();
  if (error) return NextResponse.json({ error: 'Flow state update failed' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Published flow not found' }, { status: 404 });
  return NextResponse.json({ workflow: data, notice: 'Future events will not start this historical flow.' });
}
