import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { getAutomationMetrics } from '@/lib/reconciliation/metrics';

export const dynamic = 'force-dynamic';
export async function GET() {
  const userClient = createClient(); const { data: { user } } = await userClient.auth.getUser(); if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const serviceClient = createServiceClient(); const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX); if (denied || !ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ metrics: await getAutomationMetrics(serviceClient, ctx.merchantId) });
}
