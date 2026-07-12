import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { connectorActionSchema } from '@/lib/connectors/actions/validate';
import { executeConnectorAction } from '@/lib/connectors/actions/execute';

export async function POST(request: Request) {
  const userClient = createClient(); const { data: { user } } = await userClient.auth.getUser(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const client = createServiceClient(); const { denied, ctx } = await requirePermission(client, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS); if (denied || !ctx) return denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = connectorActionSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: 'Invalid connector action', details: parsed.error.flatten() }, { status: 400 });
  try { return NextResponse.json({ actionRun: await executeConnectorAction(client, ctx.merchantId, user.id, parsed.data) }); }
  catch (error) { if (error instanceof Error && error.message === 'connector_action_high_risk_forbidden') return NextResponse.json({ error: 'High-risk connector actions are unavailable' }, { status: 400 }); throw error; }
}
