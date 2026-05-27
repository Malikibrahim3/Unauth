import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { buildClaimOpsMetrics } from '@/lib/claims/reporting';

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_DASHBOARD);
  if (denied) return denied;

  const range = request.nextUrl.searchParams.get('range') ?? '30d';
  const cutoff = range === 'all'
    ? null
    : new Date(Date.now() - (range === '7d' ? 7 : range === '90d' ? 90 : 30) * 86400000).toISOString();

  let claimsQuery = serviceClient
    .from('merchant_claims' as any)
    .select('id,status,amount_at_risk,submitted_at,created_at,updated_at')
    .eq('merchant_id', ctx.merchantId);
  if (cutoff) claimsQuery = claimsQuery.gte('submitted_at', cutoff);
  const { data: claims } = await claimsQuery;
  const claimRows = claims ?? [];
  const { data: outcomes } = claimRows.length > 0
    ? await serviceClient
      .from('merchant_case_outcomes' as any)
      .select('claim_id,decision,outcome,amount_refunded,decided_at,created_at,updated_at')
      .in('claim_id', claimRows.map((claim: any) => claim.id))
    : { data: [] };

  const metrics = buildClaimOpsMetrics(claimRows, outcomes ?? []);
  const rows = Object.entries(metrics).map(([metric, value]) => [metric, value]);
  const csv = [['metric', 'value'], ...rows].map((row) => row.map(csvCell).join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="claims-operations-${range}.csv"`,
    },
  });
}
