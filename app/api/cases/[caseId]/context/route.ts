import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { getCaseReadModel } from '@/lib/cases/readModel';

export const dynamic = 'force-dynamic';

/** Compact, side-effect-free read model shared by every case-context drawer. */
export async function GET(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied || !ctx) return denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { caseId } = await params;
  const model = await getCaseReadModel(serviceClient, ctx.merchantId, caseId);
  if (!model) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  return NextResponse.json(model);
}
